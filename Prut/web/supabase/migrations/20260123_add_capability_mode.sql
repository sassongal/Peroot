-- ============================================
-- Migration: Add Capability Mode System
-- Version: 20260123_add_capability_mode
-- ============================================

-- 1. Create the ENUM type for capability modes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capability_mode') THEN
    CREATE TYPE capability_mode AS ENUM (
      'STANDARD',
      'DEEP_RESEARCH',
      'IMAGE_GENERATION',
      'AGENT_BUILDER'
    );
  END IF;
END$$;

-- 2. Add capability_mode to history table
ALTER TABLE public.history
ADD COLUMN IF NOT EXISTS capability_mode capability_mode NOT NULL DEFAULT 'STANDARD';

-- 3. Add capability_mode to personal_library table
ALTER TABLE public.personal_library
ADD COLUMN IF NOT EXISTS capability_mode capability_mode NOT NULL DEFAULT 'STANDARD';

-- 4. Add mode_params JSONB for mode-specific configuration
-- This stores aspect_ratio/style for IMAGE_GENERATION, system_instructions for AGENT_BUILDER
ALTER TABLE public.personal_library
ADD COLUMN IF NOT EXISTS mode_params JSONB;

-- 5. Create indexes for fast capability mode filtering
CREATE INDEX IF NOT EXISTS history_capability_mode_idx 
  ON public.history(capability_mode);

CREATE INDEX IF NOT EXISTS personal_library_capability_mode_idx 
  ON public.personal_library(capability_mode);

CREATE INDEX IF NOT EXISTS personal_library_user_capability_idx 
  ON public.personal_library(user_id, capability_mode);

-- 6. All existing records automatically get 'STANDARD' via DEFAULT clause
-- No explicit data migration needed

-- ============================================
-- VERIFICATION QUERIES (run after migration):
-- ============================================
-- SELECT * FROM pg_type WHERE typname = 'capability_mode';
-- 
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'history' AND column_name = 'capability_mode';
-- 
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'personal_library' AND column_name IN ('capability_mode', 'mode_params');
-- 
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('history', 'personal_library') 
-- AND indexname LIKE '%capability%';
