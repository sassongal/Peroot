-- 20260407_prompt_entity_timestamps.sql
-- PromptEntity rollout: ensure created_at/updated_at/last_used_at exist on every
-- prompt-bearing table, install a reusable updated_at trigger, and expose a
-- whitelisted bump_prompt_last_used() RPC.
--
-- VERIFIED against live DB on 2026-04-07 via mcp__supabase:
--   history: 249 rows, has only created_at
--   shared_prompts: 1 row, has only created_at + views
--   public_library_prompts: 574 rows, has created_at + updated_at
--   ai_prompts: 0 rows, has created_at + updated_at
--   personal_library: 522 rows, already has all 3 timestamps
--
-- All ALTER TABLE operations are additive (no DROP, no rename, no type change).
-- Adding NOT NULL DEFAULT NOW() is O(1) on PG12+ — no table rewrite, no lock.
-- The existing increment_shared_prompt_views() function is preserved with the
-- exact same signature/language; we only add `last_used_at = NOW()` to its body.

-- ── 1. Global helper: set_updated_at() ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ── 2. history table ─────────────────────────────────────────────────────────
ALTER TABLE public.history
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS history_set_updated_at ON public.history;
CREATE TRIGGER history_set_updated_at
  BEFORE UPDATE ON public.history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_history_user_last_used
  ON public.history (user_id, last_used_at DESC NULLS LAST);

-- ── 3. shared_prompts table ──────────────────────────────────────────────────
ALTER TABLE public.shared_prompts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS shared_prompts_set_updated_at ON public.shared_prompts;
CREATE TRIGGER shared_prompts_set_updated_at
  BEFORE UPDATE ON public.shared_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. public_library_prompts table ──────────────────────────────────────────
ALTER TABLE public.public_library_prompts
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS public_library_prompts_set_updated_at ON public.public_library_prompts;
CREATE TRIGGER public_library_prompts_set_updated_at
  BEFORE UPDATE ON public.public_library_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. ai_prompts table ──────────────────────────────────────────────────────
ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- ── 6. personal_library: ensure trigger (columns already exist) ──────────────
DROP TRIGGER IF EXISTS personal_library_set_updated_at ON public.personal_library;
CREATE TRIGGER personal_library_set_updated_at
  BEFORE UPDATE ON public.personal_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 7. Extend existing increment_shared_prompt_views to bump last_used_at ────
-- The function already exists in production as a SQL function. We re-create it
-- with the SAME signature, language, and search_path, and preserve the COALESCE
-- semantics. The only change is the additional `last_used_at = NOW()` line.
CREATE OR REPLACE FUNCTION public.increment_shared_prompt_views(prompt_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE shared_prompts
  SET views = COALESCE(views, 0) + 1,
      last_used_at = NOW()
  WHERE id = prompt_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_shared_prompt_views(UUID) TO anon, authenticated;

-- ── 8. RPC: bump_prompt_last_used with table whitelist ───────────────────────
CREATE OR REPLACE FUNCTION public.bump_prompt_last_used(
  p_table TEXT,
  p_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Whitelist: only these tables may be bumped via this RPC.
  -- Any caller-supplied table name outside this list raises an exception
  -- BEFORE the dynamic SQL is built, preventing SQL injection vectors.
  IF p_table NOT IN ('history', 'shared_prompts', 'public_library_prompts', 'personal_library', 'ai_prompts') THEN
    RAISE EXCEPTION 'bump_prompt_last_used: table % not allowed', p_table;
  END IF;

  EXECUTE format('UPDATE public.%I SET last_used_at = NOW() WHERE id = $1', p_table)
  USING p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_prompt_last_used(TEXT, UUID) TO authenticated;
