-- SECURITY DEFINER functions: stop granting EXECUTE to the world.
--
-- Follow-up to 20260902110000. That migration revoked EXECUTE from `anon` and
-- `authenticated` and it did almost nothing, because the grant these functions
-- actually carried was to PUBLIC (`=X/postgres` in proacl). Revoking a role
-- does not take away a privilege it holds through PUBLIC, so every one of them
-- was still reachable as POST /rest/v1/rpc/<name> with the anon key that ships
-- in the client bundle.
--
-- A SECURITY DEFINER function runs as its owner, so an exposed one is an
-- unaudited hole straight through RLS. The pattern below is: take the blanket
-- grant away, then hand EXECUTE back by name to the roles that genuinely call
-- each function.
--
-- Trigger bodies keep no grant at all. PostgreSQL checks EXECUTE when the
-- trigger is CREATED, not when it fires, so a revoke here cannot break a
-- trigger. Verified after applying: an authenticated insert into
-- personal_library (which fires save_prompt_version and two updated_at
-- triggers) still succeeds.

-- ── Take back the blanket PUBLIC grant ──────────────────────────────────────
REVOKE ALL ON FUNCTION public.award_achievement(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_prompt_last_used(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clamp_credits_to_ceiling() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_ceiling(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_library_folder_counts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_prompt_usage_stats(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_shared_prompt_views(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_user_contribution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_referral_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_prompt_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_personal_library_fuzzy(uuid, text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_user_to_profile() FROM PUBLIC;

-- Also clear the explicit role grants, so the GRANTs below are the whole
-- picture rather than a layer on top of whatever was there.
REVOKE EXECUTE ON FUNCTION public.award_achievement(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_prompt_last_used(text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_ceiling(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_library_folder_counts(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_prompt_usage_stats(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_shared_prompt_views(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_referral_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_prompt_version() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.search_personal_library_fuzzy(uuid, text, text, text, text, integer, integer) FROM anon, authenticated;

-- ── The server always keeps them ────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.award_achievement(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_prompt_last_used(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_ceiling(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_library_folder_counts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_prompt_usage_stats(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_shared_prompt_views(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_user_contribution(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_personal_library_fuzzy(uuid, text, text, text, text, integer, integer) TO service_role;

-- ── Signed-in users: the RPCs the web client actually calls ─────────────────
-- award_achievement       — achievement-tracker.ts, through the cookie client
-- bump_prompt_last_used   — useHistory / usePromptMutations
-- get_library_folder_counts — useLibraryFetch
-- redeem_referral_code    — /api/referral and the auth callback
-- search_personal_library_fuzzy — Connect uses the service client, but the web
--                           library search is expected to move onto it
GRANT EXECUTE ON FUNCTION public.award_achievement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_prompt_last_used(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_library_folder_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_personal_library_fuzzy(uuid, text, text, text, text, integer, integer) TO authenticated;

-- ── Anonymous visitors ──────────────────────────────────────────────────────
-- increment_shared_prompt_views runs on the public /p/[id] page, where the
-- visitor is by definition not signed in.
GRANT EXECUTE ON FUNCTION public.increment_shared_prompt_views(uuid) TO anon, authenticated;

-- is_admin is referenced inside RLS policies on profiles and user_roles, and a
-- policy's function call is checked against the querying role. Without EXECUTE
-- an anonymous SELECT on profiles would raise "permission denied for function"
-- instead of returning no rows.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
