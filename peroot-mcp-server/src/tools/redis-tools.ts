import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRedis, handleError } from "../clients.js";

export function registerRedisTools(server: McpServer): void {
  // ─── Get Redis key ───────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_redis_get",
    {
      title: "Redis Get Key",
      description: "Fetch the raw value of a Redis key. Useful for inspecting rate limit counters, cache entries, circuit breaker state, etc.",
      inputSchema: z.object({
        key: z.string().min(1).max(512).describe("Full Redis key"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ key }) => {
      try {
        const redis = getRedis();
        const [value, ttl] = await Promise.all([
          redis.get(key),
          redis.ttl(key),
        ]);
        const out = { key, value, ttl_seconds: ttl, exists: value !== null };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Scan Redis keys ─────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_redis_keys",
    {
      title: "Scan Redis Keys",
      description: "Scan Redis keys matching a glob pattern. Use to discover rate limit keys, context cache entries, circuit breaker flags, etc. Limit to 100 results.",
      inputSchema: z.object({
        pattern: z.string().min(1).max(512).describe("Glob pattern (e.g. 'extract:*', 'cb:*', 'context:*')"),
        count: z.number().int().min(1).max(100).default(50).describe("Max keys to return"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ pattern, count }) => {
      try {
        const redis = getRedis();
        const keys = await redis.keys(pattern);
        const limited = keys.slice(0, count);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ pattern, total_found: keys.length, returned: limited.length, keys: limited }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Check rate limit ────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_check_rate_limit",
    {
      title: "Check User Rate Limit",
      description: "Check a user's current rate limit counter for a specific action (e.g. 'extract', 'enhance'). Returns current count, TTL, and whether limit is exceeded.",
      inputSchema: z.object({
        user_id: z.string().uuid().describe("User UUID"),
        action: z.string().min(1).max(100).describe("Action name (e.g. 'extract', 'enhance')"),
        limit: z.number().int().min(1).describe("The configured limit for this action"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, action, limit }) => {
      try {
        const redis = getRedis();
        const today = new Date().toISOString().slice(0, 10);
        const key = `${action}:${user_id}:${today}`;
        const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
        const count = raw !== null ? Number(raw) : 0;
        const out = {
          key,
          count,
          limit,
          remaining: Math.max(0, limit - count),
          exceeded: count > limit,
          ttl_seconds: ttl,
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Reset rate limit ────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_reset_rate_limit",
    {
      title: "Reset User Rate Limit",
      description: "Delete a user's rate limit counter for a specific action, effectively resetting their quota. Use for manual overrides or testing.",
      inputSchema: z.object({
        user_id: z.string().uuid().describe("User UUID"),
        action: z.string().min(1).max(100).describe("Action name (e.g. 'extract', 'enhance')"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date key YYYY-MM-DD (defaults to today)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, action, date }) => {
      try {
        const redis = getRedis();
        const day = date ?? new Date().toISOString().slice(0, 10);
        const key = `${action}:${user_id}:${day}`;
        const deleted = await redis.del(key);
        return { content: [{ type: "text" as const, text: JSON.stringify({ key, deleted: deleted > 0 }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Circuit breaker state ───────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_circuit_breaker",
    {
      title: "Get AI Circuit Breaker State",
      description: "Check the circuit breaker state for all AI providers (gemini, mistral, groq, deepseek). Shows CLOSED/OPEN/HALF_OPEN and failure counts.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const redis = getRedis();
        const providers = ["gemini", "mistral", "groq", "deepseek"];
        const keys = providers.flatMap(p => [`cb:${p}:state`, `cb:${p}:failures`]);
        const values = await Promise.all(keys.map(k => redis.get(k)));

        const result: Record<string, { state: string | null; failures: number }> = {};
        providers.forEach((p, i) => {
          result[p] = {
            state: (values[i * 2] as string | null) ?? "CLOSED",
            failures: values[i * 2 + 1] !== null ? Number(values[i * 2 + 1]) : 0,
          };
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
