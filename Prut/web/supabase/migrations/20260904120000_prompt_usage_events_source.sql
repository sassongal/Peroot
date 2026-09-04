-- Where a catalogue usage event came from (owner ask 2026-09-04): the three
-- catalogue surfaces (category pages, templates, prompt pages) and the home
-- library modal all wrote identical rows, so nobody could say which one
-- converted. Free text, bounded by the route's schema (<= 40 chars).
ALTER TABLE public.prompt_usage_events
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS prompt_usage_events_source_created_idx
  ON public.prompt_usage_events (source, created_at DESC);

COMMENT ON COLUMN public.prompt_usage_events.source IS
  'Surface the event came from: catalog_category, catalog_index, catalog_detail, templates, or null for older rows.';
