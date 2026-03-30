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
    // Get all users with email (limited to prevent timeout)
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .not("email", "is", null)
      .limit(5000);

    if (profileError || !profiles) {
      logger.error("[Reengagement] Failed to fetch profiles:", profileError);
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    // Get unsubscribed users
    const { data: unsubscribed } = await supabase
      .from("email_sequences")
      .select("user_id")
      .eq("status", "unsubscribed");
    const unsubIds = new Set((unsubscribed ?? []).map((u) => u.user_id));

    // Get already-sent re-engagement emails
    const { data: alreadySent } = await supabase
      .from("email_logs")
      .select("user_id, email_type")
      .in("email_type", REENGAGEMENT_TEMPLATES.map((t) => t.id));
    const sentKeys = new Set(
      (alreadySent ?? []).map((e) => `${e.user_id}:${e.email_type}`)
    );

    // Get email_sequences for unsubscribe tokens (keyed by user_id)
    const { data: sequences } = await supabase
      .from("email_sequences")
      .select("id, user_id")
      .eq("sequence_type", "onboarding");
    const sequenceByUser = new Map(
      (sequences ?? []).map((s) => [s.user_id, s.id])
    );

    // BATCH: Get last activity for all users in one query instead of N+1
    // Fetch recent activity grouped by user (last 35 days covers all templates)
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("user_id, created_at")
      .gte("created_at", thirtyFiveDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50000);

    // Build map: user_id → last activity date
    const lastActivityMap = new Map<string, Date>();
    for (const row of recentActivity ?? []) {
      if (!lastActivityMap.has(row.user_id)) {
        lastActivityMap.set(row.user_id, new Date(row.created_at));
      }
    }

    // Process each user
    for (const profile of profiles) {
      if (unsubIds.has(profile.id)) continue;

      const lastActiveDate = lastActivityMap.get(profile.id) ?? new Date(profile.created_at);
      const daysSinceActive = Math.floor(
        (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Skip recently active users (< 7 days)
      if (daysSinceActive < 7) {
        skipped++;
        continue;
      }

      // Find the highest-tier template they qualify for but haven't received
      const eligibleTemplate = REENGAGEMENT_TEMPLATES
        .filter((t) => daysSinceActive >= t.inactiveDays)
        .filter((t) => !sentKeys.has(`${profile.id}:${t.id}`))
        .sort((a, b) => b.inactiveDays - a.inactiveDays)[0];

      if (!eligibleTemplate) {
        skipped++;
        continue;
      }

      const name = profile.full_name || profile.email?.split("@")[0] || "";

      // Use email_sequences.id as unsubscribe token (matches the unsubscribe endpoint)
      // Fallback to profile.id if no sequence exists (endpoint will handle gracefully)
      const unsubToken = sequenceByUser.get(profile.id) || profile.id;
      const unsubscribeUrl = `${APP_URL}/api/email/unsubscribe?token=${unsubToken}`;

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
      } catch (err) {
        errors++;
        logger.error(`[Reengagement] Failed to send ${eligibleTemplate.id}:`, err);
      }
    }

    return NextResponse.json({ sent, skipped, errors, total: profiles.length });
  } catch (err) {
    logger.error("[Reengagement] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
