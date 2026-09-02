-- refund_credit: an 'auto' bucket for callers that never saw the charge.
--
-- The Connect timeout path refunds a credit that was charged inside the
-- in-process enhance handler, so it cannot know which bucket paid. 'auto'
-- refunds the daily bucket when it is below its ceiling (the common case, and
-- the only case for a user without a bonus), otherwise a live bonus bucket.
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
  v_daily   INTEGER;
  v_bonus   INTEGER;
  v_until   TIMESTAMPTZ;
BEGIN
  IF amount < 1 OR amount > 1 THEN
    RAISE EXCEPTION 'Refund amount must be exactly 1';
  END IF;

  SELECT plan_tier, credits_balance, bonus_credits, bonus_expires_at
    INTO v_tier, v_daily, v_bonus, v_until
  FROM public.profiles WHERE id = target_user_id;
  v_ceiling := public.credit_ceiling(v_tier);

  IF bucket = 'auto' THEN
    IF v_ceiling IS NULL OR v_daily < v_ceiling THEN
      bucket := 'daily';
    ELSIF v_bonus IS NOT NULL AND v_until IS NOT NULL AND v_until > NOW() THEN
      bucket := 'bonus';
    ELSE
      bucket := 'daily';
    END IF;
  END IF;

  IF bucket = 'bonus' THEN
    SELECT bonus_credits_cap INTO v_cap FROM public.site_settings LIMIT 1;
    UPDATE public.profiles
    SET bonus_credits = LEAST(bonus_credits + amount, COALESCE(v_cap, bonus_credits + amount)),
        bonus_expires_at = CASE
          WHEN bonus_expires_at IS NULL OR bonus_expires_at <= NOW()
            THEN NOW() + make_interval(days => (SELECT referral_bonus_days FROM public.site_settings LIMIT 1))
          ELSE bonus_expires_at
        END
    WHERE id = target_user_id;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET credits_balance = CASE
        WHEN v_ceiling IS NULL THEN credits_balance + amount
        ELSE LEAST(credits_balance + amount, v_ceiling)
      END
  WHERE id = target_user_id;
END;
$function$;
