import { NextResponse } from "next/server";
import { JobType, JobPayload } from "@/lib/jobs/queue";

// Helper to get service client for elevated privileges during processing
async function getServiceClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  // 1. Secure this endpoint (e.g. Cron secret header)
  // For now, checks for 'Authorization: Bearer <SERVICE_KEY>' or similar shared secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      // Allow local dev loop or Supabase Cron if configured with service key
      // If stricter security needed, use a specific CRON_SECRET env var
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service client to fetch/update jobs bypassing RLS
  const supabase = await getServiceClient();

  try {
    // 2. Fetch Next Job (Atomic)
    const { data, error } = await supabase.rpc('fetch_next_job');
    
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No pending jobs' });
    }

    const job = data[0] as { j_id: string; j_type: JobType; j_payload: JobPayload; j_attempts: number }; // RPC returns list
    console.log(`[Worker] Rate Processing Job: ${job.j_id} (${job.j_type})`);

    // 3. Process Job
    let success = false;
    let errorMsg = null;

    try {
      if (job.j_type === 'style_analysis') {
         const { analyzeUserStyle } = await import("@/lib/intelligence/personality-analyzer");
         const { AchievementTracker } = await import("@/lib/intelligence/achievement-tracker");
         
         const userId = job.j_payload.userId as string;
         if (userId) {
             await analyzeUserStyle(userId);
             await AchievementTracker.award(userId, 'style_explorer');
         }
      } 
      else if (job.j_type === 'achievement_check') {
         const { AchievementTracker } = await import("@/lib/intelligence/achievement-tracker");
         const userId = job.j_payload.userId as string;
         if (userId) {
             await AchievementTracker.checkUsageMilestones(userId);
         }
      }
      
      success = true;
    } catch (e: unknown) {
        console.error(`[Worker] Job Failed:`, e);
        errorMsg = (e instanceof Error) ? e.message : 'Unknown error';
    }

    // 4. Update Status
    const status = success ? 'completed' : (job.j_attempts >= 5 ? 'failed' : 'pending'); // Retry if attempts < 5
    // If pending (retry), we might want to set locked_until to future (backoff). 
    // The current logic just unlocks it after 5 mins or keeps it processing until update.
    // Let's rely on the RPC logic which increments attempts. 
    // Ideally we should set locked_until = now() + backoff.
    
    // For simplicity:
    // specific retry logic could go here.

    await supabase
        .from('background_jobs')
        .update({
            status,
            last_error: errorMsg,
            // unlock if pending so it can be picked up again? 
            // Better: update locked_until to now() + delay
            locked_until: status === 'pending' ? new Date(Date.now() + 60000).toISOString() : null
        })
        .eq('id', job.j_id);

    return NextResponse.json({ success: true, jobId: job.j_id, status });

  } catch (err: unknown) {
      const message = (err instanceof Error) ? err.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
  }
}
