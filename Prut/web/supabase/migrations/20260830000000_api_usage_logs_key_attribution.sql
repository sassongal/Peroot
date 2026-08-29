-- ============================================================================
-- Migration: per-key attribution for API usage (Peroot Connect, Phase 1)
-- Version: 20260830000000_api_usage_logs_key_attribution
-- ============================================================================
--
-- Peroot Connect lets users mint named developer API keys (prk_*). To power the
-- per-key usage view and leaked-key anomaly detection, api_usage_logs rows made
-- through the Developer API / MCP must reference the key that made them.
-- Nullable on purpose: web/extension traffic has no key.
--
-- ON DELETE SET NULL (not CASCADE): revoking/deleting a key must never erase
-- the usage/cost history rows themselves.

ALTER TABLE public.api_usage_logs
  ADD COLUMN IF NOT EXISTS api_key_id uuid
    REFERENCES public.developer_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id
  ON public.api_usage_logs(api_key_id)
  WHERE api_key_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='api_usage_logs' AND column_name='api_key_id';
-- ============================================================================
