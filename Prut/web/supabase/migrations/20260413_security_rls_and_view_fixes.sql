-- Security Fix: RLS policies and view hardening

-- ============================================================
-- Fix 1: prompt_popularity — drop ALL/public policy
-- The "Enable update for service role" policy name is misleading:
-- it applies to {public} (everyone), letting any user manipulate scores.
-- service_role bypasses RLS by default — no explicit policy needed.
-- ============================================================
DROP POLICY IF EXISTS "Enable update for service role" ON public.prompt_popularity;

-- ============================================================
-- Fix 2: translations — remove permissive authenticated INSERT
-- Any logged-in user could add arbitrary translation keys.
-- Replace with admin-only management policy.
-- ============================================================
DROP POLICY IF EXISTS "Allow insert access for authenticated users only" ON public.translations;
DROP POLICY IF EXISTS "Only admins can manage translations" ON public.translations;

CREATE POLICY "Only admins can manage translations" ON public.translations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- Fix 3: global_leaderboard — SECURITY INVOKER
-- Recreate the view so it runs with the querying user's RLS context,
-- not the view creator's bypass context.
-- ============================================================
DROP VIEW IF EXISTS public.global_leaderboard;

CREATE VIEW public.global_leaderboard
WITH (security_invoker = true)
AS
SELECT
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    s.rank_title,
    s.contribution_score,
    s.total_copies,
    s.total_saves_by_others
FROM public.profiles p
JOIN public.user_stats s ON p.id = s.user_id
WHERE s.is_public = true
ORDER BY s.contribution_score DESC;
