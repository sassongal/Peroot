-- Feedback: let guests answer, and record WHY a result was rejected.
--
-- Master plan 3.9. Two gaps:
--
--   1. prompt_feedback.user_id was NOT NULL and /api/feedback was withUser
--      without allowGuest, so the people most likely to bounce (guests, who
--      just met the product) had no way to say the result was bad. The plan
--      records three pieces of feedback ever.
--   2. A thumbs-down recorded that something was wrong but not what, which is
--      not enough to tune anything.
--
-- RLS stays closed: no anon INSERT policy is added. Guest rows are written
-- server-side through the route, which is rate limited by IP, so the write
-- path stays controlled rather than becoming an open endpoint.

ALTER TABLE public.prompt_feedback
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.prompt_feedback
  ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN public.prompt_feedback.user_id IS
  'Null for guest feedback. Guest rows are written server-side by /api/feedback (rate limited per IP); there is deliberately no anon INSERT policy.';

COMMENT ON COLUMN public.prompt_feedback.reason IS
  'Why a thumbs-down was given: too_short | too_generic | wrong_language | missed_intent. Null for thumbs-up.';

-- Keep the accepted values honest at the database, not only in the client.
ALTER TABLE public.prompt_feedback
  DROP CONSTRAINT IF EXISTS prompt_feedback_reason_check;
ALTER TABLE public.prompt_feedback
  ADD CONSTRAINT prompt_feedback_reason_check
  CHECK (reason IS NULL OR reason IN ('too_short','too_generic','wrong_language','missed_intent'));

ALTER TABLE public.prompt_feedback ENABLE ROW LEVEL SECURITY;
