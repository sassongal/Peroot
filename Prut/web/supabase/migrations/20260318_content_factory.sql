-- Content Factory: Generation history tracking
CREATE TABLE IF NOT EXISTS content_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('blog', 'prompt')),
  trigger text NOT NULL CHECK (trigger IN ('manual', 'cron', 'preset')),
  topic text,
  template text,
  result_ids uuid[] DEFAULT '{}',
  result_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  cost_tokens integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_content_gen_log_status ON content_generation_log(status);
CREATE INDEX idx_content_gen_log_created ON content_generation_log(created_at DESC);

-- Content Factory: Generation presets
CREATE TABLE IF NOT EXISTS content_factory_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('blog', 'prompt')),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add source_metadata to existing tables (safe IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'public_library_prompts' AND column_name = 'source_metadata'
  ) THEN
    ALTER TABLE public_library_prompts ADD COLUMN source_metadata jsonb DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'source_metadata'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN source_metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- RLS policies
ALTER TABLE content_generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_factory_presets ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "admin_content_gen_log" ON content_generation_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_content_factory_presets" ON content_factory_presets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
