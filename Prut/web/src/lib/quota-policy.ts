/**
 * The one place a quota number is allowed to appear.
 *
 * Project law (CLAUDE.md): quotas are DATA, not constants. The live values
 * live in `public.site_settings` (`guest_daily_limit`, `daily_free_limit`) and
 * every runtime path reads them from there. This module exists only for the
 * two things the database cannot provide:
 *
 *   1. The fallback used when the settings read fails. Before this module,
 *      eight call sites each wrote their own `?? 2` and one wrote `?? 1`, so a
 *      Supabase blip handed different users different quotas depending on
 *      which route they hit. One fallback, imported everywhere.
 *   2. Hebrew copy that has to stay grammatical when the owner changes the
 *      number. "2 שיפורים" and "שיפור אחד" are different word forms, not a
 *      different digit, so copy interpolates a phrase and not a numeral.
 *
 * Enforced by `src/lib/__tests__/quota-law.test.ts`, which fails the build if
 * a quota number is written into UI copy or a `??` fallback anywhere else.
 */

/**
 * Fallback quotas, used ONLY when `site_settings` cannot be read.
 *
 * Keep in sync with the live row and with the two SQL defaults that cannot
 * import this file: `handle_new_user()` and `refresh_and_decrement_credits()`
 * (both fall back to freeDaily), in
 * `supabase/migrations/20260901140000_quota_law.sql`.
 */
export const QUOTA_FALLBACK = {
  /** Anonymous visitor, per rolling 24h window. */
  guestDaily: 1,
  /** Registered free user, per rolling 24h window. */
  freeDaily: 2,
} as const;

/** PRO allowance, per LemonSqueezy billing month. A plan term, not a setting. */
export const PRO_MONTHLY_CREDITS = 150;

/** Daily limit shown for an admin: unmetered. */
export const ADMIN_DAILY_LIMIT = -1;

/**
 * Coerce whatever came back from the database into a usable quota.
 * A null column, a string, or a negative number must not silently become the
 * user's limit.
 */
export function resolveDailyLimit(raw: unknown, fallback: number): number {
  // null/undefined/"" must NOT coerce: Number(null) and Number("") are both 0,
  // which would read as a legitimate quota of zero and lock every user out.
  // Objects and arrays are rejected outright: Number([]) is 0, so an array
  // would slip through the finite check and read as a quota of zero.
  if (typeof raw !== "number" && typeof raw !== "string") return fallback;
  if (raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** "שיפור אחד" / "2 שיפורים" — the noun, correctly inflected. */
export function enhancementsPhrase(n: number): string {
  if (n === 1) return "שיפור אחד";
  if (n === 2) return "שני שיפורים";
  return `${n} שיפורים`;
}

/** "קרדיט אחד" / "שני קרדיטים" / "5 קרדיטים". */
export function creditsPhrase(n: number): string {
  if (n === 1) return "קרדיט אחד";
  if (n === 2) return "שני קרדיטים";
  return `${n} קרדיטים`;
}

/** "שיפור אחד ביום" / "שני שיפורים ביום" — the full daily-allowance phrase. */
export function dailyEnhancementsPhrase(n: number): string {
  return `${enhancementsPhrase(n)} ביום`;
}

/** "קרדיט אחד ביום" / "שני קרדיטים ביום". */
export function dailyCreditsPhrase(n: number): string {
  return `${creditsPhrase(n)} ביום`;
}
