import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { REENGAGEMENT_TEMPLATES } from "@/lib/emails/reengagement-templates";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

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
  let skipped = 0;
  let errors = 0;

  try {
    // Get all users with their last activity date
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .not("email", "is", null);

    if (profileError || !profiles) {
      logger.error("[Reengagement] Failed to fetch profiles:", profileError);
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    // Get unsubscribed users to skip them
    const { data: unsubscribed } = await supabase
      .from("email_sequences")
      .select("user_id")
      .eq("status", "unsubscribed");
    const unsubIds = new Set((unsubscribed ?? []).map((u) => u.user_id));

    // Get already-sent re-engagement emails to avoid duplicates
    const { data: alreadySent } = await supabase
      .from("email_logs")
      .select("user_id, email_type")
      .in("email_type", REENGAGEMENT_TEMPLATES.map((t) => t.id));
    const sentKeys = new Set(
      (alreadySent ?? []).map((e) => `${e.user_id}:${e.email_type}`)
    );

    // For each user, check their last activity
    for (const profile of profiles) {
      if (unsubIds.has(profile.id)) continue;

      // Get last activity date
      const { data: lastActivity } = await supabase
        .from("activity_logs")
        .select("created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastActiveDate = lastActivity?.[0]?.created_at
        ? new Date(lastActivity[0].created_at)
        : new Date(profile.created_at);

      const daysSinceActive = Math.floor(
        (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find the appropriate template for this inactivity level
      // Pick the highest-tier template they qualify for but haven't received
      const eligibleTemplate = REENGAGEMENT_TEMPLATES
        .filter((t) => daysSinceActive >= t.inactiveDays)
        .filter((t) => !sentKeys.has(`${profile.id}:${t.id}`))
        .sort((a, b) => b.inactiveDays - a.inactiveDays)[0];

      if (!eligibleTemplate) {
        skipped++;
        continue;
      }

      const name = profile.full_name || profile.email?.split("@")[0] || "";
      const unsubscribeUrl = `${APP_URL}/api/email/unsubscribe?token=${profile.id}`;

      try {
        await EmailService.send({
          to: profile.email!,
          subject: eligibleTemplate.subject,
          html: eligibleTemplate.html(name, unsubscribeUrl),
          userId: profile.id,
          emailType: eligibleTemplate.id,
          metadata: {
            days_inactive: daysSinceActive,
            last_active: lastActiveDate.toISOString(),
          },
        });
        sent++;
        logger.info(`[Reengagement] Sent ${eligibleTemplate.id} to ${profile.email?.slice(0, 3)}***`);
      } catch (err) {
        errors++;
        logger.error(`[Reengagement] Failed to send to ${profile.email?.slice(0, 3)}***:`, err);
      }
    }

    return NextResponse.json({ sent, skipped, errors, total: profiles.length });
  } catch (err) {
    logger.error("[Reengagement] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
