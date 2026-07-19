-- Remove the dead prompt-popularity mechanism. Nothing ever called the POST
-- increment, so prompt_popularity stayed empty (0 rows) and the client
-- popularityMap was always {}. The endpoint, the map, the "popularity" sort,
-- and the card badge were removed in the same change. No views/FKs depend on
-- the table (verified before drop).
DROP FUNCTION IF EXISTS public.increment_prompt_popularity(prompt_id text, delta integer);
DROP TABLE IF EXISTS public.prompt_popularity;
