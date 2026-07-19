-- Personal Library: add the missing composite index for the default listing.
--
-- The library page always sorts pinned-first, then by the sort key, i.e.
--   WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC
-- (created_at = the "recent"/default sort). No index supported this
-- (idx_personal_lib_user_cat covered category, and was later dropped by the
-- hardening migration), so every default page load sorted the user's rows in
-- memory. This composite index serves the exact ORDER BY.
--
-- Additive + idempotent (IF NOT EXISTS) — safe to re-run; the migrate runner
-- replays every .sql file alphabetically on each deploy.
CREATE INDEX IF NOT EXISTS idx_personal_lib_user_pinned_created
  ON personal_library (user_id, is_pinned DESC, created_at DESC);
