-- Memory Palace: per-use events on personal_library prompts.
-- Used by computeNeighborhood() to compute 24h co-occurrence between prompts
-- (the 40% half of the similarity score; the other 60% comes from Jaccard on tags/category).
--
-- NOTE: Naming intentionally namespaces under personal_library_* to avoid colliding
-- with the pre-existing public.prompt_usage_events analytics table (different schema,
-- different purpose: that one tracks AI engine invocations, not personal library reuse).

CREATE TABLE IF NOT EXISTS public.personal_library_usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id   uuid NOT NULL REFERENCES public.personal_library(id) ON DELETE CASCADE,
  used_at     timestamptz NOT NULL DEFAULT now(),
  session_id  text,
  source      text NOT NULL CHECK (source IN ('library', 'graph', 'search', 'chain'))
);

-- Hot path: "events for user X in last 90 days, newest first" — drives the API
CREATE INDEX IF NOT EXISTS idx_pl_usage_user_time
  ON public.personal_library_usage_events (user_id, used_at DESC);

-- Co-occurrence joins by prompt_id
CREATE INDEX IF NOT EXISTS idx_pl_usage_prompt
  ON public.personal_library_usage_events (prompt_id);

ALTER TABLE public.personal_library_usage_events ENABLE ROW LEVEL SECURITY;

-- Mirror personal_library's policy shape (separate SELECT and INSERT).
-- No UPDATE/DELETE policies: events are immutable; cleanup is handled by retention jobs.
CREATE POLICY "Users can view their own usage events"
  ON public.personal_library_usage_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own usage events"
  ON public.personal_library_usage_events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Backfill: seed one synthetic event per existing prompt at last_used_at
-- (or created_at as fallback) so the graph has data on day one.
INSERT INTO public.personal_library_usage_events (user_id, prompt_id, used_at, source)
SELECT user_id, id, COALESCE(last_used_at, created_at), 'library'
FROM public.personal_library
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
