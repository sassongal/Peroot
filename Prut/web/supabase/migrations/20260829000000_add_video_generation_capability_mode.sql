-- ============================================
-- Migration: Add VIDEO_GENERATION to capability_mode enum
-- Version: 20260829000000_add_video_generation_capability_mode
-- ============================================
--
-- Why: the app enum (src/lib/capability-mode.ts) and the UI (?capability_mode=
-- VIDEO_GENERATION) already offer video mode, but the Postgres enum created in
-- 20260123_add_capability_mode.sql only defined STANDARD / DEEP_RESEARCH /
-- IMAGE_GENERATION / AGENT_BUILDER. Every enhance in video mode therefore failed
-- its `history` insert with:
--   invalid input value for enum capability_mode: "VIDEO_GENERATION"
-- The credit was spent but the row was never saved (Sentry JAVASCRIPT-NEXTJS-A).
--
-- ADD VALUE IF NOT EXISTS is idempotent (safe to re-run). It is the ONLY
-- statement in this migration on purpose: the new label must be committed before
-- any query can reference it, so nothing else here uses it.

ALTER TYPE public.capability_mode ADD VALUE IF NOT EXISTS 'VIDEO_GENERATION';

-- ============================================
-- VERIFICATION (run after migration):
--   SELECT enumlabel FROM pg_enum e
--   JOIN pg_type t ON e.enumtypid = t.oid
--   WHERE t.typname = 'capability_mode'
--   ORDER BY e.enumsortorder;
-- Expect: STANDARD, DEEP_RESEARCH, IMAGE_GENERATION, AGENT_BUILDER, VIDEO_GENERATION
-- ============================================
