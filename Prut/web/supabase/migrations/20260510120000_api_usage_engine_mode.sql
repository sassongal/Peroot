-- 20260510120000_api_usage_engine_mode.sql
-- Adds engine_mode column to api_usage_logs for per-mode cost visibility.
-- Existing rows remain NULL (displayed as "Unknown (pre-tracking)" in the dashboard).

ALTER TABLE api_usage_logs
  ADD COLUMN IF NOT EXISTS engine_mode text;

COMMENT ON COLUMN api_usage_logs.engine_mode IS
  'Lowercase capability mode: standard, deep_research, agent_builder, image_generation, video_generation, chain, classify, test';
