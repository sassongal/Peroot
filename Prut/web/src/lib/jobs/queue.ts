import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export type JobType = "style_analysis";

export interface JobPayload {
  [key: string]: unknown;
  userId?: string;
}

/**
 * Enqueues a background job for the worker (/api/jobs/process, hourly cron).
 *
 * Uses the SERVICE client on purpose: enqueue runs inside `after()` on the
 * enhance path, where API-key (prk_) and extension callers have no cookie
 * session — the previous SSR-client version silently failed RLS for them.
 *
 * Dedupe: if a pending job of the same type already exists for this user, we
 * skip the insert. Both job types are per-user idempotent ("analyze user X",
 * "analyze user X's style"), so one pending job is always enough — this
 * is what previously let 1,000+ duplicates pile up.
 */
export async function enqueueJob(type: JobType, payload: JobPayload) {
  try {
    const supabase = createServiceClient();

    if (payload.userId) {
      const { data: existing } = await supabase
        .from("background_jobs")
        .select("id")
        .eq("type", type)
        .eq("status", "pending")
        .eq("payload->>userId", payload.userId)
        .limit(1)
        .maybeSingle();
      if (existing) return; // already queued — nothing to add
    }

    const { error } = await supabase.from("background_jobs").insert({
      type,
      payload,
      status: "pending",
    });

    if (error) {
      logger.error(`[JobQueue] Failed to enqueue ${type}:`, error);
    }
  } catch (err) {
    logger.error(`[JobQueue] Unexpected error enqueuing ${type}:`, err);
  }
}
