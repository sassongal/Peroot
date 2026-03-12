-- Referral system: users get credits for referring friends
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  uses_count int DEFAULT 0,
  max_uses int DEFAULT 50,
  credits_per_referral int DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT referral_codes_user_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_awarded int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT referral_redemptions_user_unique UNIQUE (referred_user_id)
);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY "Users can read own referral code" ON referral_codes
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own referral code
CREATE POLICY "Users can create own referral code" ON referral_codes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Anyone authenticated can read referral codes (to redeem)
CREATE POLICY "Authenticated users can lookup codes" ON referral_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can see their own redemptions
CREATE POLICY "Users can read own redemptions" ON referral_redemptions
  FOR SELECT USING (
    referred_user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM referral_codes WHERE id = code_id AND user_id = auth.uid())
  );

-- RPC to redeem a referral code (atomic)
CREATE OR REPLACE FUNCTION redeem_referral_code(referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_id uuid;
  v_referrer_id uuid;
  v_credits int;
  v_user_id uuid;
  v_existing uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the referral code
  SELECT id, user_id, credits_per_referral INTO v_code_id, v_referrer_id, v_credits
  FROM referral_codes
  WHERE code = referral_code AND uses_count < max_uses;

  IF v_code_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired referral code');
  END IF;

  -- Can't refer yourself
  IF v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
  END IF;

  -- Check if already redeemed
  SELECT id INTO v_existing FROM referral_redemptions WHERE referred_user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already used a referral code');
  END IF;

  -- Record redemption
  INSERT INTO referral_redemptions (code_id, referred_user_id, credits_awarded)
  VALUES (v_code_id, v_user_id, v_credits);

  -- Increment uses
  UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = v_code_id;

  -- Award credits to BOTH referrer and referred user
  UPDATE profiles SET credits_balance = credits_balance + v_credits WHERE id = v_referrer_id;
  UPDATE profiles SET credits_balance = credits_balance + v_credits WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'credits_awarded', v_credits);
END;
$$;
