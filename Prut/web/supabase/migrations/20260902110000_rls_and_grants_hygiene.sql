-- Platform hygiene: close a profile leak, drop policies that duplicate each
-- other, and stop exposing internal functions to the public API.
--
-- Master plan step 6. Everything here is idempotent.

-- ── 1. profiles was world readable ──────────────────────────────────────────
--
-- `Public profiles are viewable by everyone.` was `USING (true)` for role
-- `public`, which includes `anon`. The anon key ships in the client bundle, so
-- anyone could GET /rest/v1/profiles?select=* and receive every user's email
-- address, full name, plan tier and credit balance. Verified live before this
-- migration: the first two rows came back with real addresses.
--
-- Nothing in the app relies on reading someone else's profile. Every non-admin
-- read in the codebase is `.eq("id", user.id)`, and the admin routes go
-- through the service client. The two remaining SELECT policies (own profile,
-- and admins) cover all of it.
--
-- One consequence to know: the `global_leaderboard` view is security_invoker
-- and joins profiles for a display name, so it now returns nothing to anon. No
-- code reads that view. If a leaderboard is ever built, it needs a definer
-- view over whitelisted columns, not a blanket read on the profile table.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- ── 2. Policies that duplicate an existing FOR ALL policy ────────────────────
--
-- Each of these is fully contained in a `FOR ALL` policy on the same table with
-- the identical `auth.uid() = user_id` predicate, so dropping it changes no
-- access at all; it only stops Postgres evaluating two identical predicates per
-- row. This is the bulk of the 114 multiple_permissive_policies warnings.
--
-- The admin-plus-public-read pairs (blog_posts, translations, prompt_engines,
-- library_categories, public_library_prompts, user_stats, user_follows,
-- user_roles) are deliberately left alone: those two policies say different
-- things, and merging them would change who can read what.
DROP POLICY IF EXISTS "Users can insert their own personal prompts" ON public.personal_library;
DROP POLICY IF EXISTS "Users can view their own personal prompts" ON public.personal_library;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.prompt_favorites;
DROP POLICY IF EXISTS "Users can insert their own presets" ON public.variable_presets;

-- ── 3. auth.<fn>() re-evaluated per row ─────────────────────────────────────
--
-- Wrapping the call in a scalar subquery lets the planner evaluate it once for
-- the statement instead of once per row. Same predicate, same access.
DROP POLICY IF EXISTS "oauth_tokens_select_own" ON public.oauth_tokens;
CREATE POLICY "oauth_tokens_select_own" ON public.oauth_tokens
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "oauth_tokens_delete_own" ON public.oauth_tokens;
CREATE POLICY "oauth_tokens_delete_own" ON public.oauth_tokens
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role full access on email_logs" ON public.email_logs;
CREATE POLICY "Service role full access on email_logs" ON public.email_logs
  FOR ALL USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ── 4. RLS on, no policy at all ─────────────────────────────────────────────
--
-- Both tables are written only by the server through the service client, which
-- bypasses RLS. With RLS enabled and no policy the effective rule is already
-- "deny everything to clients", so these policies do not change behaviour:
-- they state the intent explicitly, so the next reader does not have to work
-- out whether the missing policy was deliberate or forgotten.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'extension_telemetry_events'
      AND policyname = 'No client access to extension telemetry'
  ) THEN
    CREATE POLICY "No client access to extension telemetry"
      ON public.extension_telemetry_events FOR SELECT USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'oauth_clients'
      AND policyname = 'No client access to oauth clients'
  ) THEN
    CREATE POLICY "No client access to oauth clients"
      ON public.oauth_clients FOR SELECT USING (false);
  END IF;
END $$;

-- ── 5. Internal functions were callable over the public API ─────────────────
--
-- Every SECURITY DEFINER function was executable by `anon` and `authenticated`,
-- which for PostgREST means callable as POST /rest/v1/rpc/<name>. The ones
-- below are trigger bodies or server-side helpers that no client should reach.
-- Revoking EXECUTE does not affect triggers: a trigger function runs as part
-- of the statement that fired it, not as the caller.
--
-- `award_achievement` keeps `authenticated`, because the web routes call it
-- through the cookie client. Its `target_user_id` argument means a signed-in
-- user can award an achievement to somebody else; that is a signature change,
-- not a grant change, so it is left for its own pass.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_to_profile() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clamp_credits_to_ceiling() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_profile_mismatch_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_user_contribution(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_achievement(uuid, text) FROM anon;
