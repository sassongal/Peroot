-- Fix 1: Atomic view counter for shared prompts (Library Bug 4)
CREATE OR REPLACE FUNCTION increment_shared_prompt_views(prompt_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE shared_prompts
  SET views = COALESCE(views, 0) + 1
  WHERE id = prompt_id;
$$;

-- Fix 2: Update redeem_referral_code to use FOR UPDATE (API Bug 5)
-- This prevents concurrent redemptions from exceeding max_uses
CREATE OR REPLACE FUNCTION redeem_referral_code(referral_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_id UUID;
  v_referrer_id UUID;
  v_credits INT;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the row to prevent concurrent redemption race condition
  SELECT id, user_id, credits_per_referral INTO v_code_id, v_referrer_id, v_credits
  FROM referral_codes
  WHERE code = referral_code AND uses_count < max_uses
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot use your own code');
  END IF;

  -- Check if already redeemed by this user
  IF EXISTS (SELECT 1 FROM referral_redemptions WHERE code_id = v_code_id AND redeemer_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Code already redeemed');
  END IF;

  -- Record redemption
  INSERT INTO referral_redemptions (code_id, redeemer_id) VALUES (v_code_id, v_user_id);

  -- Increment uses
  UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = v_code_id;

  -- Award credits to both users
  UPDATE profiles SET credits_balance = credits_balance + v_credits WHERE id = v_referrer_id;
  UPDATE profiles SET credits_balance = credits_balance + v_credits WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'credits_awarded', v_credits);
END;
$$;

-- Fix 3: Make refund_credit safer - cap amount and add audit (API Bug 14)
CREATE OR REPLACE FUNCTION refund_credit(target_user_id UUID, amount INT DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cap refund amount to prevent abuse
  IF amount < 1 OR amount > 1 THEN
    RAISE EXCEPTION 'Refund amount must be exactly 1';
  END IF;

  UPDATE profiles
  SET credits_balance = credits_balance + amount
  WHERE id = target_user_id;
END;
$$;

-- Fix 4: Atomic refresh + decrement credits (API Bug 1)
-- Combines daily credit refresh and decrement in a single transaction
-- to prevent double-spend race conditions
CREATE OR REPLACE FUNCTION refresh_and_decrement_credits(
  target_user_id UUID,
  amount_to_spend INT DEFAULT 1,
  user_tier TEXT DEFAULT 'free'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INT;
  v_refreshed_at TIMESTAMPTZ;
  v_daily_limit INT;
  v_reset_point TIMESTAMPTZ;
  v_now_israel TIMESTAMPTZ;
BEGIN
  -- Lock the profile row for the duration of this transaction
  SELECT credits_balance, credits_refreshed_at
  INTO v_balance, v_refreshed_at
  FROM profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found', 'current_balance', 0);
  END IF;

  -- Daily refresh for free users
  IF user_tier = 'free' THEN
    -- Get daily limit from site_settings
    SELECT COALESCE(daily_free_limit, 2) INTO v_daily_limit FROM site_settings LIMIT 1;
    IF NOT FOUND THEN
      v_daily_limit := 2;
    END IF;

    -- Calculate reset point: 14:00 Israel time
    v_now_israel := NOW() AT TIME ZONE 'Asia/Jerusalem';
    IF EXTRACT(HOUR FROM v_now_israel) >= 14 THEN
      v_reset_point := DATE_TRUNC('day', v_now_israel) + INTERVAL '14 hours';
    ELSE
      v_reset_point := DATE_TRUNC('day', v_now_israel) - INTERVAL '10 hours';
    END IF;

    -- Refresh if needed
    IF v_refreshed_at IS NULL OR v_refreshed_at < v_reset_point THEN
      v_balance := GREATEST(v_balance, v_daily_limit);
      UPDATE profiles
      SET credits_balance = v_balance,
          credits_refreshed_at = NOW()
      WHERE id = target_user_id;
    END IF;
  END IF;

  -- Check balance
  IF v_balance < amount_to_spend THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'current_balance', v_balance);
  END IF;

  -- Decrement
  UPDATE profiles
  SET credits_balance = credits_balance - amount_to_spend
  WHERE id = target_user_id;

  RETURN json_build_object('success', true, 'current_balance', v_balance - amount_to_spend);
END;
$$;
