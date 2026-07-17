-- ============================================================================
-- Policy dedupe/consolidation + remaining FK indexes (2026-07-17 follow-up)
-- Reduces multiple_permissive_policies advisor findings, behavior-preserving.
--   - Drop 4 exact-duplicate policies (identical cmd/roles/logic, diff names).
--   - Merge 3 same-command SELECT overlaps into one OR'd policy. Postgres
--     already evaluates permissive policies as OR, so a single policy with an
--     explicit OR is semantically identical — no access-logic change.
--   - Add the last 2 unindexed foreign-key indexes.
-- ============================================================================

-- Remaining FK indexes ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id        ON public.user_follows(following_id);

-- Drop exact-duplicate policies (keep the surviving identical one) --------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;        -- keep "Users can read own profile"
DROP POLICY IF EXISTS "Users can update own profile."    ON public.profiles;        -- keep "Users can update their own profile"
DROP POLICY IF EXISTS "Users can insert own favorites"   ON public.prompt_favorites; -- keep "Users can insert their own favorites"
DROP POLICY IF EXISTS "Users can read own roles"         ON public.user_roles;       -- keep "Users can view own roles"

-- Merge activity_logs SELECT (admin-all + own) --------------------------------
DROP POLICY IF EXISTS "Admins can read all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can read own logs"  ON public.activity_logs;
CREATE POLICY "Read own or admin reads all logs" ON public.activity_logs FOR SELECT
  USING (is_admin((select auth.uid())) OR (select auth.uid()) = user_id);

-- Merge prompt_feedback SELECT (service-role + own) ---------------------------
DROP POLICY IF EXISTS "service role reads all"    ON public.prompt_feedback;
DROP POLICY IF EXISTS "users select own feedback" ON public.prompt_feedback;
CREATE POLICY "Read own feedback or service role" ON public.prompt_feedback FOR SELECT
  USING ((select auth.role()) = 'service_role' OR (select auth.uid()) = user_id);

-- Merge referral_codes SELECT (any-authenticated subsumes own) ----------------
DROP POLICY IF EXISTS "Authenticated users can lookup codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can read own referral code"     ON public.referral_codes;
CREATE POLICY "Authenticated can lookup codes" ON public.referral_codes FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);
