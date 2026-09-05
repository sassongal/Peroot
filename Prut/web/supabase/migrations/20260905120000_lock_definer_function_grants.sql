-- Lock the definer functions that default privileges silently re-exposed.
--
-- Found live by the security advisor on 2026-09-05: `refund_credit` was
-- executable by anon AND authenticated. 20260902120000 locked the definer
-- functions by name, but 20260902130000 then DROP+CREATEd refund_credit with
-- a new signature — and Supabase's ALTER DEFAULT PRIVILEGES grants EXECUTE on
-- every NEW function directly to anon/authenticated. `REVOKE ... FROM PUBLIC`
-- does not touch those direct grants, so the lock evaporated on recreation.
--
-- Impact before this fix: any signed-in user (or anon, with any user id)
-- could call POST /rest/v1/rpc/refund_credit and top their own bonus bucket
-- toward bonus_credits_cap after every spend — unmetered usage.
--
-- Deliberately KEPT executable:
--   is_admin()/is_admin(uuid)      — evaluated inside RLS policies under the
--                                    querying role; revoking breaks reads.
--   increment_shared_prompt_views  — /p/[id] counts anonymous views by design.
--   redeem_referral_code, bump_prompt_last_used, get_library_folder_counts,
--   search_personal_library_fuzzy, get_credit_refresh_at — called with the
--   user's own session client.
--
-- Idempotent.

-- ── The money mover: service role only ──────────────────────────────────────
REVOKE ALL ON FUNCTION public.refund_credit(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credit(uuid, integer, text) TO service_role;

-- ── Referral grant machinery: the jobs worker (service role) only ───────────
REVOKE ALL ON FUNCTION public.grant_referral_bonus(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_referral_bonus(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.process_referral_grants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_grants() TO service_role;

-- ── Achievements were removed (owner decision 2026-09-03); nothing calls it ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'award_achievement') THEN
    REVOKE ALL ON FUNCTION public.award_achievement(uuid, text) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ── Trigger bodies need no RPC grant (PostgreSQL checks EXECUTE at CREATE
--    TRIGGER, not when the trigger fires) ─────────────────────────────────────
REVOKE ALL ON FUNCTION public.protect_profile_credit_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clamp_credits_to_ceiling() FROM PUBLIC, anon, authenticated;

-- ── Stop the recurrence class ───────────────────────────────────────────────
-- New functions no longer inherit EXECUTE for anon/authenticated. This is the
-- repo's documented convention made mechanical: every client-called function
-- must carry its own explicit GRANT in its migration (all current ones do).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
