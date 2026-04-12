import { logger } from "@/lib/logger";
import type { createServiceClient } from "@/lib/supabase/service";
import { buildSubscriptionData, isActivePro, type LsEvent } from "./subscription-data";
import { handleChurnTransition, handleResubscribeTransition } from "./churn";
import { grantProCredits } from "./credits";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Processes a LemonSqueezy subscription_* event end-to-end:
 * 1. Upserts / updates the `subscriptions` row
 * 2. Syncs `plan_tier` in `profiles`
 * 3. Handles churn (Pro → Free) or resubscribe (Free → Pro) side-effects
 * 4. Grants monthly credits on qualifying billing events
 *
 * Preconditions (validated by caller):
 * - event.data.attributes must be present
 * - userId must be non-null
 */
export async function handleSubscriptionEvent(
  supabase: ServiceClient,
  event: LsEvent,
  eventName: string,
  userId: string,
): Promise<void> {
  const attributes = event.data!.attributes;
  const subscriptionData = buildSubscriptionData(event, userId);

  // Upsert / update subscription row
  if (eventName === "subscription_created") {
    const { error } = await supabase.from("subscriptions").upsert(
      { ...subscriptionData, created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) {
      logger.error("[LemonSqueezy Webhook] Insert error:", error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("lemonsqueezy_subscription_id", event.data!.id);

    if (error) {
      logger.error("[LemonSqueezy Webhook] Update error:", error);
      // Fallback: upsert in case the row doesn't exist yet
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(subscriptionData, { onConflict: "user_id" });
      if (upsertError) {
        logger.error("[LemonSqueezy Webhook] Upsert fallback error:", upsertError);
      }
    }
  }

  // Sync plan_tier in profiles (drives rate limiting + enhance API tier checks)
  // 'paid' is non-standard but appears in subscription_payment_success attributes.
  // 'past_due' keeps pro access during LemonSqueezy's dunning/retry period.
  const activeProStatus = isActivePro(attributes.status);
  const newTier = activeProStatus ? "pro" : "free";

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("plan_tier, tags, credits_balance")
    .eq("id", userId)
    .single();

  const wasPro = currentProfile?.plan_tier === "pro";

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ plan_tier: newTier })
    .eq("id", userId);
  if (profileError) {
    logger.error("[LemonSqueezy Webhook] Profile plan_tier update error:", profileError);
  }

  // Churn: Pro → Free
  if (wasPro && !activeProStatus) {
    await handleChurnTransition(
      supabase,
      userId,
      subscriptionData,
      currentProfile ?? {},
      attributes.status,
    );
  }

  // Resubscribe: Free → Pro
  if (activeProStatus && !wasPro) {
    await handleResubscribeTransition(supabase, userId, currentProfile ?? {});
  }

  // Grant monthly credits on creation / renewal / resume
  if (activeProStatus) {
    await grantProCredits(supabase, userId, eventName);
  }

  logger.info(
    `[LemonSqueezy Webhook] Subscription ${eventName}: ${attributes.status} for user ${userId}`,
  );
}
