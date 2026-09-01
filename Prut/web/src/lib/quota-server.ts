import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { QUOTA_FALLBACK, resolveDailyLimit } from "@/lib/quota-policy";

/**
 * Server-side read of the live quota policy, for Server Components that need
 * to state the numbers in copy (pricing, FAQ, SEO blocks) without hardcoding
 * them.
 *
 * Cached for 60s per instance: these pages are near-static and the settings
 * row changes only when an admin edits it, so paying one read a minute keeps
 * marketing copy honest without putting a query on every render.
 *
 * Runtime quota ENFORCEMENT does not go through here. Spending is decided by
 * `refresh_and_decrement_credits` (registered) and the Redis Lua script
 * (guests), both of which read the authoritative value themselves.
 */
export interface QuotaPolicy {
  guestDaily: number;
  freeDaily: number;
}

let cache: { value: QuotaPolicy; ts: number } | null = null;
const TTL_MS = 60_000;

export async function getQuotaPolicy(): Promise<QuotaPolicy> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.value;

  try {
    const { data } = await createServiceClient()
      .from("site_settings")
      .select("daily_free_limit, guest_daily_limit")
      .limit(1)
      .maybeSingle();

    const value: QuotaPolicy = {
      guestDaily: resolveDailyLimit(data?.guest_daily_limit, QUOTA_FALLBACK.guestDaily),
      freeDaily: resolveDailyLimit(data?.daily_free_limit, QUOTA_FALLBACK.freeDaily),
    };
    cache = { value, ts: Date.now() };
    return value;
  } catch (e) {
    // Copy must still render. The fallback is the documented policy, so the
    // worst case is stale marketing text, never a wrong enforcement decision.
    logger.warn("[quota-server] settings read failed, using fallback policy:", e);
    return { ...QUOTA_FALLBACK };
  }
}

/** Test seam: drop the cache so the next call re-reads. */
export function invalidateQuotaPolicyCache(): void {
  cache = null;
}
