-- Quota law: guest 1/day, registered free 2/day, both stored as data.
--
-- Plan: docs/plans/2026-09-01-quota-law.md
--
-- Three things were wrong before this:
--   1. daily_free_limit was 1, while the UI promised 2 in three places.
--   2. The guest limit was a compiled-in constant (guest-service.ts), so the
--      owner could not change it without a deploy, unlike every other quota.
--   3. handle_new_user() granted a hardcoded 4 credits, while the two signup
--      routes immediately wrote daily_free_limit on top. What a new user
--      actually ended up with depended on which write landed last.

-- 1. The guest limit becomes data, like the free-tier limit already was.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS guest_daily_limit INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.site_settings.guest_daily_limit IS
  'Enhancements an anonymous visitor gets per rolling 24h window. Read by src/lib/guest-service.ts. Gated by allow_guest_access.';

COMMENT ON COLUMN public.site_settings.daily_free_limit IS
  'Enhancements a registered free user gets per rolling 24h window. Read by refresh_and_decrement_credits() and handle_new_user().';

-- 2. The values themselves. Owner decision 2026-09-01, superseding decision 2
--    of the harmony master plan ("free stays 1/day").
UPDATE public.site_settings
SET guest_daily_limit = 1,
    daily_free_limit  = 2,
    updated_at        = now();

-- 3. Signup grant reads the setting instead of inventing a number.
--    Note this runs as an auth.users trigger, before the app's signup route
--    writes its own value; both now resolve to the same number, so the order
--    they land in stops mattering.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_limit INTEGER;
BEGIN
  SELECT daily_free_limit INTO v_daily_limit FROM public.site_settings LIMIT 1;
  -- Must match QUOTA_FALLBACK.freeDaily in src/lib/quota-policy.ts.
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits_balance)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_daily_limit
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN new;
END;
$function$;

-- RLS is untouched: site_settings keeps public SELECT and the admin-only
-- UPDATE policy from 20260901120000. The new column inherits both.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
