-- Migration: Activity Logs Retention Policy
-- Deletes logs older than 90 days to maintain performance

CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Note: To automate this, you should enable pg_cron in Supabase 
-- and run: SELECT cron.schedule('0 0 * * *', 'SELECT cleanup_old_activity_logs()');
