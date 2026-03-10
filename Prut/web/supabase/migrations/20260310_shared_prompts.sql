-- Shared prompts table for public sharing
CREATE TABLE IF NOT EXISTS shared_prompts (
  id text PRIMARY KEY DEFAULT substr(md5(random()::text), 1, 8),
  prompt text NOT NULL,
  original_input text,
  category text DEFAULT 'General',
  capability_mode text DEFAULT 'STANDARD',
  created_at timestamptz DEFAULT now(),
  views integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Allow anyone to read shared prompts
ALTER TABLE shared_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared prompts are viewable by anyone" ON shared_prompts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create shared prompts" ON shared_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_shared_prompts_id ON shared_prompts(id);
