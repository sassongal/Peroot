-- Protect the money columns on profiles from the row owner (review 2026-09-04).
--
-- Three holes closed here, found by the post-merge review of the
-- enhance-prompt-button week:
--
-- 1. "Users can update their own profile" is a whole-row UPDATE policy, and
--    profiles carries plan_tier / credits_balance / bonus_credits. A signed-in
--    user could PATCH /rest/v1/profiles on their own row and set
--    plan_tier='pro' or bonus_credits=99999 directly. The ceiling trigger only
--    watched credits_balance+plan_tier, so bonus_credits had NO upper bound at
--    write time (the cap lives only inside grant_referral_bonus), and a
--    self-set plan_tier='pro' *raised* the ceiling instead of tripping it.
--    Fix: a guard trigger that rejects changes to the protected columns when
--    the writer is the anon/authenticated role. SECURITY DEFINER RPCs, the
--    service client, cron and migrations (no JWT role) are unaffected.
--
-- 2. The ceiling trigger now also watches bonus_credits and clamps it to
--    site_settings.bonus_credits_cap — defence in depth against a buggy
--    service-role writer, mirroring what it already does for the daily bucket.
--
-- 3. refund_credit() hard-rejected any amount != 1, which silently broke the
--    auto-refund for the one route that charges 2 (chain/generate): on any
--    chain failure the withUser refund threw inside the RPC and the user
--    permanently lost 2 credits. The function body already handles arbitrary
--    amounts correctly; only the guard was wrong. Widened to 1..10.
--
-- Everything is idempotent.

-- ── 1. Guard trigger: owner cannot touch the money columns ───────────────────

CREATE OR REPLACE FUNCTION public.protect_profile_credit_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  -- PostgREST requests carry the JWT role; service_role bypasses this guard,
  -- and direct connections (migrations, dashboard SQL) have no claim → NULL.
  v_role := COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );

  IF v_role IN ('anon', 'authenticated') THEN
    IF NEW.plan_tier            IS DISTINCT FROM OLD.plan_tier
       OR NEW.credits_balance      IS DISTINCT FROM OLD.credits_balance
       OR NEW.bonus_credits        IS DISTINCT FROM OLD.bonus_credits
       OR NEW.bonus_expires_at     IS DISTINCT FROM OLD.bonus_expires_at
       OR NEW.credits_refreshed_at IS DISTINCT FROM OLD.credits_refreshed_at
       -- last_prompt_at drives the rolling-24h refill: rewinding it and
       -- enhancing again is an infinite daily reset.
       OR NEW.last_prompt_at       IS DISTINCT FROM OLD.last_prompt_at
       OR NEW.is_banned            IS DISTINCT FROM OLD.is_banned
    THEN
      RAISE EXCEPTION 'protected profile column'
        USING ERRCODE = 'insufficient_privilege',
              HINT = 'plan/credit columns change only through the credit RPCs or the service role';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_profile_credit_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_profile_credit_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_credit_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_credit_columns();

-- ── 2. Ceiling trigger learns about the bonus bucket ─────────────────────────

CREATE OR REPLACE FUNCTION public.clamp_credits_to_ceiling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ceiling INTEGER;
  v_cap     INTEGER;
BEGIN
  -- Fast path: nothing could breach a ceiling — tier unchanged and neither
  -- bucket went up. Spending takes this exit (one profiles UPDATE per enhance).
  IF TG_OP = 'UPDATE'
     AND NEW.plan_tier IS NOT DISTINCT FROM OLD.plan_tier
     AND NEW.credits_balance <= OLD.credits_balance
     AND NEW.bonus_credits <= OLD.bonus_credits THEN
    RETURN NEW;
  END IF;

  v_ceiling := public.credit_ceiling(NEW.plan_tier);

  IF v_ceiling IS NOT NULL AND NEW.credits_balance > v_ceiling THEN
    NEW.credits_balance := v_ceiling;
  END IF;

  -- The bonus bucket has its own cap (site_settings.bonus_credits_cap).
  -- grant_referral_bonus honours it already; this makes the table honour it
  -- for every writer.
  IF NEW.bonus_credits > 0
     AND (TG_OP = 'INSERT' OR NEW.bonus_credits > OLD.bonus_credits) THEN
    SELECT bonus_credits_cap INTO v_cap FROM public.site_settings LIMIT 1;
    IF v_cap IS NOT NULL AND NEW.bonus_credits > v_cap THEN
      NEW.bonus_credits := v_cap;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_clamp_credits_to_ceiling ON public.profiles;
CREATE TRIGGER trg_clamp_credits_to_ceiling
  BEFORE INSERT OR UPDATE OF credits_balance, plan_tier, bonus_credits ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.clamp_credits_to_ceiling();

-- ── 3. refund_credit: widened guard + smarter 'auto' bucket ──────────────────
--
-- Body identical to 20260902150000 except:
--   a. the guard: chain/generate charges 2 and withUser refunds 2 on failure;
--      "exactly 1" made that refund throw and the user permanently lost both
--      credits. Bounded 1..10 (largest legitimate charge today is 2).
--   b. the 'auto' heuristic: a bonus-funded charge happens only when the daily
--      bucket is empty, and spending leaves it empty — but the old rule picked
--      'daily' whenever daily was below its ceiling, i.e. always right after a
--      spend. Bonus-funded refunds therefore never reached the bonus bucket.
--      New rule: live bonus + empty daily → bonus.

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
  v_bonus_live BOOLEAN;
BEGIN
  IF amount < 1 OR amount > 10 THEN
    RAISE EXCEPTION 'Refund amount must be between 1 and 10';
  END IF;

  SELECT plan_tier, credits_balance, bonus_credits, bonus_expires_at
    INTO v_tier, v_daily, v_bonus, v_until
  FROM public.profiles WHERE id = target_user_id;
  v_ceiling := public.credit_ceiling(v_tier);
  v_bonus_live := v_bonus IS NOT NULL AND v_bonus > 0
                  AND v_until IS NOT NULL AND v_until > NOW();

  IF bucket = 'auto' THEN
    IF v_bonus_live AND v_daily = 0 THEN
      -- Bonus pays only once the daily bucket is empty, so an empty daily
      -- bucket next to a live bonus means the charge almost certainly came
      -- from the bonus.
      bucket := 'bonus';
    ELSIF v_ceiling IS NULL OR v_daily < v_ceiling THEN
      bucket := 'daily';
    ELSIF v_bonus_live THEN
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

REVOKE ALL ON FUNCTION public.refund_credit(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_credit(uuid, integer, text) TO service_role;
