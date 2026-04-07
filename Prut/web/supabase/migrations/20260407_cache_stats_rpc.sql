-- ============================================
-- get_cache_stats(since_ts) — admin-only aggregation RPC
-- ============================================
-- Replaces the client-side loop in /api/admin/costs/coverage which
-- fetched every api_usage_logs row in the window and iterated in JS.
-- That approach works at 10 req/day but OOMs at 10k/day.
--
-- SECURITY INVOKER (default): the caller's permissions apply, and the
-- RLS policy on api_usage_logs already restricts SELECT to admins via
-- `public.is_admin(auth.uid())`. No need for SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_cache_stats(since_ts TIMESTAMPTZ)
RETURNS TABLE (
    total_requests BIGINT,
    cache_hits BIGINT,
    avg_input_tokens NUMERIC,
    avg_output_tokens NUMERIC
)
LANGUAGE sql
STABLE
-- Pin search_path to prevent search-path injection (Supabase advisor
-- best practice: function_search_path_mutable).
SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::BIGINT AS total_requests,
        COUNT(*) FILTER (WHERE cache_hit = true)::BIGINT AS cache_hits,
        COALESCE(AVG(input_tokens)  FILTER (WHERE cache_hit = false), 0)::NUMERIC AS avg_input_tokens,
        COALESCE(AVG(output_tokens) FILTER (WHERE cache_hit = false), 0)::NUMERIC AS avg_output_tokens
    FROM public.api_usage_logs
    WHERE created_at >= since_ts;
$$;

-- Grant execute to authenticated — RLS on the underlying table still
-- enforces admin-only access, so non-admins will just see zeros.
GRANT EXECUTE ON FUNCTION public.get_cache_stats(TIMESTAMPTZ) TO authenticated;
