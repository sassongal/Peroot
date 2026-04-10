-- Per-engine usage breakdown for admin Nexus Engines metrics (GET /api/admin/engines)

ALTER TABLE public.api_usage_logs
  ADD COLUMN IF NOT EXISTS engine_mode TEXT;

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_engine_mode_created
  ON public.api_usage_logs (engine_mode, created_at DESC);
