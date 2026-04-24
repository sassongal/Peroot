-- Rolling 24h credit system + remove registration bonus
-- Replaces the 14:00 IL daily reset with a per-user rolling window from the
-- user's last prompt. Also zeros out site_settings.registration_bonus so new
-- users only receive daily_free_limit credits (no bonus on top).
--
-- Backwards compatibility: existing column credits_refreshed_at is kept for
-- compatibility with legacy reads, but last_prompt_at is the new source of
-- truth for rolling window logic.

-- 1. Add last_prompt_at column -----------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_prompt_at TIMESTAMPTZ;

-- Backfill: use credits_refreshed_at as a reasonable approximation for
-- existing free-tier users. Pro users don't need it (they're on monthly cycle).
UPDATE public.profiles
SET last_prompt_at = credits_refreshed_at
WHERE last_prompt_at IS NULL
  AND credits_refreshed_at IS NOT NULL
  AND plan_tier != 'pro';

-- 2. Zero out the registration bonus -----------------------------------------
UPDATE public.site_settings
SET registration_bonus = 0;

-- 3. Rolling 24h atomic check-and-decrement RPC ------------------------------
-- Matches the function signature expected by src/lib/services/credit-service.ts
-- (target_user_id, amount_to_spend, user_tier).
--
-- Behavior:
--   - For `free` tier: if now() - last_prompt_at >= 24h (or last_prompt_at IS
--     NULL), reset credits_balance to daily_free_limit BEFORE decrementing.
--   - For `pro` / `admin` tiers: decrement directly, no rolling reset.
--   - Always uses SELECT ... FOR UPDATE to prevent race conditions.
--   - On successful spend: updates last_prompt_at = now().
--
-- Returns JSONB:
--   { success: true,  current_balance: <int> }
--   { success: false, error: <string>, current_balance: <int> }
CREATE OR REPLACE FUNCTION public.refresh_and_decrement_credits(
  target_user_id UUID,
  amount_to_spend INTEGER,
  user_tier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_last_prompt TIMESTAMPTZ;
  v_daily_limit INTEGER;
  v_now TIMESTAMPTZ := NOW();
  v_should_reset BOOLEAN := FALSE;
BEGIN
  -- Fetch daily_free_limit from site_settings (single source of truth)
  SELECT daily_free_limit INTO v_daily_limit FROM public.site_settings LIMIT 1;
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  -- Lock the profile row
  SELECT credits_balance, last_prompt_at
    INTO v_balance, v_last_prompt
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found',
      'current_balance', 0
    );
  END IF;

  -- Rolling 24h reset — only for free tier
  IF user_tier = 'free' THEN
    IF v_last_prompt IS NULL OR (v_now - v_last_prompt) >= INTERVAL '24 hours' THEN
      v_should_reset := TRUE;
    END IF;

    IF v_should_reset THEN
      v_balance := v_daily_limit;
    END IF;
  END IF;

  -- Check sufficiency
  IF v_balance < amount_to_spend THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_balance', v_balance
    );
  END IF;

  -- Decrement + update last_prompt_at
  UPDATE public.profiles
  SET credits_balance = v_balance - amount_to_spend,
      last_prompt_at = v_now,
      credits_refreshed_at = CASE WHEN v_should_reset THEN v_now ELSE credits_refreshed_at END,
      updated_at = v_now
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_balance', v_balance - amount_to_spend
  );
END;
$$;

-- Lock down permissions — only service_role may invoke
REVOKE ALL ON FUNCTION public.refresh_and_decrement_credits(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_and_decrement_credits(UUID, INTEGER, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_and_decrement_credits(UUID, INTEGER, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_and_decrement_credits(UUID, INTEGER, TEXT) TO service_role;

-- 4. Helper: get refresh time (when the rolling window will refill) ---------
-- Used by /api/me/quota to show a countdown timer. Returns NULL if the user
-- currently has fresh quota (no timer needed).
CREATE OR REPLACE FUNCTION public.get_credit_refresh_at(target_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_prompt TIMESTAMPTZ;
  v_tier TEXT;
BEGIN
  SELECT last_prompt_at, plan_tier
    INTO v_last_prompt, v_tier
  FROM public.profiles
  WHERE id = target_user_id;

  -- Pro/admin never need a timer
  IF v_tier != 'free' THEN
    RETURN NULL;
  END IF;

  -- No prompt ever run → full quota, no timer
  IF v_last_prompt IS NULL THEN
    RETURN NULL;
  END IF;

  -- Already past the 24h mark → quota is fresh on next prompt, no timer
  IF (NOW() - v_last_prompt) >= INTERVAL '24 hours' THEN
    RETURN NULL;
  END IF;

  RETURN v_last_prompt + INTERVAL '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.get_credit_refresh_at(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_credit_refresh_at(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_credit_refresh_at(UUID) TO authenticated, service_role;
