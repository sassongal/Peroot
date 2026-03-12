-- Prompt folders/collections for organizing personal library
CREATE TABLE IF NOT EXISTS prompt_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#f59e0b', -- amber default
  icon text DEFAULT 'folder',
  sort_index int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add folder_id to personal_library
ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES prompt_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE prompt_folders ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own folders
CREATE POLICY "Users can read own folders" ON prompt_folders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own folders" ON prompt_folders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders" ON prompt_folders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own folders" ON prompt_folders
  FOR DELETE USING (user_id = auth.uid());

-- Index for fast folder lookups
CREATE INDEX IF NOT EXISTS idx_prompt_folders_user ON prompt_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_library_folder ON personal_library(folder_id);
