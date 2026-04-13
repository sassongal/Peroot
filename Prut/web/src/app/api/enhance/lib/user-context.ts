import { memoryFlags } from "@/lib/memory/injection-flags";
import type { createServiceClient } from "@/lib/supabase/service";

// Reuse the same QueryClient type pattern established in after-stream.ts
type QueryClient = ReturnType<typeof createServiceClient>;

// In-memory per-instance cache. Subscription upgrades may take up to 15s to reflect.
// Acceptable trade-off vs Redis round-trip on every request.
const profileCache = new Map<string, { tier: string; isAdmin: boolean; ts: number }>();
const PROFILE_CACHE_TTL = 15_000; // 15 seconds

interface ResolveUserContextParams {
  userId: string | undefined;
  // Accept both the service client and the regular supabase client.
  // The regular client is structurally compatible with QueryClient for the
  // subset of operations used here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryClient: any;
  isRefinement: boolean;
}

interface UserContextResult {
  tier: 'free' | 'pro' | 'admin' | 'guest';
  isAdmin: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historyRes: { data: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  personalityRes: { data: any };
}

/**
 * Fetches and caches user profile, tier, history, and personality context for the enhance route.
 *
 * - Returns early with guest defaults when userId is undefined.
 * - Uses an in-module LRU-ish profileCache (TTL 15s) to avoid redundant DB round-trips.
 * - Runs profile + history + personality queries in parallel via Promise.all.
 */
export async function resolveUserContext(
  params: ResolveUserContextParams
): Promise<UserContextResult> {
  const { userId, queryClient, isRefinement } = params;

  // Guest path: no userId, return early with safe defaults
  if (!userId) {
    return {
      tier: 'guest',
      isAdmin: false,
      historyRes: { data: null },
      personalityRes: { data: null },
    };
  }

  let tier: 'free' | 'pro' | 'admin' | 'guest' = 'free';
  let isAdmin = false;
  let cachedHit = false;

  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
    tier = cached.tier as 'free' | 'pro' | 'admin';
    isAdmin = cached.isAdmin;
    cachedHit = true;
  }

  // Parallel fetch: skip profile+admin queries if cached.
  //
  // History recall source: by default we now fetch from `history` (top-3
  // most recent enhances) which gives us the *enhanced_prompt* — letting
  // the model see before→after pairs instead of raw user prompts only.
  // Set PEROOT_LEGACY_HISTORY_RECALL=1 to revert to the use_count-ordered
  // fetch from personal_library (raw prompts only).
  const useHistoryTable = memoryFlags.useHistoryTableForRecall;
  const historyRecallPromise = !isRefinement && memoryFlags.historyEnabled
    ? (useHistoryTable
        ? queryClient.from('history')
            .select('title, prompt, enhanced_prompt')
            .eq('user_id', userId)
            .not('enhanced_prompt', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3)
        : queryClient.from('personal_library')
            .select('title, prompt')
            .eq('user_id', userId)
            .order('use_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(3))
    : Promise.resolve({ data: null });

  const [profileRes, historyRes, personalityRes, adminRoleRes] = await Promise.all([
    cachedHit
      ? Promise.resolve({ data: null })
      : queryClient.from('profiles').select('plan_tier').eq('id', userId).maybeSingle(),
    historyRecallPromise,
    !isRefinement && memoryFlags.personalityEnabled
      ? queryClient.from('user_style_personality')
          .select('style_tokens, personality_brief, preferred_format')
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    cachedHit
      ? Promise.resolve({ data: null })
      : queryClient.from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle(),
  ]);

  // Process profile & tier (from DB if not cached)
  if (!cachedHit && profileRes.data) {
    tier = (profileRes.data.plan_tier as 'free' | 'pro' | 'admin') || 'free';
    isAdmin = !!adminRoleRes?.data || isAdmin;

    // Store in cache
    if (profileCache.size > 10000) profileCache.clear();
    profileCache.set(userId, { tier, isAdmin, ts: Date.now() });
  }

  return { tier, isAdmin, historyRes, personalityRes };
}

// Export the QueryClient type so callers can reference it if needed
export type { QueryClient };
