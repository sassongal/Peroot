-- Add source column to history table (tracks where the enhancement was created: web, extension)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'history' AND column_name = 'source'
  ) THEN
    ALTER TABLE history ADD COLUMN source text DEFAULT 'web';
  END IF;
END $$;
