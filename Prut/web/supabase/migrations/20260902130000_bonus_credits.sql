-- Referral reward as a second, separate bucket (owner decision, 2026-09-02).
--
-- The daily allowance is a ceiling that resets to the limit every day and can
-- never be lifted: the trigger on profiles clamps it. A referral reward paid
-- into that bucket therefore vanished at the moment it was written, which is
-- why 36 referral codes produced zero redemptions worth anything.
--
-- The reward now lives in its own bucket, `profiles.bonus_credits`:
--   * granted per referred friend (site_settings.referral_bonus_credits),
--   * expires after site_settings.referral_bonus_days (the friend has to use
--     it), a fresh grant extends the whole bucket's expiry,
--   * capped at site_settings.bonus_credits_cap as a safety net,
--   * spent only AFTER the daily allowance is gone,
--   * never touched by the ceiling trigger, never reset by the daily refill.
--
-- A free user with 3 bonus credits sees 5 today (2 + 3); tomorrow 2 again plus
-- whatever bonus is left. The daily bucket never becomes 4.
--
-- Everything is idempotent.

-- ── Columns ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bonus_credits_nonneg;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bonus_credits_nonneg CHECK (bonus_credits >= 0);

COMMENT ON COLUMN public.profiles.bonus_credits IS
  'Referral reward bucket. Spent after the daily allowance, never clamped by credit_ceiling, never reset by the daily refill. Zero once bonus_expires_at has passed.';
COMMENT ON COLUMN public.profiles.bonus_expires_at IS
  'The bonus bucket is worth nothing after this instant. Extended on every grant.';

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS referral_bonus_credits INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS referral_bonus_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS bonus_credits_cap INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS referral_grant_on TEXT NOT NULL DEFAULT 'activation';

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_referral_grant_on_check;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_referral_grant_on_check
  CHECK (referral_grant_on IN ('activation', 'signup'));

COMMENT ON COLUMN public.site_settings.referral_grant_on IS
  'activation: the referrer is rewarded when the referred user makes their first enhancement. signup: at registration. Default activation, because a signup takes ten seconds with a throwaway address.';

ALTER TABLE public.referral_redemptions
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.referral_redemptions.activated_at IS
  'When the referred user made their first enhancement. Set by process_referral_grants().';
COMMENT ON COLUMN public.referral_redemptions.granted_at IS
  'When the referrer received the bonus. NULL means not yet (or never, if the redemption was rejected).';

-- Let the referral columns stay honest about what a redemption is worth.
ALTER TABLE public.referral_codes
  ALTER COLUMN credits_per_referral SET DEFAULT 3;

-- ── Spend: daily first, then bonus ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_and_decrement_credits(
  target_user_id uuid,
  amount_to_spend integer,
  user_tier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance      INTEGER;
  v_bonus        INTEGER;
  v_bonus_until  TIMESTAMPTZ;
  v_last_prompt  TIMESTAMPTZ;
  v_daily_limit  INTEGER;
  v_now          TIMESTAMPTZ := NOW();
  v_should_reset BOOLEAN := FALSE;
  v_charged_from TEXT;
BEGIN
  SELECT daily_free_limit INTO v_daily_limit FROM public.site_settings LIMIT 1;
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  SELECT credits_balance, bonus_credits, bonus_expires_at, last_prompt_at
    INTO v_balance, v_bonus, v_bonus_until, v_last_prompt
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found',
      'current_balance', 0,
      'bonus_credits', 0
    );
  END IF;

  -- An expired bonus is worth nothing. Zero it here so every reader agrees.
  IF v_bonus > 0 AND (v_bonus_until IS NULL OR v_bonus_until <= v_now) THEN
    v_bonus := 0;
    v_bonus_until := NULL;
  END IF;

  -- Daily refill: SET to the limit, never ADD. Unchanged from the quota law.
  IF user_tier = 'free' THEN
    IF v_last_prompt IS NULL OR (v_now - v_last_prompt) >= INTERVAL '24 hours' THEN
      v_should_reset := TRUE;
    END IF;
    IF v_should_reset THEN
      v_balance := v_daily_limit;
    END IF;
  END IF;

  -- Spend order: the daily allowance goes first because it expires tonight;
  -- the bonus is only reached once the daily bucket is empty.
  IF v_balance >= amount_to_spend THEN
    v_balance := v_balance - amount_to_spend;
    v_charged_from := 'daily';
  ELSIF v_bonus >= amount_to_spend THEN
    v_bonus := v_bonus - amount_to_spend;
    v_charged_from := 'bonus';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_balance', v_balance,
      'bonus_credits', v_bonus
    );
  END IF;

  UPDATE public.profiles
  SET credits_balance = v_balance,
      bonus_credits = v_bonus,
      bonus_expires_at = CASE WHEN v_bonus = 0 THEN NULL ELSE v_bonus_until END,
      last_prompt_at = v_now,
      credits_refreshed_at = CASE WHEN v_should_reset THEN v_now ELSE credits_refreshed_at END,
      updated_at = v_now
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_balance', v_balance,
    'bonus_credits', v_bonus,
    'charged_from', v_charged_from
  );
END;
$function$;

-- ── Refund: back to the bucket it came from ──────────────────────────────────
--
-- The old refund always wrote to the daily bucket, where the ceiling (2 for a
-- free user) swallowed any refund of a credit that had actually been spent
-- from the bonus. That would have shown up only for users holding a bonus,
-- which is to say exactly the referrers this feature is meant to reward.
DROP FUNCTION IF EXISTS public.refund_credit(uuid, integer);
CREATE OR REPLACE FUNCTION public.refund_credit(
  target_user_id uuid,
  amount integer DEFAULT 1,
  bucket text DEFAULT 'daily'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ceiling INTEGER;
  v_tier    TEXT;
  v_cap     INTEGER;
BEGIN
  IF amount < 1 OR amount > 1 THEN
    RAISE EXCEPTION 'Refund amount must be exactly 1';
  END IF;

  IF bucket = 'bonus' THEN
    SELECT bonus_credits_cap INTO v_cap FROM public.site_settings LIMIT 1;
    UPDATE public.profiles
    SET bonus_credits = LEAST(bonus_credits + amount, COALESCE(v_cap, bonus_credits + amount)),
        -- A refund cannot revive an expired bucket; if it has no expiry left,
        -- give the refunded credit the standard window so it is usable.
        bonus_expires_at = CASE
          WHEN bonus_expires_at IS NULL OR bonus_expires_at <= NOW()
            THEN NOW() + make_interval(days => (SELECT referral_bonus_days FROM public.site_settings LIMIT 1))
          ELSE bonus_expires_at
        END
    WHERE id = target_user_id;
    RETURN;
  END IF;

  SELECT plan_tier INTO v_tier FROM public.profiles WHERE id = target_user_id;
  v_ceiling := public.credit_ceiling(v_tier);

  UPDATE public.profiles
  SET credits_balance = CASE
        WHEN v_ceiling IS NULL THEN credits_balance + amount
        ELSE LEAST(credits_balance + amount, v_ceiling)
      END
  WHERE id = target_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.refund_credit(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_credit(uuid, integer, text) TO service_role;

-- ── Grant: one bonus per redemption, idempotent ──────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_referral_bonus(p_redemption_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer   UUID;
  v_granted    TIMESTAMPTZ;
  v_amount     INTEGER;
  v_days       INTEGER;
  v_cap        INTEGER;
  v_before     INTEGER;
  v_after      INTEGER;
  v_until      TIMESTAMPTZ;
BEGIN
  SELECT c.user_id, r.granted_at
    INTO v_referrer, v_granted
  FROM public.referral_redemptions r
  JOIN public.referral_codes c ON c.id = r.code_id
  WHERE r.id = p_redemption_id
  FOR UPDATE OF r;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_found');
  END IF;
  IF v_granted IS NOT NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted');
  END IF;

  SELECT referral_bonus_credits, referral_bonus_days, bonus_credits_cap
    INTO v_amount, v_days, v_cap
  FROM public.site_settings LIMIT 1;
  v_amount := COALESCE(v_amount, 3);
  v_days   := COALESCE(v_days, 7);
  v_cap    := COALESCE(v_cap, 50);

  SELECT bonus_credits, bonus_expires_at INTO v_before, v_until
  FROM public.profiles WHERE id = v_referrer FOR UPDATE;

  -- An expired leftover does not carry over.
  IF v_until IS NULL OR v_until <= NOW() THEN
    v_before := 0;
  END IF;

  v_after := LEAST(v_before + v_amount, v_cap);

  UPDATE public.profiles
  SET bonus_credits = v_after,
      -- Every grant gives the whole bucket a fresh window: the simplest rule
      -- that a user can predict ("you have until the 9th").
      bonus_expires_at = NOW() + make_interval(days => v_days),
      updated_at = NOW()
  WHERE id = v_referrer;

  UPDATE public.referral_redemptions
  SET granted_at = NOW(), credits_awarded = v_after - v_before
  WHERE id = p_redemption_id;

  PERFORM public.log_credit_change(v_referrer, v_after - v_before, v_after, 'referral_bonus', 'system');

  RETURN jsonb_build_object('granted', true, 'amount', v_after - v_before, 'bonus_credits', v_after);
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_referral_bonus(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_referral_bonus(uuid) TO service_role;

-- ── Activation sweep: run by the hourly worker ──────────────────────────────
--
-- Marks redemptions as activated once the referred user has made an
-- enhancement, and grants whatever the policy says is due. With
-- referral_grant_on = 'signup' every ungranted redemption is paid at once.
CREATE OR REPLACE FUNCTION public.process_referral_grants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mode      TEXT;
  v_row       RECORD;
  v_activated INTEGER := 0;
  v_granted   INTEGER := 0;
  v_res       JSONB;
BEGIN
  SELECT referral_grant_on INTO v_mode FROM public.site_settings LIMIT 1;
  v_mode := COALESCE(v_mode, 'activation');

  -- Activation: the referred user has at least one enhancement.
  FOR v_row IN
    SELECT r.id
    FROM public.referral_redemptions r
    WHERE r.activated_at IS NULL
      AND EXISTS (SELECT 1 FROM public.history h WHERE h.user_id = r.referred_user_id)
  LOOP
    UPDATE public.referral_redemptions SET activated_at = NOW() WHERE id = v_row.id;
    v_activated := v_activated + 1;
  END LOOP;

  FOR v_row IN
    SELECT r.id
    FROM public.referral_redemptions r
    WHERE r.granted_at IS NULL
      AND (v_mode = 'signup' OR r.activated_at IS NOT NULL)
  LOOP
    v_res := public.grant_referral_bonus(v_row.id);
    IF (v_res->>'granted')::boolean THEN
      v_granted := v_granted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('activated', v_activated, 'granted', v_granted, 'mode', v_mode);
END;
$function$;

REVOKE ALL ON FUNCTION public.process_referral_grants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_referral_grants() TO service_role;

-- ── Redeem: records the redemption, pays nothing itself ─────────────────────
CREATE OR REPLACE FUNCTION public.redeem_referral_code(referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code_id     uuid;
  v_referrer_id uuid;
  v_user_id     uuid;
  v_existing    uuid;
  v_amount      integer;
  v_mode        text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, user_id INTO v_code_id, v_referrer_id
  FROM public.referral_codes
  WHERE code = referral_code AND uses_count < max_uses;

  IF v_code_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired referral code');
  END IF;

  IF v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
  END IF;

  SELECT id INTO v_existing FROM public.referral_redemptions WHERE referred_user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already used a referral code');
  END IF;

  SELECT referral_bonus_credits, referral_grant_on INTO v_amount, v_mode
  FROM public.site_settings LIMIT 1;

  -- credits_awarded records what the referrer stands to receive; it is
  -- rewritten with the actual amount when the grant lands (the cap may bite).
  INSERT INTO public.referral_redemptions (code_id, referred_user_id, credits_awarded)
  VALUES (v_code_id, v_user_id, COALESCE(v_amount, 3));

  UPDATE public.referral_codes SET uses_count = uses_count + 1 WHERE id = v_code_id;

  -- The referrer is paid by process_referral_grants(), once the friend has
  -- actually used the product (or immediately, under 'signup'). Nothing here
  -- touches credits_balance: that bucket is a ceiling and would swallow it.
  RETURN jsonb_build_object(
    'success', true,
    'credits_awarded', 0,
    'referrer_bonus', COALESCE(v_amount, 3),
    'grant_on', COALESCE(v_mode, 'activation')
  );
END;
$function$;
