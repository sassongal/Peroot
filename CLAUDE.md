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
- `Prut/web/docs/agents/` — issue tracker, triage labels, domain-doc conventions.
  (`docs/adr/` is referenced by CONTEXT.md but does not exist yet.)

## Non-negotiables

- **Hebrew-first.** All user-facing strings, category names, toasts, AI system prompts in Hebrew.
- **`src/proxy.ts`, never `src/middleware.ts`.** Next.js 16 renamed it; having both is a fatal build error.
- **Never commit secrets.** `.env*`, `**/.mcp.json`, `**/.claude/` are gitignored and must stay that way. The repo is public.
- **Never bypass RLS.** Service-role client only in `src/lib/supabase/service.ts` call sites.
- Commit convention: `type(scope): message`.

## Before you say "done"

```bash
cd Prut/web
npm run typecheck     # hard gate in CI
npm run test          # hard gate in CI (~1150 tests)
npm run lint          # non-blocking in CI, ~41 pre-existing errors
```

CI (`.github/workflows/ci.yml`) runs `quality` on every push/PR to `main`. It is
green as of 2026-08-16 — keep it that way. There is **no branch protection**, so
CI is advisory: check it yourself after pushing.

## Deploy

Vercel project `web` (team `sassongals-projects`) auto-deploys `main`; every other
branch gets a preview. Deploying is not "done" — verify the change is actually live
(`deploy-verification` skill).

## Working with agents here

- Parallel sessions have collided on this repo before. Use a git worktree
  (`using-git-worktrees` skill) for anything long-running, and **never** junction
  `node_modules` between worktrees — it corrupts the main copy's deps.
- Long-running/parallel work should land via PR, not direct pushes to `main`.
- MCP: `supabase` (project-scoped), `github`, `sentry`, `playwright` are wired at
  root in `.mcp.json`. Vercel comes from the `vercel` plugin.
