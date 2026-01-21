-- SQLite schema and FTS5 index for Hebrew prompt search
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  title_he TEXT NOT NULL,
  category TEXT NOT NULL,
  use_case TEXT NOT NULL,
  prompt_he TEXT NOT NULL,
  variables_json TEXT NOT NULL,
  output_format TEXT NOT NULL,
  quality_checks_json TEXT NOT NULL,
  source_json TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS prompts_index USING fts5(
  id UNINDEXED,
  title_he,
  category,
  use_case,
  prompt_he,
  output_format,
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
  INSERT INTO prompts_index(id, title_he, category, use_case, prompt_he, output_format)
  VALUES (new.id, new.title_he, new.category, new.use_case, new.prompt_he, new.output_format);
END;

CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
  DELETE FROM prompts_index WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
  DELETE FROM prompts_index WHERE id = old.id;
  INSERT INTO prompts_index(id, title_he, category, use_case, prompt_he, output_format)
  VALUES (new.id, new.title_he, new.category, new.use_case, new.prompt_he, new.output_format);
END;
