# Peroot — repo root context

Sessions start **here** (`C:\Users\sasso\dev\Peroot`), but the app lives one level
down. This file exists so a root session isn't context-blind; the detailed docs are
in `Prut/web/`.

## Monorepo map

| Path | What it is |
|---|---|
| `Prut/web/` | **The app** — Next.js 16 / peroot.space. Run all `npm` commands from here. |
| `peroot-mcp-server/` | MCP server exposing Peroot tools (prompts, users, analytics) to agents. |
| `.github/workflows/` | CI (`ci.yml`) + content-factory cron. |
| `Prut/web-legacy/`, `ALARM/` | Untracked leftovers — leave alone. |

One git repo, one remote (`github.com/sassongal/Peroot`, **public**), one branch history.
Files showing up from the sibling subdir in `git status` are normal, not a leak.

## Read before working

- `Prut/web/CLAUDE.md` — stack, structure, conventions, gotchas.
- `Prut/web/CONTEXT.md` — domain glossary + the load-bearing seams (`extract()`, `withUser`, `useAllPersonalPrompts()`).
- `Prut/web/PRODUCT.md` + `Prut/web/DESIGN.md` — **normative** for any UI change.
- `Prut/web/docs/agents/parallel-work.md` — **read this before running more than
  one agent.** The worktree protocol, and why each rule exists.
- `Prut/web/docs/adr/` — the decisions that are settled. Don't re-litigate them.
- `Prut/web/docs/agents/` — issue tracker, triage labels, domain-doc conventions.

## Non-negotiables

- **Hebrew-first.** All user-facing strings, category names, toasts, AI system prompts in Hebrew.
- **`src/proxy.ts`, never `src/middleware.ts`.** Next.js 16 renamed it; having both is a fatal build error.
- **Never commit secrets.** The repo is **public**. `.env*`, `**/.mcp.json` and
  `**/.claude/settings.local.json` hold live tokens and are gitignored — keep it
  that way. Note `.claude/` is only *partly* ignored: `commands/`, `agents/` and
  `settings.json` are deliberately tracked so agents share one config, so never
  put a credential in those three.
- **Never bypass RLS.** Service-role client only in `src/lib/supabase/service.ts` call sites.
- Commit convention: `type(scope): message`.

## Standing authorizations

**Database (granted by Gal, repo owner, 2026-08-24 — open-ended, whole project).**
Claude may change the Peroot Supabase schema (project `ravinxlujmlvxhgbjxti`) and
**apply migrations** without asking per change.

How that authority gets exercised, so it stays safe rather than merely fast:

- Every schema change is a **file in `Prut/web/supabase/migrations/`**, committed in
  the same pass. Never a one-off statement typed into a console and forgotten —
  that is exactly how `email_logs` came to exist in git but not in production.
- Migrations are **idempotent** (`IF NOT EXISTS` / `IF EXISTS`) so a re-run is safe.
- **Verify against the live DB afterwards**, not against the migration's exit code.
- **RLS stays on.** A new table gets its policy in the same migration. Service-role
  access only through `src/lib/supabase/service.ts`.
- Reading production to answer a question never needs a heads-up.

Irreversible **data loss** still gets one sentence of warning first: `DROP TABLE` /
`DROP COLUMN` on a populated table, `DELETE` without a `WHERE`, disabling RLS, or
rotating a key other services use. That is a heads-up, not a refusal — say "go"
and it proceeds.

**Not covered by this grant:** sending real communications to customers
(re-engagement or marketing email runs). Those are outward-facing and get
confirmed separately. See `Prut/web/docs/adr/0007-email-logs-dedupe.md`.

## Before you say "done"

```bash
cd Prut/web
npm run typecheck     # hard gate in CI
npm run test          # hard gate in CI (~1150 tests)
npm run lint          # non-blocking in CI; exits 0 errors (~49 warnings, mostly no-unused-vars)
```

CI (`.github/workflows/ci.yml`) runs `quality` on every push/PR to `main`. It is
green as of 2026-08-16 — keep it that way. There is **no branch protection**, so
CI is advisory: check it yourself after pushing.

## Deploy

Vercel project `web` (team `sassongals-projects`) auto-deploys `main`; every other
branch gets a preview. Deploying is not "done" — verify the change is actually live
(`deploy-verification` skill).

## Working with agents here

- **Two agents must never share one working copy.** Sessions have hijacked each
  other's commits here. One agent, one worktree:
  ```bash
  cd Prut/web
  node scripts/agent-worktree.mjs new <slug>    # isolated worktree + own deps
  node scripts/agent-worktree.mjs list          # health, flags linked node_modules
  node scripts/agent-worktree.mjs done <slug>   # refuses if dirty or unpushed
  ```
  Full protocol: `Prut/web/docs/agents/parallel-work.md`.
- **Never** junction or symlink `node_modules` between worktrees. It corrupts the
  main copy's deps (~18k tsc errors). Each worktree installs its own.
- Declare the files you'll touch in the worktree's `AGENT-SCOPE.md` before editing.
- Long-running/parallel work lands via PR, not direct pushes to `main`.
- MCP: `supabase` (project-scoped), `github`, `sentry`, `playwright` are wired at
  root in `.mcp.json`. Vercel comes from the `vercel` plugin.
