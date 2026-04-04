-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for trigram matching on personal_library
CREATE INDEX IF NOT EXISTS idx_personal_lib_title_trgm
  ON personal_library USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_personal_lib_prompt_trgm
  ON personal_library USING GIN (prompt gin_trgm_ops);

-- RPC function for fuzzy search
CREATE OR REPLACE FUNCTION search_personal_library_fuzzy(
  p_user_id UUID,
  p_query TEXT,
  p_folder TEXT DEFAULT NULL,
  p_capability TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'relevance',
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  prompt TEXT,
  prompt_style TEXT,
  category TEXT,
  personal_category TEXT,
  use_case TEXT,
  source TEXT,
  use_count INT,
  capability_mode TEXT,
  tags TEXT[],
  sort_index INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_pinned BOOLEAN,
  success_count INT,
  fail_count INT,
  relevance_score REAL,
  total_count BIGINT
) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- Verify caller can only search their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot search another user''s library';
  END IF;

  -- Set trigram similarity threshold scoped to this transaction only
  SET LOCAL pg_trgm.similarity_threshold = 0.15;

  -- Count total matches first
  SELECT COUNT(*) INTO v_count
  FROM personal_library pl
  WHERE pl.user_id = p_user_id
    AND (
      pl.title % p_query
      OR pl.prompt % p_query
      OR pl.use_case % p_query
    )
    AND (p_folder IS NULL OR p_folder = 'all' OR
         (p_folder = 'pinned' AND pl.is_pinned = true) OR
         (p_folder != 'pinned' AND p_folder != 'favorites' AND pl.personal_category = p_folder))
    AND (p_capability IS NULL OR pl.capability_mode = p_capability);

  RETURN QUERY
  SELECT
    pl.id,
    pl.title,
    pl.prompt,
    pl.prompt_style,
    pl.category,
    pl.personal_category,
    pl.use_case,
    pl.source,
    pl.use_count,
    pl.capability_mode,
    pl.tags,
    pl.sort_index,
    pl.created_at,
    pl.updated_at,
    pl.last_used_at,
    pl.is_pinned,
    pl.success_count,
    pl.fail_count,
    GREATEST(
      similarity(pl.title, p_query),
      similarity(pl.prompt, p_query),
      COALESCE(similarity(pl.use_case, p_query), 0)
    ) AS relevance_score,
    v_count AS total_count
  FROM personal_library pl
  WHERE pl.user_id = p_user_id
    AND (
      pl.title % p_query
      OR pl.prompt % p_query
      OR pl.use_case % p_query
    )
    AND (p_folder IS NULL OR p_folder = 'all' OR
         (p_folder = 'pinned' AND pl.is_pinned = true) OR
         (p_folder != 'pinned' AND p_folder != 'favorites' AND pl.personal_category = p_folder))
    AND (p_capability IS NULL OR pl.capability_mode = p_capability)
  ORDER BY
    pl.is_pinned DESC,
    CASE WHEN p_sort = 'relevance' OR p_sort = 'recent' THEN
      GREATEST(
        similarity(pl.title, p_query),
        similarity(pl.prompt, p_query),
        COALESCE(similarity(pl.use_case, p_query), 0)
      )
    END DESC NULLS LAST,
    pl.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
