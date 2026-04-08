-- 20260408_skill_selections.sql
-- T5: persist skill_selections so the admin dashboard sees real usage over
-- time, not just the in-memory ring buffer that resets on every Vercel cold
-- start. The in-memory buffer in src/lib/engines/skills/index.ts stays as
-- a fast-path for the current process; this table is the source of truth.

CREATE TABLE IF NOT EXISTS public.skill_selections (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
    platform TEXT NOT NULL,
    concept TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup index for the dashboard "top platforms / top categories" queries.
CREATE INDEX IF NOT EXISTS idx_skill_selections_created
    ON public.skill_selections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_selections_type_platform
    ON public.skill_selections (type, platform, created_at DESC);

-- RLS: admin-read only. Service role inserts (engines run server-side).
ALTER TABLE public.skill_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read skill_selections"
    ON public.skill_selections
    FOR SELECT
    USING (public.is_admin(auth.uid()));

-- INSERT policy: only service_role can write. We don't grant to anon or
-- authenticated because user-facing code never writes here directly —
-- only the engine code running with service client does.
-- (No INSERT policy means service_role bypasses RLS, which is correct.)
