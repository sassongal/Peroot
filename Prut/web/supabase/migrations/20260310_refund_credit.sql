-- Refund Credit RPC
-- Best-effort credit refund when prompt generation fails after credits were already deducted.
-- Called from /api/enhance catch block.

CREATE OR REPLACE FUNCTION refund_credit(
    target_user_id UUID,
    amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    UPDATE public.profiles
    SET credits_balance = credits_balance + amount
    WHERE id = target_user_id
    RETURNING credits_balance INTO new_balance;

    IF new_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$;
