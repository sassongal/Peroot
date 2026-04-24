import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRedis, handleError, truncate } from "../clients.js";

const CONTEXT_KEY_PREFIX = "context:block:";

export function registerContextTools(server: McpServer): void {
  // ─── Get cached context block ────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_cached_context",
    {
      title: "Get Cached Context Block",
      description: "Fetch a cached context block from Redis by its SHA-256 hash. Context blocks are the enriched representations of files, URLs, and images attached by users.",
      inputSchema: z.object({
        sha256: z.string().regex(/^[0-9a-f]{64}$/).describe("SHA-256 hash of the original content"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ sha256 }) => {
      try {
        const redis = getRedis();
        const key = `${CONTEXT_KEY_PREFIX}${sha256}`;
        const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
        if (raw === null) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ sha256, found: false }, null, 2) }] };
        }
        const block = typeof raw === "string" ? JSON.parse(raw) : raw;
        return {
          content: [{
            type: "text" as const,
            text: truncate(JSON.stringify({ sha256, found: true, ttl_seconds: ttl, block }, null, 2)),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── List context cache entries ──────────────────────────────────────────────
  server.registerTool(
    "peroot_list_context_cache",
    {
      title: "List Context Cache Entries",
      description: "List Redis keys for cached context blocks. Returns up to 50 keys with their TTLs. Useful for understanding what's in the context cache.",
      inputSchema: z.object({
        count: z.number().int().min(1).max(50).default(20),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ count }) => {
      try {
        const redis = getRedis();
        const keys = await redis.keys(`${CONTEXT_KEY_PREFIX}*`);
        const limited = keys.slice(0, count);
        const ttls = await Promise.all(limited.map(k => redis.ttl(k)));
        const entries = limited.map((k, i) => ({
          key: k,
          sha256: k.replace(CONTEXT_KEY_PREFIX, ""),
          ttl_seconds: ttls[i],
        }));
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ total_keys: keys.length, returned: entries.length, entries }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Invalidate context block ────────────────────────────────────────────────
  server.registerTool(
    "peroot_invalidate_context_block",
    {
      title: "Invalidate Context Cache Block",
      description: "Delete a specific context block from Redis by SHA-256 hash, forcing re-extraction on next use. Use when content has changed or enrichment was faulty.",
      inputSchema: z.object({
        sha256: z.string().regex(/^[0-9a-f]{64}$/).describe("SHA-256 hash of the block to invalidate"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ sha256 }) => {
      try {
        const redis = getRedis();
        const key = `${CONTEXT_KEY_PREFIX}${sha256}`;
        const deleted = await redis.del(key);
        return { content: [{ type: "text" as const, text: JSON.stringify({ sha256, key, deleted: deleted > 0 }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Clear all context cache ─────────────────────────────────────────────────
  server.registerTool(
    "peroot_clear_context_cache",
    {
      title: "Clear All Context Cache",
      description: "Delete all cached context blocks from Redis. Use only when a prompt or enrichment bug has poisoned the cache. This forces re-processing for all users.",
      inputSchema: z.object({
        confirm: z.literal("CONFIRM_CLEAR").describe("Must be 'CONFIRM_CLEAR' to prevent accidental deletion"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ confirm: _ }) => {
      try {
        const redis = getRedis();
        const keys = await redis.keys(`${CONTEXT_KEY_PREFIX}*`);
        if (keys.length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: 0, message: "Cache already empty" }, null, 2) }] };
        }
        await Promise.all(keys.map(k => redis.del(k)));
        return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: keys.length, message: "Context cache cleared" }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
