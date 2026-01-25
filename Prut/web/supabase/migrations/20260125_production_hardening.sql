-- Production Hardening Migration
-- 1. Tighten AI Prompts RLS
-- 2. Atomic Credit Management

-- [RLS] Restrict SELECT on ai_prompts to Admins or Service Role only
-- This prevents IP leakage via client-side Supabase calls
DROP POLICY IF EXISTS "Anyone can read active prompts" ON public.ai_prompts;

CREATE POLICY "Only admins can read prompts" ON public.ai_prompts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- [RLS] Versions should also be restricted
DROP POLICY IF EXISTS "Authenticated users can read versions" ON public.ai_prompt_versions;
CREATE POLICY "Only admins can read prompt versions" ON public.ai_prompt_versions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- [RPC] Atomic Credit Check & Decrement
-- Prevents Race Conditions in credit consumption
CREATE OR REPLACE FUNCTION check_and_decrement_credits(
    target_user_id UUID,
    amount_to_spend INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as system to bypass RLS for credit logic
AS $$
DECLARE
    current_balance INTEGER;
    result JSONB;
BEGIN
    -- Select for update to lock the row during transaction
    SELECT credits_balance INTO current_balance
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    IF current_balance < amount_to_spend THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'current_balance', current_balance);
    END IF;

    -- Execute reduction
    UPDATE public.profiles
    SET credits_balance = credits_balance - amount_to_spend,
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'new_balance', current_balance - amount_to_spend);
END;
$$;
