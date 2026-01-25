-- ============================================
-- Resilience & Background Jobs Migration
-- ============================================

-- 1. Create table for persistent job queue
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('style_analysis', 'achievement_check')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for finding pending jobs quickly
CREATE INDEX IF NOT EXISTS background_jobs_status_locked_idx 
ON public.background_jobs(status, locked_until) 
WHERE status = 'pending';

-- RLS: Only service role should manage jobs usually, but authenticated users might need to insert?
-- Security-wise: strict RLS. Only admins or service_role can read/process. 
-- Authenticated users can INSERT (so the API can enqueue on their behalf if using user context, though API usually has service key access via admin client or we use SECURITY DEFINER functions).
-- For now, let's allow service_role key to do everything, and block public access.

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.background_jobs;
CREATE POLICY "Service role full access" ON public.background_jobs
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- If you are inserting from RLS-context (client), you might need an INSERT policy.
-- But we plan to enqueue via server actions/API routes which can use service role or admin context.
-- If `enqueueJob` uses `createClient()` (standard user client), we need to allow INSERT.
CREATE POLICY "Auth users can insert jobs" ON public.background_jobs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Function to fetch and lock next job (Atomic Operation)
CREATE OR REPLACE FUNCTION public.fetch_next_job()
RETURNS TABLE (
  j_id UUID,
  j_type TEXT,
  j_payload JSONB,
  j_attempts INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  next_job_id UUID;
BEGIN
  -- Find a pending job that isn't locked (or lock expired)
  SELECT id INTO next_job_id
  FROM public.background_jobs
  WHERE status = 'pending'
    AND (locked_until IS NULL OR locked_until < now())
    AND attempts < 5 -- Max retries
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Non-blocking lock

  IF next_job_id IS NOT NULL THEN
    UPDATE public.background_jobs
    SET status = 'processing',
        locked_until = now() + interval '5 minutes', -- Lock duration
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = next_job_id
    RETURNING id, type, payload, attempts INTO j_id, j_type, j_payload, j_attempts;
    
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$;

-- 3. Enable pg_cron if available (Optional - Comment out if not on Pro plan or local)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('process-jobs-every-minute', '* * * * *', $$
--     SELECT net.http_post(
--         url:='https://your-production-url.com/api/jobs/process',
--         headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb
--     ) as request_id;
-- $$);
