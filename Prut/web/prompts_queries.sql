-- Full-text search across prompts
SELECT id, title_he, category,
       snippet(prompts_index, 3, "[", "]", "…", 10) AS snippet
FROM prompts_index
WHERE prompts_index MATCH :query
ORDER BY bm25(prompts_index)
LIMIT 20;

-- Filtered search by category
SELECT p.id, p.title_he, p.use_case
FROM prompts p
JOIN prompts_index ON prompts_index.id = p.id
WHERE prompts_index MATCH :query AND p.category = :category
ORDER BY bm25(prompts_index)
LIMIT 20;
