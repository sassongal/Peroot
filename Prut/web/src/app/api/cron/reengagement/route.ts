import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { REENGAGEMENT_TEMPLATES } from "@/lib/emails/reengagement-templates";
import { isReengagementEmailAutomationEnabled } from "@/lib/emails/automation-env";
import { logger } from "@/lib/logger";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { recordCronSuccess } from "@/lib/cron-heartbeat";
import { verifyCronSecret } from "@/lib/cron-auth";
import { selectReengagementRecipients } from "./select";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authFailure = verifyCronSecret(request);
  if (authFailure) return authFailure;

  if (!isReengagementEmailAutomationEnabled()) {
    logger.info(
      "[Cron/Reengagement] Skipped — set REENGAGEMENT_EMAILS_ENABLED=true to enable drip",
    );
    return NextResponse.json({ skipped: true, reason: "Reengagement emails disabled" });
  }

  const locked = await acquireCronLock("cron:reengagement", 35);
  if (!locked) {
    return NextResponse.json({ skipped: true, reason: "Another instance is running" });
  }

  const supabase = createServiceClient();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.peroot.space";
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Step 1: Find users who were active in the last 7 days (to exclude them)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentlyActiveRows } = await supabase
      .from("activity_logs")
      .select("user_id")
      .gte("created_at", sevenDaysAgo)
      .limit(50000);
    const recentlyActiveIds = new Set((recentlyActiveRows ?? []).map((r) => r.user_id));

    // Get unsubscribed users
    const { data: unsubscribed } = await supabase
      .from("email_sequences")
      .select("user_id")
      .eq("status", "unsubscribed");
    const unsubIds = new Set((unsubscribed ?? []).map((u) => u.user_id));

    // Step 2: Fetch only profiles that are NOT recently active and NOT unsubscribed
    const excludeIds = [...new Set([...recentlyActiveIds, ...unsubIds])];
    let profileQuery = supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .not("email", "is", null);
    // Supabase .not('id', 'in', ...) with large arrays can be slow, so filter in JS if too many
    if (excludeIds.length < 1000) {
      profileQuery = profileQuery.not("id", "in", `(${excludeIds.join(",")})`);
    }
    const { data: profiles, error: profileError } = await profileQuery.limit(500);

    if (profileError || !profiles) {
      logger.error("[Reengagement] Failed to fetch profiles:", profileError);
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    const profileRows = profiles ?? [];
    // Filter out excluded IDs in JS if we couldn't do it in the query
    const filteredProfiles =
      excludeIds.length >= 1000
        ? profileRows.filter((p) => !recentlyActiveIds.has(p.id) && !unsubIds.has(p.id))
        : profileRows;

    // Get already-sent re-engagement emails.
    // `error` is checked deliberately: this query IS the dedupe. If it fails
    // (e.g. the table is missing, as it was in production until 2026-08-24) an
    // empty set makes every user re-qualify on every run, and the drip mails the
    // entire customer base daily. Fail loudly instead of degrading into a blast.
    const { data: alreadySent, error: sentError } = await supabase
      .from("email_logs")
      .select("user_id, email_type, created_at")
      .in(
        "email_type",
        REENGAGEMENT_TEMPLATES.map((t) => t.id),
      );
    if (sentError) {
      await releaseCronLock("cron:reengagement");
      logger.error(
        "[Reengagement] Cannot read email_logs — aborting rather than risk re-sending:",
        sentError,
      );
      return NextResponse.json({ error: "email_logs unavailable" }, { status: 500 });
    }

    // Never mail the same person twice inside this window, whatever the tier.
    const MIN_GAP_MS = Number(process.env.REENGAGEMENT_MIN_GAP_DAYS ?? 7) * 24 * 60 * 60 * 1000;
    // Cap each run so a cold list drains over several days instead of going out
    // as one blast: protects sender reputation and stays under provider limits.
    const MAX_PER_RUN = Number(process.env.REENGAGEMENT_MAX_PER_RUN ?? 50);

    // Get email_sequences for unsubscribe tokens (keyed by user_id)
    const { data: sequences } = await supabase
      .from("email_sequences")
      .select("id, user_id")
      .eq("sequence_type", "onboarding");
    const sequenceByUser = new Map((sequences ?? []).map((s) => [s.user_id, s.id]));

    // Get last activity only for the candidate profiles (not all 50K rows)
    const candidateIds = filteredProfiles.map((p) => p.id);
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("user_id, created_at")
      .in("user_id", candidateIds)
      .gte("created_at", thirtyFiveDaysAgo)
      .order("created_at", { ascending: false })
      .limit(5000);

    // Build map: user_id → last activity date
    const lastActivityMap = new Map<string, Date>();
    for (const row of recentActivity ?? []) {
      if (!lastActivityMap.has(row.user_id)) {
        lastActivityMap.set(row.user_id, new Date(row.created_at));
      }
    }

    // Who to mail is decided by a pure, unit-tested function (./select.ts).
    // Keeping this out of the route is what makes the dedupe testable at all.
    const selections = selectReengagementRecipients({
      candidates: filteredProfiles.map((p) => ({
        userId: p.id,
        lastActiveAt: lastActivityMap.get(p.id) ?? new Date(p.created_at),
      })),
      priorSends: alreadySent ?? [],
      tiers: REENGAGEMENT_TEMPLATES,
      now: Date.now(),
      minGapMs: MIN_GAP_MS,
      maxPerRun: MAX_PER_RUN,
    });
    skipped = filteredProfiles.length - selections.length;

    const profileById = new Map(filteredProfiles.map((p) => [p.id, p]));

    for (const selection of selections) {
      const profile = profileById.get(selection.userId);
      const eligibleTemplate = REENGAGEMENT_TEMPLATES.find((t) => t.id === selection.tierId);
      if (!profile || !eligibleTemplate) continue;

      const daysSinceActive = selection.daysInactive;
      const lastActiveDate = lastActivityMap.get(profile.id) ?? new Date(profile.created_at);
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

    await releaseCronLock("cron:reengagement");
    await recordCronSuccess("reengagement");
    return NextResponse.json({
      sent,
      skipped,
      errors,
      total: filteredProfiles.length,
      excludedActive: recentlyActiveIds.size,
    });
  } catch (err) {
    await releaseCronLock("cron:reengagement");
    logger.error("[Reengagement] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
