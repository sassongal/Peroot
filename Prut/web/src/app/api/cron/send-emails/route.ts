import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { ONBOARDING_STEPS } from "@/lib/emails/onboarding-templates";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        await supabase
          .from("email_sequences")
          .update({ status: "completed" })
          .eq("id", seq.id);
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

      const name = userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name || "";
      const unsubscribeUrl = `${APP_URL}/api/email/unsubscribe?token=${seq.id}`;

      // Fetch referral code for day 7 email
      let referralCode: string | undefined;
      if (step.id === 'onboarding_day7') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', seq.user_id)
          .maybeSingle();
        referralCode = (profile?.referral_code as string) || undefined;
      }

      try {
        await EmailService.send({
          to: email,
          subject: step.subject,
          html: step.html(name, unsubscribeUrl, referralCode),
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

    return NextResponse.json({ sent, errors, total: sequences?.length || 0 });
  } catch (err) {
    logger.error("[Cron/Emails] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
