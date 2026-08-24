# ADR-0005: CI is a real gate, but branch protection stays off

**Status:** accepted

`.github/workflows/ci.yml` runs two jobs on every push and PR to `main`:
`quality` (tsc, ~1162 tests, non-blocking eslint) and `build` (a real production
build).

**No branch protection is configured, deliberately.** This is a solo repo where
direct pushes to `main` are the normal workflow. A required status check would
block every one of them, because the check cannot have run against a SHA that
does not exist yet. So **CI is advisory: check the run after you push.**

Two implementation details worth keeping:

- The `build` job's gate step originally ran *before* `actions/checkout` while
  inheriting the workflow-level `working-directory: Prut/web` — a path that does
  not exist at that point — so it failed instead of gating. The build job had
  therefore never run a single time since CI was added.
- `SUPABASE_SERVICE_ROLE_KEY` falls back to a **placeholder** rather than being a
  repo secret. Prerendering reads through the anon key; the service key only has
  to *exist* to satisfy import-time env validation. **This repo is public**, so a
  real RLS-bypassing key must never become an Actions secret.

Node version comes from `Prut/web/.nvmrc` in both jobs, so CI, local dev and
Vercel cannot drift. They were once on 20 / 22 / 24 simultaneously.
