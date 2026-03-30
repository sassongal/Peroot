-- Atomic credit adjustment RPCs for admin panel
-- Prevents race conditions in concurrent credit operations
-- SECURITY: Only callable by service_role (admin API uses service client)

-- Primary RPC: adjust credits by arbitrary delta (positive or negative)
CREATE OR REPLACE FUNCTION admin_adjust_credits(target_user_id UUID, delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET credits_balance = GREATEST(0, credits_balance + delta),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Fallback RPC: increment credits (used if admin_adjust_credits fails)
CREATE OR REPLACE FUNCTION increment_credits(row_id UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET credits_balance = GREATEST(0, credits_balance + amount),
      updated_at = now()
  WHERE id = row_id;
END;
$$;

-- Restrict execution to service_role only — prevents client-side abuse
REVOKE EXECUTE ON FUNCTION admin_adjust_credits(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_adjust_credits(UUID, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION increment_credits(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_credits(UUID, INTEGER) TO service_role;
