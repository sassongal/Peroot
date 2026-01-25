
-- Migration: Database Schema Standardization
-- Description: Renames locale-specific columns to standard names.
-- Note: These are idempotent - they check if columns exist before renaming.

-- 1. Standardize personal_library (only if old columns exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_library' AND column_name = 'title_he') THEN
        ALTER TABLE public.personal_library RENAME COLUMN title_he TO title;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_library' AND column_name = 'prompt_he') THEN
        ALTER TABLE public.personal_library RENAME COLUMN prompt_he TO prompt;
    END IF;
END $$;

-- 2. Standardize ai_prompts (only if old column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_prompts' AND column_name = 'prompt_content') THEN
        ALTER TABLE public.ai_prompts RENAME COLUMN prompt_content TO prompt;
    END IF;
END $$;
