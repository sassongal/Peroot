-- Credits overhaul: single source of truth from site_settings
-- Adds daily_free_limit and registration_bonus to site_settings
-- These columns may already exist — use IF NOT EXISTS pattern

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'daily_free_limit'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN daily_free_limit integer DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'registration_bonus'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN registration_bonus integer DEFAULT 2;
  END IF;
END $$;

-- Ensure existing row has the correct defaults
UPDATE site_settings
SET daily_free_limit = COALESCE(daily_free_limit, 2),
    registration_bonus = COALESCE(registration_bonus, 2);
