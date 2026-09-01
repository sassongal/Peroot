-- Credits do not accrue: a hard ceiling per tier.
--
-- Owner decision 2026-09-01: "maximum 2, no accumulation. Someone who does not
-- use their quota does not bank it."
--
-- WHAT WAS ALREADY TRUE: unused days never banked. The rolling reset in
-- refresh_and_decrement_credits does `v_balance := v_daily_limit` — a SET, not
-- an increment — so idling for ten days still leaves you with one day's quota.
--
-- WHAT WAS MISSING: a ceiling. Nothing stopped a balance from going ABOVE the
-- limit, and several paths did exactly that:
--   * registration_bonus, the old handle_new_user hardcode of 4 (fixed in
--     20260901140000) — 33 free users still sit at exactly 4, never having
--     spent it
--   * refund_credit, `credits_balance + amount` with no cap, so refunds inside
--     a window could lift a free user past the limit
--   * admin_grant (+30 once, in April) — one free user sits at 32
--   * redeem_referral_code, +5 to both parties, uncapped (dormant: zero
--     referral rows in credit_ledger, so nothing live depends on it)
--
-- Those balances self-corrected only on the next enhance after a 24h gap, so
-- in the meantime the UI showed a number the policy did not actually grant.
-- This makes the ceiling explicit and continuous instead of eventual.

-- 1. The PRO allowance becomes data too, so every tier's ceiling has one home.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS pro_monthly_credits INTEGER NOT NULL DEFAULT 150;

COMMENT ON COLUMN public.site_settings.pro_monthly_credits IS
  'PRO allowance per LemonSqueezy billing month. Mirrors PRO_MONTHLY_CREDITS in src/lib/quota-policy.ts.';

-- 2. One place that answers "what is the most this tier may hold?".
--    NULL means unbounded (admins are unmetered, daily_limit -1 in the UI).
CREATE OR REPLACE FUNCTION public.credit_ceiling(p_tier text)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(coalesce(p_tier, 'free'))
    WHEN 'admin' THEN NULL
    WHEN 'pro'   THEN (SELECT pro_monthly_credits FROM public.site_settings LIMIT 1)
    ELSE              (SELECT daily_free_limit    FROM public.site_settings LIMIT 1)
  END;
$function$;

-- 3. The law itself: no row may hold more than its tier's ceiling, whichever
--    function did the writing. A trigger rather than a CHECK constraint
--    because the ceiling is data (site_settings), not a literal, and because
--    clamping is friendlier than rejecting: a legitimate refund on a full
--    balance should be a no-op, not a failed request.
CREATE OR REPLACE FUNCTION public.clamp_credits_to_ceiling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ceiling INTEGER;
BEGIN
  -- Skip the lookup only when nothing could possibly breach a ceiling: the
  -- tier is unchanged AND the balance did not go up. Spending is the hot path
  -- (one profiles UPDATE per enhance) and takes this exit.
  --
  -- The tier check is load-bearing, not defensive: a PRO user churning to free
  -- is a plan_tier change that may not touch credits_balance in the same write,
  -- and without this they would keep a 149-credit balance on the free tier.
  IF TG_OP = 'UPDATE'
     AND NEW.plan_tier IS NOT DISTINCT FROM OLD.plan_tier
     AND NEW.credits_balance <= OLD.credits_balance THEN
    RETURN NEW;
  END IF;

  v_ceiling := public.credit_ceiling(NEW.plan_tier);

  IF v_ceiling IS NOT NULL AND NEW.credits_balance > v_ceiling THEN
    NEW.credits_balance := v_ceiling;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_clamp_credits_to_ceiling ON public.profiles;
CREATE TRIGGER trg_clamp_credits_to_ceiling
  BEFORE INSERT OR UPDATE OF credits_balance, plan_tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.clamp_credits_to_ceiling();

-- 4. Defence in depth: cap the refund at the source too, so the ledger and the
--    balance agree instead of the ledger recording a grant the trigger silently
--    trimmed.
CREATE OR REPLACE FUNCTION public.refund_credit(target_user_id uuid, amount integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ceiling INTEGER;
  v_tier    TEXT;
BEGIN
  IF amount < 1 OR amount > 1 THEN
    RAISE EXCEPTION 'Refund amount must be exactly 1';
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

-- 5. Bring the existing over-ceiling balances down. These are the legacy
--    registration bonus (33 users at 4), refund drift (17 at 3) and one April
--    admin grant (1 at 32). Every one of them would have collapsed to the limit
--    on its next enhance anyway; this just stops the UI promising a number the
--    user was never going to get.
UPDATE public.profiles p
SET credits_balance = public.credit_ceiling(p.plan_tier),
    updated_at = now()
WHERE public.credit_ceiling(p.plan_tier) IS NOT NULL
  AND p.credits_balance > public.credit_ceiling(p.plan_tier);

-- RLS untouched. profiles keeps its existing policies; this trigger runs
-- inside whatever transaction already had permission to write the row.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
