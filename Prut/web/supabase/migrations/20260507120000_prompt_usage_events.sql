-- Memory Palace: track when prompts are used so we can compute co-occurrence
CREATE TABLE IF NOT EXISTS public.prompt_usage_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id    uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  used_at      timestamptz NOT NULL DEFAULT now(),
  session_id   text,
  source       text NOT NULL CHECK (source IN ('library', 'graph', 'search', 'chain'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_usage_user_time
  ON public.prompt_usage_events (user_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_usage_prompt
  ON public.prompt_usage_events (prompt_id);

ALTER TABLE public.prompt_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own events"
  ON public.prompt_usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own events"
  ON public.prompt_usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Backfill: one synthetic event per existing prompt at last_used_at (or created_at if null)
INSERT INTO public.prompt_usage_events (user_id, prompt_id, used_at, source)
SELECT user_id, id, COALESCE(last_used_at, created_at), 'library'
FROM public.prompts
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
