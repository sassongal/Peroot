-- Re-run backfill to catch rows that were added between the first migration
-- and this one (or any future replays where new rows accumulated). Idempotent
-- thanks to the WHERE original_prompt IS NULL guard.
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

-- IDOR defense: Postgres FKs only validate row EXISTENCE, not ownership.
-- Without this RESTRICTIVE policy, an authenticated user could insert a
-- personal_library row claiming source_history_id = <another user's history
-- UUID>. RLS would block reading the linked row, but the dangling reference
-- would pollute data integrity and leak deletion-timing side channels via
-- ON DELETE SET NULL. This policy enforces ownership at write time.
DROP POLICY IF EXISTS "source_history_id ownership" ON personal_library;
CREATE POLICY "source_history_id ownership"
  ON personal_library
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    source_history_id IS NULL
    OR EXISTS (
      SELECT 1 FROM history h
      WHERE h.id = source_history_id
        AND h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    source_history_id IS NULL
    OR EXISTS (
      SELECT 1 FROM history h
      WHERE h.id = source_history_id
        AND h.user_id = auth.uid()
    )
  );
