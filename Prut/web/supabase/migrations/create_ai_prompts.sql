-- Migration: Create AI Prompts Versioning System
-- Description: Stores AI prompts with versioning, allowing updates without redeployment

-- Table: ai_prompts (Active prompts)
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ai_prompt_versions (History)
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompts_key_active ON ai_prompts(prompt_key, is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON ai_prompt_versions(prompt_id);

-- RLS Policies
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active prompts (needed for API)
CREATE POLICY "Anyone can read active prompts"
  ON ai_prompts FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can read versions
CREATE POLICY "Authenticated users can read versions"
  ON ai_prompt_versions FOR SELECT
  USING (auth.role() = 'authenticated');

-- TODO: Add admin policies once admin_users table is created
-- For now, use service role for updates

-- Function: Auto-create version on update
CREATE OR REPLACE FUNCTION create_prompt_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert old version into history
  INSERT INTO ai_prompt_versions (prompt_id, version, prompt, metadata, created_by)
  VALUES (OLD.id, OLD.version, OLD.prompt, OLD.metadata, OLD.created_by);
  
  -- Increment version
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Version on update
DROP TRIGGER IF EXISTS trigger_create_prompt_version ON ai_prompts;
CREATE TRIGGER trigger_create_prompt_version
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW
  WHEN (OLD.prompt IS DISTINCT FROM NEW.prompt)
  EXECUTE FUNCTION create_prompt_version();

-- Seed initial prompts (from existing code)
INSERT INTO ai_prompts (prompt_key, prompt, version, metadata) VALUES
(
  'prompt_generator_v1',
  'Role: Senior Prompt Engineer & Product Writer
Goal: Convert a rough prompt into a clear, high-quality "Great Prompt" with depth and practical detail.

Current Task Configuration:
- Language: {{language}}. Keep responses concise and practical.
- Tone: {{tone}}.
- Category: {{category}}. (Valid: General, Marketing, Sales, Social, CustomerSupport, Product, Operations, HR, Dev, Education, Legal, Creative, Finance, Healthcare, Ecommerce, RealEstate, Strategy, Design, Data, Automation, Community, Nonprofit).
- Context Hint: {{template_hint}}

Great Prompt structure (Markdown):
Format the output as a professionally styled prompt ready for immediate use:

1. **Section Headings**: Use yellow-styled headings in square brackets format:
   - [מצב משימה] or [Situation]
   - [משימה] or [Task]
   - [מטרה] or [Objective]
   - [ידע נדרש] or [Knowledge]
   - [מגבלות] or [Constraints]

2. **Variables**: Mark all variables with curly braces and ENGLISH names (e.g. {product_name}).

3. **Style**: Use bullet points and clean spacing.

Output format (JSON):
{
  "great_prompt": "...",
  "category": "..."
}

Rules:
- Return ONLY valid JSON.
- Prefer actionable steps and organized sub-bullets.
- Do not mention internal frameworks.',
  1,
  '{"type": "system", "model": "gemini", "supports_variables": true}'
),
(
  'questions_generator_v1',
  'Role: Senior Prompt Engineer (Strategy Specialist)
Goal: Identify EXACTLY 3 missing details that would significantly improve the user''s prompt.

Current Task Configuration:
- Language: {{language}}.
- Detected Missing Areas: {{missing_info}}

Instructions:
1. Analyze the input prompt.
2. Generate exactly 3 distinct clarifying questions.
3. If "Detected Missing Areas" is "ללא" (None) and the prompt seems complete, return an empty array.

Question Types:
- Question 1 (Strategy/Goal): Core objective or audience.
- Question 2 (Content/Style): Tone, format, specific requirements.
- Question 3 (Missing Details): Constraints or key missing info.

Output format (JSON):
{
  "clarifying_questions": [
    { "id": 1, "question": "...", "description": "...", "examples": ["...", "...", "..."] }
  ]
}

Rules:
- Questions must be short, specific, and directly fill a gap.
- Provide 3 short examples for each question.
- Return ONLY valid JSON.',
  1,
  '{"type": "system", "model": "gemini", "supports_variables": true}'
),
(
  'fallback_prompt_v1',
  'Role: Senior Prompt Engineer. 
Goal: Write a great prompt and 3 clarifying questions.
Language: {{language}}.
Category: {{category}}
Tone: {{tone}}
Input: {{input}}
Output JSON: { "great_prompt": "...", "clarifying_questions": [], "category": "..." }',
  1,
  '{"type": "system", "model": "llama", "is_fallback": true}'
)
ON CONFLICT (prompt_key) DO NOTHING;

-- Grant permissions (service role has full access by default)
-- Client apps will use RLS policies defined above
