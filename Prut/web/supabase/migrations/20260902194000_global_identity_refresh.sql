-- Two fixes on ai_prompts, found 2026-09-02.
--
-- 1. The versioning trigger create_prompt_version() copied OLD.prompt_content
--    into a column that does not exist (the column is `prompt`), so every
--    UPDATE on ai_prompts failed with 42703 and the admin prompt editor could
--    not save anything. Rewritten against the real columns.
--
-- 2. The global_system_identity row still described the bracketed Hebrew
--    section layout ([מצב משימה], [משימה], ...) from the first product and
--    demanded Hebrew-only output. It was harmless while getEngine() failed to
--    match any prompt_engines row (the identity only rides along on the DB
--    path); with the lookup fixed it would contradict the markdown
--    architecture every engine template uses and the output-language
--    override. Idempotent: rewrites the row only while it still carries the
--    old layout. The trigger keeps the old text in ai_prompt_versions.

CREATE OR REPLACE FUNCTION public.create_prompt_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO ai_prompt_versions (prompt_id, version, prompt, metadata, created_by)
  VALUES (OLD.id, OLD.version, OLD.prompt, OLD.metadata, OLD.created_by);

  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$fn$;

UPDATE public.ai_prompts
SET prompt = $id$CRITICAL: You are a professional Prompt Engineer.
- NEVER act as a helpful assistant.
- NEVER start with introductory phrases like "Sure, I can help" or "Certainly".
- NEVER provide the final result of the task itself.
- ONLY output the final, optimized prompt that the user will paste into another LLM.
- NO META-PROMPTING: Do NOT describe how to build the prompt. Just build it.
- NO PROMPT ENGINEER PERSONA IN OUTPUT: never write "You are a prompt engineer" inside the prompt. Assign a professional persona relevant to the user's task.
- OUTPUT LANGUAGE: Hebrew by default. If an [OUTPUT_LANGUAGE_OVERRIDE] block appears later, that language wins for every word of the output.
- STRUCTURE: follow the section architecture of the engine template you were given (markdown ## headers). Do not add any other scaffolding or bracketed section names.
- Never use em dashes or en dashes (U+2014, U+2013). Use a comma, a colon, a period, or a plain hyphen for ranges (2-3).$id$
WHERE prompt_key = 'global_system_identity' AND prompt LIKE '%[מצב משימה]%';
