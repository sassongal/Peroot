import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { recordCronSuccess } from "@/lib/cron-heartbeat";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 30;

/**
 * Monthly data retention cron.
 * Deletes old log data to prevent unbounded table growth.
 */
export async function GET(request: NextRequest) {
  const authFailure = verifyCronSecret(request);
  if (authFailure) return authFailure;

  const locked = await acquireCronLock("cron:data-retention", 60);
  if (!locked) {
    return NextResponse.json({ skipped: true, reason: "Another instance is running" });
  }

  const supabase = createServiceClient();
  const results: Record<string, number | string> = {};

  try {
    // activity_logs > 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activityDeleted } = await supabase
      .from("activity_logs")
      .delete({ count: "exact" })
      .lt("created_at", ninetyDaysAgo);
    results.activity_logs = activityDeleted ?? 0;

    // api_usage_logs > 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: apiDeleted } = await supabase
      .from("api_usage_logs")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo);
    results.api_usage_logs = apiDeleted ?? 0;

    // background_jobs completed/failed > 30 days
    const { count: jobsDeleted } = await supabase
      .from("background_jobs")
      .delete({ count: "exact" })
      .in("status", ["completed", "failed"])
      .lt("created_at", thirtyDaysAgo);
    results.background_jobs = jobsDeleted ?? 0;

    // webhook_events > 30 days
    const { count: webhooksDeleted } = await supabase
      .from("webhook_events")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo);
    results.webhook_events = webhooksDeleted ?? 0;

    logger.info("[DataRetention] Cleanup complete:", results);
    await releaseCronLock("cron:data-retention");
    await recordCronSuccess("data-retention");
    return NextResponse.json({ success: true, deleted: results });
  } catch (err) {
    await releaseCronLock("cron:data-retention");
    logger.error("[DataRetention] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
