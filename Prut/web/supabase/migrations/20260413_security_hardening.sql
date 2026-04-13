-- Security Hardening Migration
-- Fix 1: Restrict SECURITY DEFINER credit RPCs to service_role only
-- Fix 2: Remove user_roles bootstrap clause that allows any authenticated user
--        to grant themselves admin when the table is empty

-- ============================================================
-- Fix 1: Credit RPC permissions
-- Both functions are SECURITY DEFINER and were callable by anon/authenticated
-- via the public anon key. Restrict to service_role (called from API routes only).
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.refund_credit(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credit(UUID, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_and_decrement_credits(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_decrement_credits(UUID, INTEGER) TO service_role;

-- ============================================================
-- Fix 2: user_roles RLS — remove bootstrap clause
-- The "count(*) = 0" branch allowed any authenticated user to INSERT
-- themselves as admin whenever the table was empty (reset, staging, etc.).
-- Initial admin setup must be done via the Supabase dashboard SQL editor.
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
