-- Add title column to history table for AI-generated prompt names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'history' AND column_name = 'title'
  ) THEN
    ALTER TABLE history ADD COLUMN title text;
  END IF;
END $$;
