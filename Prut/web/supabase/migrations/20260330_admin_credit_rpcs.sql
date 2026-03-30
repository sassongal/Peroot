-- Atomic credit adjustment RPCs for admin panel
-- Prevents race conditions in concurrent credit operations

-- Primary RPC: adjust credits by arbitrary delta (positive or negative)
CREATE OR REPLACE FUNCTION admin_adjust_credits(target_user_id UUID, delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
AS $$
BEGIN
  UPDATE profiles
  SET credits_balance = GREATEST(0, credits_balance + amount),
      updated_at = now()
  WHERE id = row_id;
END;
$$;
