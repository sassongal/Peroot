import { logger } from "@/lib/logger";
import type { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

const PRO_MONTHLY_CREDITS = 150;
const CREDIT_GRANT_EVENTS = [
  "subscription_created",
  "subscription_payment_success",
  "subscription_resumed",
] as const;

/**
 * Grants PRO_MONTHLY_CREDITS to a user when a qualifying billing event fires.
 * Idempotent within the same event because the caller already deduped on event_id.
 * Sets the balance to the monthly cap (not additive — monthly reset pattern).
 */
export async function grantProCredits(
  supabase: ServiceClient,
  userId: string,
  eventName: string,
): Promise<void> {
  if (!(CREDIT_GRANT_EVENTS as readonly string[]).includes(eventName)) return;

  const { error: creditsError } = await supabase
    .from("profiles")
    .update({
      credits_balance: PRO_MONTHLY_CREDITS,
      credits_refreshed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (creditsError) {
    logger.error("[LemonSqueezy Webhook] Credits update error:", creditsError);
  }

  try {
    await supabase.rpc("log_credit_change", {
      p_user_id: userId,
      p_delta: PRO_MONTHLY_CREDITS,
      p_balance_after: PRO_MONTHLY_CREDITS,
      p_reason: "subscription_grant",
      p_source: "webhook",
    });
  } catch {
    /* ledger is best-effort */
  }

  logger.info(
    `[LemonSqueezy Webhook] Granted ${PRO_MONTHLY_CREDITS} credits to pro user ${userId}`,
  );
}
