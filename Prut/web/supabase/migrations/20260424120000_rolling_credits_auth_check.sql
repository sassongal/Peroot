-- Harden get_credit_refresh_at: previously any authenticated user could query
-- another user's last_prompt_at by passing an arbitrary UUID. Add a caller
-- check so only the user themselves or service_role can read the value.

CREATE OR REPLACE FUNCTION public.get_credit_refresh_at(target_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_prompt TIMESTAMPTZ;
  v_tier TEXT;
  v_caller UUID := auth.uid();
  v_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  -- service_role bypasses the caller check; otherwise caller must be the target.
  IF v_role <> 'service_role' AND (v_caller IS NULL OR v_caller <> target_user_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT last_prompt_at, plan_tier
    INTO v_last_prompt, v_tier
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_tier IS DISTINCT FROM 'free' THEN
    RETURN NULL;
  END IF;

  IF v_last_prompt IS NULL THEN
    RETURN NULL;
  END IF;

  IF (NOW() - v_last_prompt) >= INTERVAL '24 hours' THEN
    RETURN NULL;
  END IF;

  RETURN v_last_prompt + INTERVAL '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.get_credit_refresh_at(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_credit_refresh_at(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_credit_refresh_at(UUID) TO authenticated, service_role;
