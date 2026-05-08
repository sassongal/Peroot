-- Add output_language to history table for analytics and language-aware UX.
-- Default 'hebrew' keeps existing rows valid without backfill.
ALTER TABLE history
  ADD COLUMN IF NOT EXISTS output_language text NOT NULL DEFAULT 'hebrew'
    CHECK (output_language IN ('hebrew', 'english', 'arabic', 'russian'));

-- Index for analytics queries: "how many requests per language per day"
CREATE INDEX IF NOT EXISTS idx_history_output_language
  ON history (output_language, created_at DESC);
