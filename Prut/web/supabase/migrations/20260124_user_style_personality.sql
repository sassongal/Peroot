
-- Migration: User Style Personality System
-- Description: Stores persistent behavioral tokens and style traits per user

-- Table: user_style_personality
CREATE TABLE IF NOT EXISTS public.user_style_personality (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    style_tokens TEXT[] DEFAULT '{}', -- e.g. ['concise', 'structured', 'professional', 'hebrew_slang']
    preferred_format TEXT, -- e.g. 'bullets', 'paragraphs'
    personality_brief TEXT, -- AI-generated summary of styles
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.user_style_personality ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own style personality"
    ON public.user_style_personality FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own style personality"
    ON public.user_style_personality FOR UPDATE
    USING (auth.uid() = user_id);

-- Helper Function for credit management (referenced in API)
CREATE OR REPLACE FUNCTION decrement_credits(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET credits_balance = GREATEST(0, credits_balance - amount)
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
