-- Lock down site_settings writes to admins.
--
-- FOUND LIVE 2026-09-01 by a security review of the guest-access change.
-- The only UPDATE policy on this table was:
--     USING ((SELECT auth.role()) = 'authenticated')
-- with NO `WITH CHECK` clause. `auth.role() = 'authenticated'` is true for
-- every signed-up user, and the admin settings page writes this table
-- straight from the browser with the anon key, so RLS was the only
-- authorization on the write path.
--
-- Blast radius of the hole (all real columns on this table):
--   * daily_free_limit    → any user could grant every free user unlimited
--                           generations (read by refresh_and_decrement_credits)
--   * allow_guest_access  → any user could re-open guest access after the
--                           owner switched it off, defeating the kill switch
--   * maintenance_mode    → any user could take the whole site down (proxy.ts)
--   * default_credits / registration_bonus / max_free_prompts → same class
--
-- Admin membership comes from public.user_roles via the existing is_admin()
-- helper (SECURITY DEFINER, STABLE), which is the canonical admin source per
-- CLAUDE.md. WITH CHECK is mandatory here: an UPDATE policy with only USING
-- gates which rows you may target, not what you may write into them.

DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;

CREATE POLICY "Admins can update site settings"
  ON public.site_settings
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reading stays public: the app reads daily_free_limit / allow_guest_access on
-- anonymous paths. No INSERT or DELETE policy exists, so with RLS enabled both
-- remain denied for anon and authenticated roles (service role bypasses RLS).
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
