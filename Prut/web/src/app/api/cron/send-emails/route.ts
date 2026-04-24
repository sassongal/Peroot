import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { ONBOARDING_STEPS } from "@/lib/emails/onboarding-templates";
import {
  isOnboardingCronFallbackEnabled,
  isOnboardingEmailAutomationEnabled,
} from "@/lib/emails/automation-env";
import { logger } from "@/lib/logger";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { recordCronSuccess } from "@/lib/cron-heartbeat";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authFailure = verifyCronSecret(request);
  if (authFailure) return authFailure;

  if (!isOnboardingEmailAutomationEnabled()) {
    logger.info("[Cron/Emails] Skipped — set ONBOARDING_EMAILS_ENABLED=true for signup welcome");
    return NextResponse.json({ skipped: true, reason: "Onboarding emails disabled" });
  }

  if (!isOnboardingCronFallbackEnabled()) {
    logger.info(
      "[Cron/Emails] Skipped — ONBOARDING_CRON_FALLBACK_ENABLED is not true (callback-only onboarding; enable for stuck-sequence recovery)",
    );
    return NextResponse.json({
      skipped: true,
      reason: "Onboarding cron fallback disabled",
    });
  }

  const locked = await acquireCronLock("cron:send-emails", 35);
  if (!locked) {
    return NextResponse.json({ skipped: true, reason: "Another instance is running" });
  }

  const supabase = createServiceClient();

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.peroot.space";
  let sent = 0;
  let errors = 0;

  try {
    // Get all active sequences
    const { data: sequences, error } = await supabase
      .from("email_sequences")
      .select("id, user_id, current_step, started_at, last_sent_at")
      .eq("status", "active")
      .eq("sequence_type", "onboarding");

    if (error) {
      logger.error("[Cron/Emails] Failed to fetch sequences:", error);
      return NextResponse.json({ error: "Failed to fetch sequences" }, { status: 500 });
    }

    for (const seq of sequences || []) {
      const step = ONBOARDING_STEPS[seq.current_step];
      if (!step) {
        // All steps done - mark completed
        await supabase.from("email_sequences").update({ status: "completed" }).eq("id", seq.id);
        continue;
      }

      // Check if enough time has passed since start or last send
      const referenceTime = seq.last_sent_at || seq.started_at;
      const hoursSinceRef = (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60 * 60);

      if (hoursSinceRef < step.delayHours) continue;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(seq.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const name =
        userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name || "";
      const unsubscribeUrl = `${APP_URL}/api/email/unsubscribe?token=${seq.id}`;

      try {
        await EmailService.send({
          to: email,
          subject: step.subject,
          html: step.html(name, unsubscribeUrl),
          userId: seq.user_id,
          emailType: step.id,
          metadata: { sequence_id: seq.id, step: seq.current_step },
        });

        await supabase
          .from("email_sequences")
          .update({
            current_step: seq.current_step + 1,
            last_sent_at: new Date().toISOString(),
          })
          .eq("id", seq.id);

        sent++;
        logger.info(`[Cron/Emails] Sent ${step.id} to ${email.slice(0, 3)}***`);
      } catch (err) {
        errors++;
        logger.error(`[Cron/Emails] Failed to send ${step.id} to ${email}:`, err);
      }
    }

    await releaseCronLock("cron:send-emails");
    await recordCronSuccess("send-emails");
    return NextResponse.json({ sent, errors, total: sequences?.length || 0 });
  } catch (err) {
    await releaseCronLock("cron:send-emails");
    logger.error("[Cron/Emails] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
