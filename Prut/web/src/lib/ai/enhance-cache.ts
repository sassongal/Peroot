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

export const ENGINE_VERSION = "v1-2026-04-07";
const CACHE_PREFIX = `peroot:enhance:${ENGINE_VERSION}`;
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export interface EnhanceCacheKeyInput {
    prompt: string;
    mode?: string;
    tone?: string;
    category?: string;
    targetModel?: string;
    /**
     * Set true for refinement requests. Refinements carry previousResult +
     * refinementInstruction + answers, all of which make the request effectively
     * unique per user — we explicitly skip the cache for those.
     */
    isRefinement?: boolean;
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
 * Build the Redis key for a request. Refinements always return null so the
 * caller skips cache lookup entirely.
 */
export function buildCacheKey(input: EnhanceCacheKeyInput): string | null {
    if (input.isRefinement) return null;

    const parts = [
        normalizePrompt(input.prompt),
        input.mode ?? "STANDARD",
        input.tone ?? "",
        input.category ?? "",
        input.targetModel ?? "general",
    ];
    const hash = createHash("sha256").update(parts.join("\u0000")).digest("hex");
    return `${CACHE_PREFIX}:${hash}`;
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

/** Soft kill switch. Set ENHANCE_CACHE_ENABLED=false to bypass cache at runtime. */
function cacheEnabled(): boolean {
    return process.env.ENHANCE_CACHE_ENABLED !== "false";
}

export interface CachedEnhanceResult {
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
 * Store a result. Fire-and-forget — callers do not await this and do not
 * care if it fails; the next identical request will simply miss again.
 */
export async function setCached(
    key: string | null,
    value: CachedEnhanceResult,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
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
