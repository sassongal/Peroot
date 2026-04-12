import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

/**
 * In-flight request de-duplication for /api/enhance.
 *
 * Problem we're solving: a user double-clicks the enhance button, or an
 * over-eager retry loop in the client fires the same POST twice within a
 * second or two. Both requests pass auth, both decrement a credit, both
 * call the LLM — even though the output is identical. This burns 2×
 * tokens and 2× credits for one logical action. The result cache catches
 * later duplicates (after the first response is stored), but during the
 * narrow window where the first LLM call is still streaming there is no
 * protection.
 *
 * Design: before credit decrement, we try to acquire a short-lived
 * (10-second) Redis lock keyed on `user:${uid}:${hash(request)}`. If the
 * SET NX fails, a request with identical inputs is already in flight —
 * we return a structured "duplicate in flight" signal and the caller
 * responds with 409. Ten seconds is well under the 30s function
 * maxDuration, so stale locks from crashed requests release before they
 * can block the next retry.
 *
 * Failure mode: if Redis is unreachable, acquireInflightLock returns
 * `{ acquired: true, release: noop }` so the request proceeds unlocked.
 * We'd rather serve a duplicate occasionally than fail open requests
 * when a dependency is down.
 */

const LOCK_PREFIX = "peroot:enhance:inflight";
const DEFAULT_TTL_MS = 10_000;

interface InflightLockInput {
    userId?: string;
    prompt: string;
    mode?: string;
    tone?: string;
    category?: string;
    targetModel?: string;
    isRefinement?: boolean;
    /**
     * Include attachment fingerprint in the lock so a request with a
     * different PDF doesn't get blocked by a simultaneous request that
     * shares the same prompt text. Pass a stable digest of the attachment
     * payloads (or null for no attachments).
     */
    contextFingerprint?: string | null;
}

interface AcquiredLock {
    acquired: boolean;
    key: string | null;
    /** Always safe to call — noop if lock was never acquired or Redis is down. */
    release: () => Promise<void>;
}

function normalizePrompt(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[.!?,;:\s]+$/, "")
        .toLowerCase();
}

export function buildInflightKey(input: InflightLockInput): string | null {
    // Guests share IPs and have no stable identifier — we don't try to
    // dedup them. Their rate limiter + IP quota already pushes back.
    if (!input.userId) return null;

    const parts = [
        input.userId,
        normalizePrompt(input.prompt),
        input.mode ?? "STANDARD",
        input.tone ?? "",
        input.category ?? "",
        input.targetModel ?? "general",
        input.isRefinement ? "1" : "0",
        input.contextFingerprint ?? "",
    ];
    const hash = createHash("sha256").update(parts.join("\u0000")).digest("hex");
    return `${LOCK_PREFIX}:${input.userId}:${hash}`;
}

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
 * Try to acquire a short-lived lock for this request. If the lock is
 * already held, returns `{ acquired: false }` — the caller should respond
 * with 409. On Redis errors, returns `{ acquired: true }` (fail-open).
 */
export async function acquireInflightLock(
    input: InflightLockInput,
    ttlMs: number = DEFAULT_TTL_MS
): Promise<AcquiredLock> {
    const key = buildInflightKey(input);
    if (!key) {
        return { acquired: true, key: null, release: async () => {} };
    }

    const client = getRedis();
    if (!client) {
        // No Redis configured (e.g., local dev) — fail open.
        return { acquired: true, key, release: async () => {} };
    }

    try {
        // SET key value NX PX ttl — returns "OK" on success, null if key exists.
        const result = await client.set(key, "1", { nx: true, px: ttlMs });
        if (result !== "OK") {
            return { acquired: false, key, release: async () => {} };
        }
        return {
            acquired: true,
            key,
            release: async () => {
                try {
                    const c = getRedis();
                    if (c) await c.del(key);
                } catch (err) {
                    logger.warn("[inflight-lock] release failed:", err);
                }
            },
        };
    } catch (err) {
        logger.warn("[inflight-lock] acquire failed, failing open:", err);
        return { acquired: true, key, release: async () => {} };
    }
}
