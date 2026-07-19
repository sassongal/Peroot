-- Lower the registered-free daily credit limit from 2 to 1.
-- site_settings.daily_free_limit is the single source of truth read by the
-- refresh_and_decrement_credits RPC (see 20260424_rolling_credits.sql). This
-- migration keeps fresh installs and the live row in sync at 1.
ALTER TABLE public.site_settings ALTER COLUMN daily_free_limit SET DEFAULT 1;
UPDATE public.site_settings SET daily_free_limit = 1;
