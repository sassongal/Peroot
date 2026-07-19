-- Fold the four virtual-folder counts (all/pinned/templates/favorites) INTO the
-- existing category-counts RPC, so the library needs ONE round-trip per refresh
-- instead of 1 RPC + 4 separate COUNT queries (which ran on init AND every mutation).
CREATE OR REPLACE FUNCTION public.get_library_folder_counts(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  category_counts jsonb;
  v_all int;
  v_pinned int;
  v_templates int;
  v_favorites int;
BEGIN
  SELECT COALESCE(jsonb_object_agg(cat, cnt), '{}'::jsonb)
  INTO category_counts
  FROM (
    SELECT COALESCE(personal_category, 'כללי') AS cat, COUNT(*) AS cnt
    FROM personal_library
    WHERE user_id = p_user_id
    GROUP BY COALESCE(personal_category, 'כללי')
  ) fc;

  SELECT COUNT(*) INTO v_all       FROM personal_library WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_pinned    FROM personal_library WHERE user_id = p_user_id AND is_pinned = true;
  SELECT COUNT(*) INTO v_templates FROM personal_library WHERE user_id = p_user_id AND is_template = true;
  SELECT COUNT(*) INTO v_favorites FROM prompt_favorites WHERE user_id = p_user_id AND item_type = 'personal';

  -- Virtual-folder keys go LAST so they win over any same-named user category
  -- (mirrors the old JS which set counts["all"] etc. after spreading categories).
  RETURN (category_counts || jsonb_build_object(
    'all', v_all, 'pinned', v_pinned, 'templates', v_templates, 'favorites', v_favorites
  ))::json;
END;
$function$;

-- idx_favorites_user(user_id) is redundant: the PK prompt_favorites_pkey
-- (user_id, item_type, item_id) already serves every user_id-prefixed lookup.
DROP INDEX IF EXISTS public.idx_favorites_user;
