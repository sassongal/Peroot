import { NextResponse } from "next/server";
import { JobType, JobPayload } from "@/lib/jobs/queue";
import { logger } from "@/lib/logger";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/jobs/process — the background-jobs worker (cron, hourly).
 *
 * Time-budgeted batch: processes jobs until the queue is empty or ~45s have
 * elapsed (maxDuration 60 leaves headroom). The previous version processed a
 * SINGLE job per invocation and — because no cron ever called this route —
 * the queue silently accumulated 1,000+ pending jobs and user_style_personality
 * stayed empty. The cron entry lives in vercel.json; Vercel sends
 * `Authorization: Bearer CRON_SECRET` automatically.
 */
export const maxDuration = 60;

const TIME_BUDGET_MS = 45_000;
const MAX_JOBS_PER_RUN = 100;
const MAX_ATTEMPTS = 5;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = Date.now();
  let processed = 0;
  let completed = 0;
  let failed = 0;

  try {
    while (processed < MAX_JOBS_PER_RUN && Date.now() - startedAt < TIME_BUDGET_MS) {
      // Atomic claim of the next pending job
      const { data, error } = await supabase.rpc("fetch_next_job");
      if (error) throw error;
      if (!data || data.length === 0) break; // queue drained

      const job = data[0] as {
        j_id: string;
        j_type: JobType;
        j_payload: JobPayload;
        j_attempts: number;
      };
      processed++;

      let success = false;
      let errorMsg: string | null = null;
      try {
        const userId = job.j_payload.userId as string | undefined;
        if (job.j_type === "style_analysis") {
          const { analyzeUserStyle } = await import("@/lib/intelligence/personality-analyzer");
          const { AchievementTracker } = await import("@/lib/intelligence/achievement-tracker");
          if (userId) {
            await analyzeUserStyle(userId);
            await AchievementTracker.award(userId, "style_explorer");
          }
        } else if (job.j_type === "achievement_check") {
          const { AchievementTracker } = await import("@/lib/intelligence/achievement-tracker");
          if (userId) {
            await AchievementTracker.checkAll(userId);
          }
        }
        success = true;
      } catch (e: unknown) {
        logger.error(`[Worker] Job ${job.j_id} (${job.j_type}) failed:`, e);
        errorMsg = e instanceof Error ? e.message : "Unknown error";
      }

      // Exponential backoff on retry: 60s * 2^attempts, capped at 1h
      const status = success ? "completed" : job.j_attempts >= MAX_ATTEMPTS ? "failed" : "pending";
      const backoffMs =
        status === "pending" ? Math.min(60_000 * Math.pow(2, job.j_attempts), 3_600_000) : 0;

      await supabase
        .from("background_jobs")
        .update({
          status,
          last_error: errorMsg,
          locked_until:
            status === "pending" ? new Date(Date.now() + backoffMs).toISOString() : null,
        })
        .eq("id", job.j_id);

      if (success) completed++;
      else failed++;
    }

    logger.info(`[Worker] Run done: ${processed} processed (${completed} ok, ${failed} failed)`);
    return NextResponse.json({ processed, completed, failed, ms: Date.now() - startedAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message, processed, completed, failed }, { status: 500 });
  }
}
