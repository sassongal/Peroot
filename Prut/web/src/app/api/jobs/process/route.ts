import { NextResponse } from "next/server";
import { JobType, JobPayload, enqueueJob } from "@/lib/jobs/queue";
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

  // Referral rewards are paid here, not at redemption: the referrer gets the
  // bonus once the friend has actually made an enhancement (or at signup,
  // if site_settings.referral_grant_on says so). One sweep per run, before
  // the queue, so a slow queue never starves it. Failure is logged and does
  // not stop the queue: the next hourly run tries again.
  try {
    const { data: sweep, error: sweepErr } = await supabase.rpc("process_referral_grants");
    if (sweepErr) logger.error("[Worker] referral sweep failed:", sweepErr);
    else if (sweep && (sweep.granted > 0 || sweep.activated > 0)) {
      logger.info("[Worker] referral sweep:", sweep);
    }
  } catch (e) {
    logger.error("[Worker] referral sweep threw:", e);
  }

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
        // Both handlers get the worker's service client — in cron context the
        // SSR cookie client has no auth.uid(), so RLS silently empties every
        // read (the bug that left user_style_personality at 0 while jobs
        // "completed").
        if (job.j_type === "style_analysis") {
          const { analyzeUserStyle } = await import("@/lib/intelligence/personality-analyzer");
          if (userId) await analyzeUserStyle(userId);
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

    // Housekeeping while we're here (hourly): purge OAuth tokens that expired
    // over 7 days ago — refresh rotation only flags rows revoked, so without
    // this the table grows forever.
    const { error: purgeError } = await supabase
      .from("oauth_tokens")
      .delete()
      .lt("expires_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (purgeError) logger.warn("[Worker] oauth_tokens purge failed:", purgeError.message);

    logger.info(`[Worker] Run done: ${processed} processed (${completed} ok, ${failed} failed)`);
    return NextResponse.json({ processed, completed, failed, ms: Date.now() - startedAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message, processed, completed, failed }, { status: 500 });
  }
}
