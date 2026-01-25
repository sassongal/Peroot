-- Migration: Activity Logs Performance & retention
-- 1. Index for fast user activity lookup
CREATE INDEX IF NOT EXISTS activity_logs_user_id_created_at_idx ON public.activity_logs(user_id, created_at DESC);

-- 2. Index for retention cleanup routines
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs(created_at);

-- 3. Optimization for profiles update tracking
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);
