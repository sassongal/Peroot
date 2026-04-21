# Peroot (פירוט) — AI Prompt Management Platform
# CLAUDE.md — Context for Claude Code in Cursor

---

## ⚡ CRITICAL CONTEXT — READ FIRST

This project was developed on a MacBook and was **just migrated to a new Windows machine (SASSON)**
on April 15, 2026. This is the first dev session on the new machine.

**Developer:** Gal Sasson (גל ששון) — JoyaTech Digital Solutions, Haifa, IL
**GitHub:** github.com/sassongal/Peroot (public repo)
**Production:** https://peroot.space / https://www.peroot.space
**Vercel project:** web (team: sassongals-projects)
**Supabase project:** ravinxlujmlvxhgbjxti

### Known local dev quirks (Windows-specific):
- `@react-pdf/renderer` is STUBBED in node_modules — v4 has broken sub-packages on npm.
  Do NOT try to import it at top-level. Only use via dynamic import in `src/lib/export/download-prompt-pdf.tsx`
- `husky` prepare script was removed from package.json (Windows incompatibility). Git hooks not active locally.
- `@next/bundle-analyzer` is disabled in next.config.ts locally — import replaced with no-op.
- `NODE_ENV` warning on startup is cosmetic — Next.js sets it automatically, ignore it.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` missing — rate limiting degraded locally, not blocking.
- `vercel` MCP and `peroot-platform` MCP may show errors in Cursor — not blocking for development.
- Dev server runs on: http://localhost:3000

---

## Stack
Next.js 16.2.3 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind 4
Supabase (Auth + Postgres + RLS) · Vercel AI SDK · Upstash Redis · LemonSqueezy
Sentry · PostHog · Google Analytics 4 · Microsoft Clarity · Resend (email)

---

## Commands
```bash
npm run dev          # Turbopack dev server → localhost:3000
npm run build        # Production build
npm run start        # Start production build locally
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier
npm run knip         # Dead code detection
npx repomix --compress  # Full codebase snapshot → repomix-output.xml
```

---

## Project Structure (`src/`)

```
app/
  page.tsx                  # Homepage (HomeClient.tsx)
  app/layout.tsx            # Root layout, providers
  api/
    prompts/                # Prompt CRUD + improve endpoint
    admin/                  # Role-protected admin routes
    p/[id]/                 # Shared prompt public endpoint
    blog/                   # Blog content API
    guides/                 # Guides content API
    webhooks/               # LemonSqueezy payment webhooks
    cron/                   # Scheduled jobs (daily email, sync, etc.)

components/
  ui/                       # shadcn/ui components
  features/
    library/                # Personal prompt library
    prompt-improver/        # AI prompt enhancement UI
    chains/                 # Prompt chains feature
  admin/                    # Admin dashboard
  layout/                   # Header, footer, nav
  providers/                # React context providers

lib/
  ai/
    gateway.ts              # Main AI entry point: generateStream() / generateFull()
    models.ts               # Task routing, model selection
    circuit-breaker.ts      # Auto-skip failing providers
    concurrency.ts          # Request queue management
  engines/                  # 5 engines extending BaseEngine
    standard.ts             # Standard prompt improvement
    image.ts                # Image generation prompts
    video.ts                # Video generation prompts
    research.ts             # Deep research mode
    agent.ts                # Agent builder mode
  services/
    credit-service.ts       # atomic RPC refresh_and_decrement_credits
  supabase/
    server.ts               # SSR client (user context)
    service.ts              # Service role client (admin)
  export/
    PromptPdfDocument.tsx   # PDF template (STUBBED — see above)
    download-prompt-pdf.tsx # Dynamic import wrapper (OK to use)
  capability-mode.ts        # STANDARD | DEEP_RESEARCH | IMAGE_GENERATION | AGENT_BUILDER | VIDEO_GENERATION
  env.ts                    # Env validation — throws on missing required vars

hooks/
  useLibrary.ts             # Library state + CRUD
  usePromptWorkflow.ts      # Prompt improvement workflow
  useHistory.ts             # Usage history

context/
  LibraryContext.tsx
  FavoritesContext.tsx
  I18nContext.tsx

i18n/                       # Hebrew (he) + English (en). Hebrew-first.
middleware.ts               # Auth guard + CSRF + maintenance mode
```

---

## AI Gateway — Fallback Chain
```
gemini-2.5-flash (primary)
  → mistral-small (fallback 1)
  → gemini-2.5-flash-lite (fallback 2 / classify tasks primary)
  → llama-4-scout (fallback 3)
  → gpt-oss-20b (last resort)
```
Circuit breaker auto-skips providers that fail consecutively.
`classify` task routes to Flash Lite first (lightweight, cheap).

---

## Database (Supabase)
- Postgres with RLS on all tables
- Migrations: `supabase/migrations/`
- Key tables: `profiles`, `prompts`, `credit_ledger`, `prompt_favorites`, `newsletter_subscribers`
- Credits: free 2/day (reset 14:00 IL), Pro 150/month
- Atomic credit RPC: `refresh_and_decrement_credits`

---

## Auth
Supabase SSR enforced in middleware.ts. Never bypass RLS.
Admin routes check `role = 'admin'` in profiles table.

---

## Business Logic
- **Free plan:** 2 prompt improvements/day
- **Pro plan:** 150/month (LemonSqueezy subscription)
- Webhook: `/api/webhooks/lemonsqueezy` — order_created / order_refunded
- Email: Resend API (`RESEND_FROM_EMAIL`)
- Analytics: PostHog (behavioral) + GA4 (traffic) + Clarity (heatmaps)

---

## Conventions
- All imports use `@/*` alias → `./src/`
- API errors: `NextResponse.json({ error: "..." }, { status })`
- Rate limiting: Upstash Redis sliding window
- Hebrew-first UI — all user-facing strings in Hebrew
- All AI system prompts written in Hebrew
- Server Components by default, `"use client"` only when necessary

---

## Agent Framework (.agent/)
The project has an Antigravity Kit with 19 specialist agents, 36 skills, 11 workflows.
Use `/plan`, `/debug`, `/create`, `/enhance`, `/deploy` slash commands in Cursor.
Architecture: `.agent/ARCHITECTURE.md`

---

## .env.local Location
`C:\Users\sasso\dev\Peroot\Prut\web\.env.local`
Contains all production keys pulled from Vercel on 2026-04-15.
Do NOT commit. Already in .gitignore.

---

## Git
- Remote: https://github.com/sassongal/Peroot
- Branch: main
- User: Gal Sasson <sassong4l@gmail.com>
- Commit convention: `type(scope): message` (e.g. `fix(auth): handle expired session`)

---

## Deploy
- Vercel auto-deploys on push to `main`
- Preview deployments on all branches
- Cron jobs: daily emails, weekly content factory, subscription sync, retention flows
- Security headers defined in `next.config.ts`
- Sentry source maps: production only

---

## MCP Servers Available in Cursor
- `supabase` — DB access, migrations, RLS (29 tools)
- `github` — repo read/write, PRs (26 tools)
- `context7` — live docs for Next.js, Supabase, Tailwind (2 tools)
- `sequential-thinking` — complex reasoning (1 tool)
- `vercel` — deployments, logs (may error — known issue)
- `peroot-platform` — internal platform tools (may error — tsx missing globally)