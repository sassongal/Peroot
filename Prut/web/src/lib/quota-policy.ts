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
  /**
   * Referral reward per referred friend, paid into the separate bonus bucket
   * (owner decision, 2026-09-02). Mirrors site_settings.referral_bonus_credits.
   */
  referralBonus: 3,
  /** Days the bonus bucket stays usable after the latest grant. */
  referralBonusDays: 7,
  /** Safety ceiling on the bonus bucket. */
  bonusCap: 50,
} as const;

/**
 * PRO allowance, per LemonSqueezy billing month.
 * Mirrored in `site_settings.pro_monthly_credits`, which is what
 * `public.credit_ceiling('pro')` reads.
 */
export const PRO_MONTHLY_CREDITS = 150;

/**
 * Credits do NOT accrue (owner decision, 2026-09-01).
 *
 * A daily allowance is a ceiling, not a wallet: an unused day is not banked,
 * and no balance may exceed its tier's ceiling. Two mechanisms, both in the
 * database, because the balance is written from several places:
 *
 *   1. The rolling reset in `refresh_and_decrement_credits` SETS the balance to
 *      the limit rather than adding to it, so ten idle days still leave one
 *      day's quota.
 *   2. The `trg_clamp_credits_to_ceiling` trigger on `profiles` clamps any
 *      write above `public.credit_ceiling(plan_tier)`, whichever function did
 *      the writing (refund, referral, admin grant, churn downgrade).
 *
 * Admins are unmetered: their ceiling is NULL and nothing clamps them.
 *
 * Migration: supabase/migrations/20260901150000_credits_no_accrual.sql
 */
export const CREDITS_ACCRUE = false;

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
