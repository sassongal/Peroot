-- Add original_prompt to personal_library.
-- Nullable: existing rows have no "before"; card shows no toggle for them.
ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS original_prompt text;
