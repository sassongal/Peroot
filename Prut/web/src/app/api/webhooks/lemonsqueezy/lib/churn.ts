import { logger } from "@/lib/logger";
import { EmailService } from "@/lib/emails/service";
import { adminChurnAlertEmail } from "@/lib/emails/templates/admin-alerts";
import { churnEmail } from "@/lib/emails/reengagement-templates";
import { buildNewsletterUnsubscribeUrl } from "@/lib/email/newsletter-unsubscribe-signing";
import type { createServiceClient } from "@/lib/supabase/service";
import type { SubscriptionData } from "./subscription-data";

type ServiceClient = ReturnType<typeof createServiceClient>;

interface CurrentProfile {
  plan_tier?: string | null;
  tags?: string[] | null;
  credits_balance?: number | null;
}

/**
 * Handles the Pro → Free churn transition:
 * - Revokes pro credits (resets to free daily limit)
 * - Logs to credit ledger
 * - Adds "churn" tag to profile
 * - Sends churn re-engagement email to the user
 * - Sends churn alert email to admin
 */
export async function handleChurnTransition(
  supabase: ServiceClient,
  userId: string,
  subscriptionData: SubscriptionData,
  currentProfile: CurrentProfile,
  status: string,
): Promise<void> {
  const { data: siteSettings } = await supabase
    .from("site_settings")
    .select("daily_free_limit")
    .single();
  const dailyFreeLimit = siteSettings?.daily_free_limit ?? 2;

  const { error: revokeError } = await supabase
    .from("profiles")
    .update({
      credits_balance: dailyFreeLimit,
      credits_refreshed_at: new Date().toISOString(),
      // Start the rolling window now so a churned user doesn't get a second
      // fresh daily quota the instant their Pro window ends.
      last_prompt_at: new Date().toISOString(),
      churned_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (revokeError) {
    logger.error("[LemonSqueezy Webhook] Credit revocation error:", revokeError);
  }

  const previousBalance = currentProfile.credits_balance ?? 0;
  const revokeDelta = Math.min(0, dailyFreeLimit - previousBalance);
  if (revokeDelta !== 0) {
    try {
      await supabase.rpc("log_credit_change", {
        p_user_id: userId,
        p_delta: revokeDelta,
        p_balance_after: dailyFreeLimit,
        p_reason: "churn_revoke",
        p_source: "webhook",
      });
    } catch {
      /* ledger is best-effort */
    }
  }

  const existingTags: string[] = currentProfile.tags ?? [];
  if (!existingTags.includes("churn")) {
    await supabase
      .from("profiles")
      .update({ tags: [...existingTags, "churn"] })
      .eq("id", userId);
  }

  logger.info(
    `[LemonSqueezy Webhook] CHURN: User ${userId} reverted to free, credits reset to ${dailyFreeLimit}`,
  );

  const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.peroot.space"
  ).replace(/\/$/, "");

  let unsubscribeUrl = `${siteUrl}/settings`;
  try {
    const { data: seqRow } = await supabase
      .from("email_sequences")
      .select("id")
      .eq("user_id", userId)
      .eq("sequence_type", "onboarding")
      .maybeSingle();
    if (seqRow?.id) {
      unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?token=${seqRow.id}`;
    } else if (subscriptionData.customer_email) {
      unsubscribeUrl = buildNewsletterUnsubscribeUrl(siteUrl, subscriptionData.customer_email);
    }
  } catch {
    /* fallback to /settings */
  }

  try {
    const template = churnEmail(subscriptionData.customer_name || "משתמש/ת", unsubscribeUrl);
    if (subscriptionData.customer_email) {
      await EmailService.send({
        to: subscriptionData.customer_email,
        subject: template.subject,
        html: template.html,
        userId,
        emailType: "churn_notification",
      });
    }
  } catch (emailErr) {
    logger.error("[LemonSqueezy Webhook] Churn email error:", emailErr);
  }

  try {
    const { data: adminSettings } = await supabase
      .from("site_settings")
      .select("contact_email")
      .single();
    const adminEmail = adminSettings?.contact_email || "gal@joya-tech.net";
    await EmailService.send({
      to: adminEmail,
      subject: `[Peroot] Churn: ${(subscriptionData.customer_email || userId).slice(0, 100)}`,
      html: adminChurnAlertEmail({
        customerName: subscriptionData.customer_name || "N/A",
        customerEmail: subscriptionData.customer_email || "N/A",
        userId,
        status,
      }),
      emailType: "admin_churn_alert",
    });
  } catch (adminErr) {
    logger.error("[LemonSqueezy Webhook] Admin churn alert error:", adminErr);
  }
}

/**
 * Handles the Free → Pro resubscribe transition:
 * - Removes "churn" tag from profile
 * - Clears churned_at timestamp
 */
export async function handleResubscribeTransition(
  supabase: ServiceClient,
  userId: string,
  currentProfile: CurrentProfile,
): Promise<void> {
  const existingTags: string[] = currentProfile.tags ?? [];
  if (!existingTags.includes("churn")) return;

  await supabase
    .from("profiles")
    .update({
      tags: existingTags.filter((t) => t !== "churn"),
      churned_at: null,
    })
    .eq("id", userId);

  logger.info(
    `[LemonSqueezy Webhook] RESUBSCRIBE: User ${userId} returned to pro, churn tag removed`,
  );
}
