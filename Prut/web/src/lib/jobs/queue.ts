import { createClient } from "@/lib/supabase/server";

export type JobType = 'style_analysis' | 'achievement_check';

export interface JobPayload {
  [key: string]: unknown;
  userId?: string;
}

/**
 * Enqueues a background job to be processed by the worker.
 * This ensures tasks like style analysis are persistent and retriable.
 */
export async function enqueueJob(type: JobType, payload: JobPayload) {
  try {
    const supabase = await createClient();
    
    // We use service role bypass if needed, but for now we assume the current context (admin/user)
    // has permission to INSERT via RLS. If 'createClient' is user-scoped, RLS must allow INSERT.
    const { error } = await supabase
      .from('background_jobs')
      .insert({
        type,
        payload,
        status: 'pending'
      });

    if (error) {
      console.error(`[JobQueue] Failed to enqueue ${type}:`, error);
      // Fallback: In critical paths, you might want to throw. 
      // For enhancements, maybe we just log error to not block the user response.
    }
  } catch (err) {
    console.error(`[JobQueue] Unexpected error enqueuing ${type}:`, err);
  }
}
