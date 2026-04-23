-- Migration: User Memory Facts
-- Description: Atomic, observable, user-editable facts extracted from prompts.
-- This is the L0 personalization layer — injected into every enhance before L2/L3.

CREATE TABLE IF NOT EXISTS public.user_memory_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fact TEXT NOT NULL CHECK (char_length(fact) <= 300),
    category TEXT NOT NULL DEFAULT 'general',
    source TEXT NOT NULL DEFAULT 'auto',
    confidence FLOAT NOT NULL DEFAULT 0.8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_memory_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own facts"
    ON public.user_memory_facts
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_memory_facts_user_id
    ON public.user_memory_facts(user_id);

CREATE OR REPLACE FUNCTION update_user_memory_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_memory_facts_updated_at
    BEFORE UPDATE ON public.user_memory_facts
    FOR EACH ROW
    EXECUTE FUNCTION update_user_memory_facts_updated_at();
