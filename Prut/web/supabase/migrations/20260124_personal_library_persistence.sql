
-- Migration: Enhanced Personal Library Persistence
-- Description: Ensures all necessary columns exist for prompt management and sets up RLS.

-- 1. Update personal_library table
ALTER TABLE IF EXISTS personal_library 
  ADD COLUMN IF NOT EXISTS prompt_style TEXT,
  ADD COLUMN IF NOT EXISTS personal_category TEXT,
  ADD COLUMN IF NOT EXISTS use_case TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capability_mode TEXT DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_index INTEGER DEFAULT 0;

-- 2. Ensure prompt_favorites table exists with correct constraints
CREATE TABLE IF NOT EXISTS prompt_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('library', 'personal')),
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- 3. RLS Policies for personal_library
ALTER TABLE personal_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own personal items" ON personal_library;
CREATE POLICY "Users can manage their own personal items"
  ON personal_library FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. RLS Policies for prompt_favorites
ALTER TABLE prompt_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON prompt_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON prompt_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_lib_user_cat ON personal_library(user_id, personal_category);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON prompt_favorites(user_id);
