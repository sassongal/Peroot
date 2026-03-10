-- Credit refresh support and display name column
-- credits_refreshed_at: tracks the last time free-tier credits were reset to daily allowance
-- display_name: user-facing display name for profile features

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_refreshed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
