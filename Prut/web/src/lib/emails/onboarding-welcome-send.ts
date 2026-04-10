import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { ONBOARDING_STEPS } from "@/lib/emails/onboarding-templates";
import { logger } from "@/lib/logger";
import { isOnboardingEmailAutomationEnabled } from "@/lib/emails/automation-env";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.peroot.space";

/**
 * Sends the single onboarding welcome mail and marks the sequence completed.
 * Called from auth callback (immediate) when a new sequence row exists.
 */
export async function sendOnboardingWelcomeNow(params: {
  userId: string;
  email: string;
  displayName: string;
  sequenceId: string;
}): Promise<void> {
  if (!isOnboardingEmailAutomationEnabled()) return;

  const supabase = createServiceClient();
  const step = ONBOARDING_STEPS[0];
  if (!step) return;

  const unsubscribeUrl = `${APP_URL.replace(/\/$/, "")}/api/email/unsubscribe?token=${params.sequenceId}`;

  try {
    await EmailService.send({
      to: params.email,
      subject: step.subject,
      html: step.html(params.displayName, unsubscribeUrl),
      userId: params.userId,
      emailType: step.id,
      metadata: { sequence_id: params.sequenceId, step: 0 },
    });

    await supabase
      .from("email_sequences")
      .update({
        status: "completed",
        current_step: 1,
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", params.sequenceId)
      .eq("user_id", params.userId);

    logger.info(`[Onboarding] Welcome email sent to ${params.email.slice(0, 3)}***`);
  } catch (err) {
    logger.error("[Onboarding] Welcome send failed:", err);
    throw err;
  }
}
