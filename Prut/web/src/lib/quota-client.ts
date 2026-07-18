import { logger } from "@/lib/logger";

/** Authenticated-user quota, as returned by /api/me/quota. */
export interface MeQuota {
  plan_tier: "free" | "pro" | "admin";
  credits_balance: number;
  daily_limit: number;
  refresh_at: string | null;
  last_prompt_at: string | null;
}

/**
 * Shared, deduped fetcher for /api/me/quota.
 *
 * Several components mount at once on the home page (usePromptLimits — used in
 * more than one place — plus CreditsPanel), and each used to hit /api/me/quota
 * independently (3x on load). This coalesces concurrent callers onto a single
 * in-flight request and serves a short-lived cache so a page load makes one call.
 * Call with `force` after a spend to bypass the cache and refetch authoritatively.
 */
const CACHE_TTL_MS = 4000;

let inflight: Promise<MeQuota | null> | null = null;
let cached: { value: MeQuota | null; at: number } | null = null;

export async function fetchMeQuota(force = false): Promise<MeQuota | null> {
  const now = Date.now();
  if (!force && cached && now - cached.at < CACHE_TTL_MS) return cached.value;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/me/quota", { credentials: "include" });
      const value = res.ok ? ((await res.json()) as MeQuota) : null;
      cached = { value, at: Date.now() };
      return value;
    } catch (e) {
      logger.error("[quota-client] /api/me/quota fetch failed:", e);
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Drop the cache so the next fetch hits the server (e.g. after a spend/upgrade). */
export function invalidateMeQuota(): void {
  cached = null;
}
