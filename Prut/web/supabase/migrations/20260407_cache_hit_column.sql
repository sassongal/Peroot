-- ============================================
-- api_usage_logs: cache_hit column
-- ============================================
-- Tracks whether a given api_usage_logs row was served from the
-- Redis result cache (true) vs a real LLM invocation (false).
-- Enables the admin dashboard to show cache hit rate and tokens saved.

ALTER TABLE public.api_usage_logs
    ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN NOT NULL DEFAULT false;

-- Composite index for the "hit rate per endpoint per day" query
-- used by the CostsTab CacheHitRateCard.
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint_cachehit_created
    ON public.api_usage_logs(endpoint, cache_hit, created_at DESC);
