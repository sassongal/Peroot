-- Persona: an opt-out the user can actually reach, and a row they can create.
--
-- Master plan 3.3. `user_style_personality` is injected into every enhancement
-- (`[USER_PERSONALITY_TRAITS]`, src/app/api/enhance/route.ts), but the user
-- could neither see it nor turn it off: the only kill switch was an env var
-- (PEROOT_DISABLE_PERSONALITY_INJECTION), which is global and needs a deploy.
--
-- Two things were missing:
--   1. A per-user opt-out column, read by the injection query itself so the
--      preference is enforced at the source rather than by a caller
--      remembering to check it.
--   2. An INSERT policy. The table had SELECT and UPDATE only, so a user whose
--      analysis had never run (fewer than 3 saved prompts) had no row, and an
--      upsert to record their preference was refused by RLS.

ALTER TABLE public.user_style_personality
  ADD COLUMN IF NOT EXISTS injection_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.user_style_personality.injection_enabled IS
  'User opt-out. False means the persona is kept but never injected into an enhancement. Enforced in the injection query itself (api/enhance + api/enhance/lib/user-context).';

ALTER TABLE public.user_style_personality ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own style personality" ON public.user_style_personality;
CREATE POLICY "Users can insert their own style personality"
  ON public.user_style_personality FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
