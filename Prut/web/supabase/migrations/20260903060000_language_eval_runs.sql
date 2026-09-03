-- Language evaluation runs (languages spec B6): one row per case per run,
-- written by the weekly cron (service role) and read in the admin "שפות"
-- tab. Admin-only read; nothing here is user data.

CREATE TABLE IF NOT EXISTS public.language_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  case_key text NOT NULL,
  language text NOT NULL CHECK (language IN ('hebrew', 'english', 'arabic', 'russian')),
  engine_mode text NOT NULL,
  model_id text NOT NULL,
  language_ok boolean NOT NULL,
  fluency smallint NOT NULL CHECK (fluency BETWEEN 1 AND 5),
  intent smallint NOT NULL CHECK (intent BETWEEN 1 AND 5),
  structure smallint NOT NULL CHECK (structure BETWEEN 1 AND 5),
  script_share numeric(4,2) NOT NULL,
  dashes integer NOT NULL DEFAULT 0,
  scorer_total smallint NOT NULL,
  output_sample text NOT NULL DEFAULT '',
  judge_notes text NOT NULL DEFAULT '',
  duration_ms integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_language_eval_runs_run ON public.language_eval_runs (run_id, language);
CREATE INDEX IF NOT EXISTS idx_language_eval_runs_ran_at ON public.language_eval_runs (ran_at DESC);

ALTER TABLE public.language_eval_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.language_eval_runs FROM anon;
GRANT SELECT ON public.language_eval_runs TO authenticated;

DROP POLICY IF EXISTS "Admins read language eval runs" ON public.language_eval_runs;
CREATE POLICY "Admins read language eval runs" ON public.language_eval_runs
  FOR SELECT TO authenticated
  USING (public.is_admin());
