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
    const { error } = await supabase
      .from("subscriptions")
      .upsert(
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

  const [{ data: currentProfile }, { data: canonicalSub }] = await Promise.all([
    supabase.from("profiles").select("plan_tier, tags, credits_balance").eq("id", userId).single(),
    supabase
      .from("subscriptions")
      .select("lemonsqueezy_subscription_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Never overwrite admin plan_tier — admin status is managed via the admin
  // panel (grant_admin action), not through payment events.
  if (currentProfile?.plan_tier === "admin") {
    logger.info(`[LemonSqueezy Webhook] Skipping plan_tier update for admin user ${userId}`);
    return;
  }

  // If this event is for a non-canonical subscription (user re-subscribed and the
  // DB row now points to a different sub ID), don't let the old subscription's
  // cancellation/expiry downgrade the user's plan_tier.
  const eventSubId = event.data!.id;
  const canonicalSubId = (canonicalSub as { lemonsqueezy_subscription_id?: string } | null)
    ?.lemonsqueezy_subscription_id;
  if (!activeProStatus && canonicalSubId && canonicalSubId !== eventSubId) {
    logger.info(
      `[LemonSqueezy Webhook] Ignoring ${attributes.status} for non-canonical sub ${eventSubId} (canonical: ${canonicalSubId})`,
    );
    return;
  }

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

  // Safety net: active subscription should NEVER carry the churn tag,
  // regardless of the wasPro path taken above (handles dedup-missed transitions).
  if (activeProStatus && currentProfile?.tags?.includes("churn")) {
    const cleanedTags = (currentProfile.tags ?? []).filter((t: string) => t !== "churn");
    await supabase
      .from("profiles")
      .update({ tags: cleanedTags, churned_at: null })
      .eq("id", userId);
    logger.info(`[LemonSqueezy Webhook] Removed stale churn tag for active user ${userId}`);
  }

  // Grant monthly credits on creation / renewal / resume
  if (activeProStatus) {
    await grantProCredits(supabase, userId, eventName);
  }

  logger.info(
    `[LemonSqueezy Webhook] Subscription ${eventName}: ${attributes.status} for user ${userId}`,
  );
}
