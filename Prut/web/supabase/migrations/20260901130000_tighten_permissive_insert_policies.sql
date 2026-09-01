-- Tighten four INSERT policies that accepted anything from any signed-in user.
--
-- Found by auditing for siblings of the site_settings hole (20260901120000):
-- policies whose USING/WITH CHECK is literally `true` or just
-- `auth.role() = 'authenticated'`. Each one below was reachable by any of the
-- registered users with nothing but the anon key and their own JWT.
--
-- Two get REMOVED (every legitimate writer uses the service role, which
-- bypasses RLS, so the policy only ever served attackers) and two get SCOPED
-- to the row's owner (the app writes them with the user's own client).

-- 1. credit_ledger — the credits audit trail.
--    Written only by SECURITY DEFINER functions (admin_change_tier, the credit
--    RPCs), which bypass RLS. The `WITH CHECK (true)` policy let any user
--    forge ledger rows for any account: it does not move a balance (that lives
--    in profiles.credits_balance) but it corrupts the audit trail that
--    /api/me/credits/ledger and the admin analytics read.
DROP POLICY IF EXISTS "Service can insert credit_ledger" ON public.credit_ledger;

-- 2. background_jobs — the worker queue.
--    enqueueJob() uses the service client on purpose (documented in
--    lib/jobs/queue.ts: cron and API-key callers have no cookie session).
--    The authenticated INSERT policy was therefore unused by the app, while
--    letting any user queue `style_analysis` jobs — each one an LLM call
--    billed to us, executed by the worker under the service role, targeting
--    whatever userId the attacker put in the payload.
DROP POLICY IF EXISTS "Auth users can insert jobs" ON public.background_jobs;

-- 3. prompt_usage_events — written by /api/prompt-usage with the USER's client
--    and user_id = auth.uid(). Scope the policy to match, so events cannot be
--    attributed to someone else.
DROP POLICY IF EXISTS "Anyone can log usage events" ON public.prompt_usage_events;
DROP POLICY IF EXISTS "Users log their own usage events" ON public.prompt_usage_events;
CREATE POLICY "Users log their own usage events"
  ON public.prompt_usage_events
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- 4. api_usage_logs — token/cost accounting, written by track-api-usage with
--    the user's client. `WITH CHECK (true)` let any user forge cost rows for
--    any account (or a null account), polluting the admin cost dashboards.
DROP POLICY IF EXISTS "Service role can insert api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Users log their own api usage" ON public.api_usage_logs;
CREATE POLICY "Users log their own api usage"
  ON public.api_usage_logs
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- RLS stays on everywhere; the service role bypasses these policies, so cron,
-- the worker and the SECURITY DEFINER credit functions are unaffected.
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
