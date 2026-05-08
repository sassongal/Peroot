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

### Next.js 16 middleware — CRITICAL
Next.js 16 renamed `middleware.ts` → `proxy.ts`. The active middleware file is `src/proxy.ts`.
- **NEVER create `src/middleware.ts`** — having both files causes a fatal build error:
  `Both middleware file and proxy file are detected. Please use proxy.ts only.`
- All middleware logic (Supabase session refresh, CSRF, admin guard, maintenance) lives in `src/proxy.ts`
- The exported function is named `proxy` and there is `export const config = { matcher: [...] }`

### Known local dev quirks (Windows-specific):
- `@react-pdf/renderer` v4 is fully installed and working (verified 2026-04-29).
  Still load it via dynamic import in `src/lib/export/download-prompt-pdf.tsx` — it
  dispatches to browser APIs at module init, so a top-level import would break SSR.
- `husky` git hooks work on Windows via Git-for-Windows `sh.exe`. `scripts/setup-git-hooks.mjs` runs at `npm install` and points `core.hooksPath` at `.husky/`. If hooks ever stop firing, re-run `node scripts/setup-git-hooks.mjs`.
- `@next/bundle-analyzer` is gated by `process.env.ANALYZE === "true"` in next.config.ts (no-op unless the env var is set).
- `NODE_ENV` warning on startup is cosmetic — Next.js sets it automatically, ignore it.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` missing — rate limiting degraded locally, not blocking.
- `vercel` MCP and `peroot-platform` MCP may show errors in Cursor — not blocking for development.
- Dev server runs on: http://localhost:3000

---

## Stack
Next.js 16.2.3 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind 4
Supabase (Auth + Postgres + RLS) · Vercel AI SDK · Upstash Redis · LemonSqueezy
Sentry · PostHog · Google Analytics 4 · Microsoft Clarity · Resend (email)
`react-force-graph` — Canvas force-directed graph (SSR-safe via `dynamic(..., { ssr: false })`)

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
      graph-utils.ts        # buildGraphData() — 4 edge types (category/tag/template/reference)
      PromptGraphView.tsx   # Obsidian-style force graph — SSR-safe dynamic import
    context/
      StageProgressBar.tsx  # Processing stages: uploading→extracting→enriching→ready/warning/error
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
  useHistory.ts             # Usage history (React Query, returns HistoryItem[])

context/
  LibraryContext.tsx
  FavoritesContext.tsx
  I18nContext.tsx

i18n/                       # Hebrew (he) + English (en). Hebrew-first.
middleware.ts               # Auth guard + CSRF + maintenance mode
```

---

## Hybrid CPU Offload (Cloudflare Workers)
The two heaviest extraction routes (`/api/context/extract-{url,file}`) offload jsdom/pdfjs/mammoth/xlsx parsing to sibling Cloudflare Workers when these env vars are set:
- `EXTRACT_URL_HTTP_ENDPOINT` → https://peroot-extract-url.gal-f78.workers.dev
- `EXTRACT_FILE_HTTP_ENDPOINT` → https://peroot-extract-file.gal-f78.workers.dev
- `EXTRACT_SECRET` (shared HMAC; set in Vercel + as a Wrangler secret on each Worker)

Bridge: `src/lib/context/engine/extract/remote.ts` (fetch + FormData only — no heavy deps). Dispatch is gated in `src/lib/context/engine/index.ts`. Unset env → in-process fallback (zero behavior change). Worker source lives on the `cloudflare-migration` archive branch under `extract-url-worker/` and `extract-file-worker/`.

---

## Output Language Flow
End-to-end pipeline that routes the user's voice-picker selection into engine prompts and DB:
1. **Voice picker UI** → `src/app/HomeClient.tsx:176` `voiceLang` state (`VoiceLang`, e.g. `he-IL`)
2. **Mapping** → `src/hooks/useVoiceRecorder.ts:15` `voiceLangToOutputLang()` → `OutputLanguage` (`hebrew | english | arabic | russian`)
3. **API payload** → `src/hooks/usePromptEnhance.ts:387,533` and `HomeClient.tsx:750` send `output_language` only when ≠ `hebrew` (Hebrew is default, omitted)
4. **Cache key isolation** → `src/lib/ai/enhance-cache.ts:121` includes `outputLanguage` so different languages don't collide
5. **Engine override block** → `src/lib/engines/base-engine.ts:258` `buildLanguageOverride()` injects a language directive when ≠ Hebrew; consumed by `standard-engine.ts`, `research-engine.ts`, `agent-engine.ts`
6. **DB persistence** → `history.output_language` column (CHECK constraint on the 4 allowed values, migration `20260508000000_history_output_language.sql`)

When adding a new language: extend `OutputLanguage` type (`engines/types.ts:64`), add to `LANG_NAMES` map (`base-engine.ts`), add to `voiceLangToOutputLang` mapping, extend the DB CHECK constraint.

**Mode coverage:** Standard, Research, and Agent engines apply the override. Image and Video engines deliberately do NOT — Midjourney/SD/DALL-E/Imagen/Veo platforms require English prompts for best generation quality, so the voice picker is silently ignored for those modes.

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

## Personal Library Architecture
- `PersonalLibraryView` orchestrates all library state and passes a `shared: PersonalLibrarySharedState` object down to header, sidebar, grid, modals
- `localViewType: "grid" | "graph"` — sub-view toggle inside PersonalLibraryView (NOT a HomeClient viewMode)
- **History** is a virtual folder: `useHistory()` items are mapped to `PersonalPrompt[]` locally; `setFolder("history")` skips `ctxSetActiveFolder` to avoid server pagination with unknown folder key
- **Graph view** (`PromptGraphView`) uses ALL prompts from `filteredPersonalLibrary`, not the paginated slice
- `addPrompt` is actually `addPromptWithSuggestion` in LibraryDataContext — auto-categorizes via AI (non-blocking) for saves to "כללי" by authenticated users
- `PersonalLibrarySharedState` is defined in `src/components/views/personal-library/types.ts` — extend it when adding new shared state

## Memory Palace (Graph Sidebar/Drawer)
- **Desktop:** `MemoryPalaceSidebar` mounted inside `PersonalLibraryView`, collapsible, persisted via `peroot_palace_collapsed` localStorage key
- **Mobile:** `MemoryPalaceDrawer` triggered by 🕸️ button on each `PromptCard`, 50vh height, framer-motion stagger reveal
- **Engine:** `computeNeighborhood()` in `graph-utils.ts` — combines Jaccard similarity (60%) + 24h co-occurrence (40%), max 19 neighbors
- **Data:** `personal_library_usage_events` table tracks every prompt use; backfilled from `personal_library.last_used_at` on migration; 90d retention window. Distinct from the unrelated `prompt_usage_events` analytics table.
- **Analytics (release blocker):** PostHog events in `memory-palace/palace-analytics.ts` — success metric is `palace_navigated_to_prompt` (target ≥25% of opens)
- **Hidden when:** user has <5 prompts (graph needs critical mass)
- **Spec:** `docs/superpowers/specs/2026-05-07-graph-memory-palace-design.md`

## Context Engine (useContextAttachments)
- Files/images: `stage: "uploading"` set immediately on attachment creation
- URLs: extract hostname as display name, `stage: "extracting"` set immediately  
- `getContextPayload()` returns blocks where `status === "ready" && attachment.block`; `warning` stage → `status: "ready"` so included in payload
- `ProcessingStage` union: `"uploading" | "extracting" | "enriching" | "ready" | "warning" | "error"`

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
---

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`github.com/sassongal/Peroot`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role triage vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
