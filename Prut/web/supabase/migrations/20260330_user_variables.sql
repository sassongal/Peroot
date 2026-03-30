-- Migration: User Variable Memory
-- Description: Stores per-user saved variable values for auto-fill in prompt enhancement

CREATE TABLE IF NOT EXISTS public.user_variables (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_key TEXT NOT NULL CHECK (char_length(variable_key) <= 100),
    variable_value TEXT NOT NULL CHECK (char_length(variable_value) <= 500),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    use_count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, variable_key)
);

-- Enable RLS
ALTER TABLE public.user_variables ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own rows
CREATE POLICY "Users can view their own variables"
    ON public.user_variables FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variables"
    ON public.user_variables FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variables"
    ON public.user_variables FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own variables"
    ON public.user_variables FOR DELETE
    USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_variables_user_id ON public.user_variables(user_id);

-- Auto-increment use_count on UPDATE
CREATE OR REPLACE FUNCTION increment_variable_use_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.use_count := OLD.use_count + 1;
    NEW.last_used_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_variable_use_count
    BEFORE UPDATE ON public.user_variables
    FOR EACH ROW
    EXECUTE FUNCTION increment_variable_use_count();
