-- 20260408_history_input_source.sql
-- Anchor 4: track WHAT the input was (text/file/url/image), separate from
-- the existing `source` column which tracks WHERE the request came from
-- (web/extension/api). The two are orthogonal — a Chrome extension call
-- with a PDF attachment has source='extension' AND input_source='file'.
--
-- Defaults to 'text' so existing 249 rows stay valid without backfill.
-- CHECK constraint enforces the closed vocabulary; future input types
-- will need a new migration.

ALTER TABLE public.history
  ADD COLUMN IF NOT EXISTS input_source TEXT
    NOT NULL DEFAULT 'text'
    CHECK (input_source IN ('text', 'file', 'url', 'image'));

-- Composite index for the future "filter by input source" admin query.
-- Most queries already filter by user_id + created_at, so we lead with those.
CREATE INDEX IF NOT EXISTS idx_history_user_created_input_source
  ON public.history (user_id, created_at DESC, input_source);
