import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

/**
 * Result cache for /api/enhance.
 *
 * Stores the full engine output (the exact text the stream endpoint returns)
 * keyed on a hash of the normalized request parameters. Cache hits let us skip
 * the LLM call entirely, saving provider tokens and latency.
 *
 * This is a separate layer from Next.js `use cache` — that's for Server
 * Components and cached functions. A POST route handler with credits,
 * streaming, and per-request side effects is outside the scope of `use cache`,
 * so we manage an explicit Redis cache here.
 *
 * Bump ENGINE_VERSION whenever the engine prompt or output shape changes in a
 * way that invalidates older cached outputs — the prefix moves and all old
 * entries become unreachable (no migration needed, they just TTL out).
 */

// Bumped from v1-2026-04-07 after the cross-user leak fix — the old keys
// were scoped globally (no userId) and must not be reused even after the
// fix ships, because they could still return another user's output.
export const ENGINE_VERSION = "v2-2026-04-07";
const CACHE_PREFIX = `peroot:enhance:${ENGINE_VERSION}`;
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

interface EnhanceCacheKeyInput {
  prompt: string;
  mode?: string;
  tone?: string;
  category?: string;
  targetModel?: string;
  /**
   * The authenticated user ID. REQUIRED for the key to resolve — guests
   * (no userId) never hit the cache, and per-user scoping prevents the
   * cross-user data leak where user A's PDF-influenced output could
   * leak to user B asking the same prompt. See the code-review findings
   * in docs/superpowers/specs/2026-04-07-cost-optimization-quickwins-design.md.
   */
  userId?: string;
  /**
   * True when the request has file/URL/image context attachments. Context
   * can contain confidential documents whose content the engine incorporates
   * into the generated prompt — we never cache those. Even though the key
   * is now per-user, context also varies within the same user, and storing
   * multi-KB PDF-derived prompts in Redis is wasteful.
   */
  hasContext?: boolean;
  /**
   * True when any style/history personalization was loaded for this
   * request. The engine output depends on user personality + history, but
   * those live in the DB and change over time. Rather than invalidate on
   * every personality update, we skip the cache whenever personalization
   * is active. Same-user repeat requests are still the dominant cache case.
   */
  hasPersonalization?: boolean;
  /**
   * Set true for refinement requests. Refinements carry previousResult +
   * refinementInstruction + answers, all of which make the request effectively
   * unique per user — we explicitly skip the cache for those.
   */
  isRefinement?: boolean;
  /**
   * Active model-profile slug (e.g. "gpt-5", "claude-sonnet-4"). Once profiles
   * actually mutate the system prompt, two requests with identical prompt/mode
   * but different profile slugs MUST land on different cache slots — otherwise
   * a Claude-tuned response could be served to a ChatGPT-tuned caller.
   */
  modelProfileSlug?: string | null;
  /**
   * Runtime cache version published via /api/extension-config. Bumping it
   * invalidates all cache entries for the new extension client without
   * needing a code-side ENGINE_VERSION change.
   */
  cacheVersion?: number | null;
}

/**
 * Normalize the prompt so trivially different requests collapse to the same
 * cache key. We lowercase, collapse internal whitespace, and strip a few
 * trailing punctuation characters that users often add inconsistently.
 */
function normalizePrompt(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:\s]+$/, "")
    .toLowerCase();
}

/**
 * Build the Redis key for a request. Returns null (cache disabled) when any
 * of these conditions hold:
 *   - Refinement request (per-user ephemeral state)
 *   - No authenticated user (guests are rate-limited, not cached)
 *   - Request has context attachments (PDF/URL/image — may contain PII)
 *   - Request has user personality/history loaded (per-user signal varies)
 *
 * The key itself is namespaced by userId so that even for a hypothetical
 * future case where two users produced the same normalized key inputs,
 * their Redis entries live in separate slots.
 */
export function buildCacheKey(input: EnhanceCacheKeyInput): string | null {
  if (input.isRefinement) return null;
  if (!input.userId) return null;
  if (input.hasContext) return null;
  if (input.hasPersonalization) return null;

  const parts = [
    input.userId,
    normalizePrompt(input.prompt),
    input.mode ?? "STANDARD",
    input.tone ?? "",
    input.category ?? "",
    input.targetModel ?? "general",
    input.modelProfileSlug ?? "",
    String(input.cacheVersion ?? 0),
  ];
  const hash = createHash("sha256").update(parts.join("\u0000")).digest("hex");
  // userId lives in the hash AND as a key prefix so that bulk operations
  // (e.g., GDPR user deletion) can scan `peroot:enhance:v2-*:user:<id>:*`
  // and nuke all of a user's cached entries without collision.
  return `${CACHE_PREFIX}:user:${input.userId}:${hash}`;
}

// Lazily-initialized Redis client. Matches the pattern in src/lib/ratelimit.ts.
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/** @internal Test-only helper to reset the lazy Redis singleton between tests. */
export function __resetRedisForTest(): void {
  redis = null;
}

/**
 * Memoized cache_version pulled from public.extension_configs.is_active=true.
 * Intentionally a separate path from /api/extension-config's memo so route
 * handlers don't introduce circular imports. 5-min TTL — same window as the
 * config endpoint — and falls back to 0 on any failure (which is a stable
 * key contributor and never throws away cache entries spuriously).
 */
let cacheVersionMemo: { value: number; ts: number } | null = null;
const CACHE_VERSION_TTL_MS = 5 * 60 * 1000;

export async function getRuntimeCacheVersion(): Promise<number> {
  if (cacheVersionMemo && Date.now() - cacheVersionMemo.ts < CACHE_VERSION_TTL_MS) {
    return cacheVersionMemo.value;
  }
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("extension_configs")
      .select("cache_version")
      .eq("is_active", true)
      .maybeSingle();
    const v = typeof data?.cache_version === "number" ? data.cache_version : 0;
    cacheVersionMemo = { value: v, ts: Date.now() };
    return v;
  } catch (err) {
    logger.warn("[enhance-cache] cache_version load failed:", err);
    return 0;
  }
}

/** @internal Test-only. */
export function __resetCacheVersionForTest(): void {
  cacheVersionMemo = null;
}

/** Soft kill switch. Set ENHANCE_CACHE_ENABLED=false to bypass cache at runtime. */
function cacheEnabled(): boolean {
  return process.env.ENHANCE_CACHE_ENABLED !== "false";
}

interface CachedEnhanceResult {
  text: string;
  modelId: string;
  /**
   * Timestamp when the result was cached (ms since epoch). Used for
   * debugging and for lightweight "tokens saved" estimation.
   */
  cachedAt: number;
}

/**
 * Look up a cached enhance result. Returns null on miss, on any Redis error,
 * or when the cache is disabled — the caller should always treat null as
 * "run the LLM".
 */
export async function getCached(key: string | null): Promise<CachedEnhanceResult | null> {
  if (!key || !cacheEnabled()) return null;
  try {
    const client = getRedis();
    if (!client) return null;
    const raw = await client.get<CachedEnhanceResult>(key);
    return raw ?? null;
  } catch (err) {
    logger.warn("[enhance-cache] get failed, falling through to LLM:", err);
    return null;
  }
}

/**
 * Delete a cached entry. Used by the X-Peroot-Cache-Bypass path to ensure
 * a forced regeneration overwrites any stale value; without this, a bypass
 * request would leave the existing entry intact for the next non-bypass
 * caller to read. Fire-and-forget; failures are logged but never thrown.
 */
export async function deleteCached(key: string | null): Promise<void> {
  if (!key) return;
  try {
    const client = getRedis();
    if (!client) return;
    await client.del(key);
  } catch (err) {
    logger.warn("[enhance-cache] delete failed:", err);
  }
}

/**
 * Store a result. Fire-and-forget — callers do not await this and do not
 * care if it fails; the next identical request will simply miss again.
 */
export async function setCached(
  key: string | null,
  value: CachedEnhanceResult,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  if (!key || !cacheEnabled()) return;
  try {
    const client = getRedis();
    if (!client) return;
    await client.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    logger.warn("[enhance-cache] set failed:", err);
  }
}
