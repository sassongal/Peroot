-- Forward-link personal_library rows to their source history row.
-- Plus best-effort backfill of original_prompt for legacy rows.

ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS source_history_id uuid
    REFERENCES history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS personal_library_source_history_id_idx
  ON personal_library (source_history_id)
  WHERE source_history_id IS NOT NULL;

-- Backfill: for each personal_library row missing original_prompt,
-- find the most recent history row owned by the same user whose
-- enhanced text exactly matches the saved prompt, and copy both
-- the original text and the source id over. Idempotent due to the
-- WHERE original_prompt IS NULL guard.
WITH matches AS (
  SELECT DISTINCT ON (pl.id)
    pl.id              AS pl_id,
    h.id               AS history_id,
    h.prompt           AS original_text
  FROM personal_library pl
  JOIN history h
    ON h.user_id = pl.user_id
   AND h.enhanced_prompt = pl.prompt
  WHERE pl.original_prompt IS NULL
  ORDER BY pl.id, h.created_at DESC
)
UPDATE personal_library pl
SET
  original_prompt   = m.original_text,
  source_history_id = m.history_id
FROM matches m
WHERE pl.id = m.pl_id
  AND pl.original_prompt IS NULL;
