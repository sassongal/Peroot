import * as Sentry from "@sentry/nextjs";
import { refundCredit } from "@/lib/services/credit-service";
import { refundGuestCredit } from "@/lib/guest-service";

export interface RefundEnhanceArgs {
  /** Authenticated user id, or null/undefined for guests. */
  userId?: string | null;
  /** Guest id (rolling-window quota), or null when there is no guest. */
  guestId: string | null;
  /** Refinement flag — kept for observability; guests are charged (and
   *  therefore refunded) on refinements too since the guest quota-bypass fix. */
  isRefinement: boolean;
  /**
   * Which bucket the charge came from, as reported by the credit RPC. A refund
   * has to go back to the same bucket: the daily bucket is a ceiling, so a
   * credit that was spent from the bonus and refunded into "daily" would be
   * clamped away at once, and the user who lost it would be a referrer.
   */
  chargedFrom?: "daily" | "bonus";
  /** Extra fields attached to the Sentry event if an authenticated refund fails. */
  context?: Record<string, unknown>;
}

export type RefundOutcome = "user" | "guest" | "none";

/**
 * The single home of the enhance-flow refund decision. Previously this exact
 * branch was hand-written at FIVE sites (score-gate, cache-hit, live onFinish,
 * the concurrency catch, and the generic error catch) — a place credit/billing
 * correctness could silently drift.
 *
 * The matrix:
 *   - authenticated user → `refundCredit(userId)` (Sentry on failure)
 *   - guest              → `refundGuestCredit(guestId)` (refinements too —
 *     guests are charged on refinements since the quota-bypass fix)
 *   - admin / no id      → no-op
 *
 * The Sentry-on-failure branch previously lived only in the live path; hoisting
 * it here gives every refund site the same failure visibility. It never changes
 * whether or whom we refund — only observability.
 */
export async function refundEnhanceCredit(args: RefundEnhanceArgs): Promise<RefundOutcome> {
  const { userId, guestId, isRefinement, context, chargedFrom } = args;

  if (userId) {
    const result = await refundCredit(userId, 1, chargedFrom ?? "daily");
    if (!result.success) {
      Sentry.captureException(new Error("Credit refund failed"), {
        extra: { userId, ...context, error: result.error },
      });
    }
    return "user";
  }

  if (guestId) {
    void isRefinement;
    await refundGuestCredit(guestId);
    return "guest";
  }

  return "none";
}
