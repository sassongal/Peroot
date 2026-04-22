-- Migration: Variable Presets
-- Description: Named collections of variable key-value pairs for reuse across prompts.
--              Separate from user_variables (which stores individual key memory);
--              presets store named sets a user can apply in one click.

CREATE TABLE IF NOT EXISTS public.variable_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    variables JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.variable_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presets"
    ON public.variable_presets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
    ON public.variable_presets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
    ON public.variable_presets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
    ON public.variable_presets FOR DELETE
    USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_variable_presets_user_id ON public.variable_presets(user_id);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION update_variable_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_variable_presets_updated_at
    BEFORE UPDATE ON public.variable_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_presets_updated_at();
