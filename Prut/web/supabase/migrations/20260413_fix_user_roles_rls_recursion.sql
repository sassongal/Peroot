-- Fix infinite recursion in user_roles RLS
-- The "Admins can manage roles" policy checks user_roles inside itself → infinite loop.
-- Solution: SECURITY DEFINER function bypasses RLS when checking admin status,
-- breaking the recursion.

-- 1. Create a helper function that checks admin without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Restrict execution: only authenticated users need this
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 2. Rebuild the policy using the function (no more recursion)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.is_admin());
