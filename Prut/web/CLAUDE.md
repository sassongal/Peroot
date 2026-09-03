# Peroot (פירוט) — AI Prompt Management Platform
# CLAUDE.md — Context for Claude Code in Cursor

---

## ⚡ CRITICAL CONTEXT — READ FIRST

Dev machine is Windows (SASSON); the project was originally built on a MacBook and
migrated on 2026-04-15. Windows-specific quirks are listed below.

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
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are present and working (verified 2026-08-16), so rate limiting is live locally too.
- `ADMIN_EMAILS`, `GUEST_IP_SALT` and `RESEND_REPLY_TO` exist on Vercel but **not** in `.env.local` — admin bypass and guest IP hashing behave differently locally. `GUEST_IP_SALT` unset logs a warning and makes guest IP hashes reversible.
- `NEWSLETTER_UNSUBSCRIBE_SECRET` is present-but-empty in `.env.local` (it is set on Vercel).
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
    PromptPdfDocument.tsx   # PDF template — full impl; load only via dynamic import (SSR-unsafe at module init)
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
proxy.ts                    # Auth guard + CSRF + admin gate + maintenance mode
                            # (Next.js 16 name — there is NO middleware.ts, see above)
```

---

## Context Extraction (in-process)
Both extraction routes (`/api/context/extract-{url,file}`) parse jsdom/pdfjs/mammoth/xlsx **in-process on Vercel**. The pipeline lives under `src/lib/context/engine/extract/` (`url`, `file-pdf`, `file-office`, `file-text`, `image`, `index`).

> Historical note: a Cloudflare Workers CPU-offload bridge (`extract/remote.ts`, gated on `EXTRACT_URL_HTTP_ENDPOINT` / `EXTRACT_FILE_HTTP_ENDPOINT` / `EXTRACT_SECRET`) existed briefly but was **removed** (commit `c5681e4`, "delete CF Worker remote bridge — extraction runs in-process on Vercel Pro"). No `remote.ts` and no `EXTRACT_*` env vars are referenced in the tree anymore. Worker source remains only on the `cloudflare-migration` archive branch.

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
- Atomic credit RPC: `refresh_and_decrement_credits`; refunds via `refund_credit`
- **Quotas are data, not constants** — read `public.site_settings`, never hardcode.
  See "The quota law" below. Live: guest **1**/day, registered free **2**/day.
  Pro is a LemonSqueezy monthly allowance.

---

## Auth
Supabase SSR session refresh enforced in `src/proxy.ts`. Never bypass RLS.
Admin is sourced from the **`user_roles` table** (canonical), with
`profiles.plan_tier` only as an OR fallback in the `proxy.ts` UI gate — the ~60 API
routes use `withAdmin`/`validateAdminSession`, which read `user_roles`. Keep both in
sync when promoting someone. `ADMIN_EMAILS` is a separate maintenance-bypass list.
Credit-gated user routes go through `withUser` (`src/lib/api-middleware.ts`).

---

## The quota law (owner decision, 2026-09-01)

**Guest 1/day · registered free 2/day.** Both are rows in `public.site_settings`
(`guest_daily_limit`, `daily_free_limit`), not constants. Changing the allowance is
an admin edit, never a deploy.

Three rules, all enforced by `src/lib/__tests__/quota-law.test.ts` (CI-blocking):

1. **No quota number in user-facing copy.** Not "2 שיפורים ביום", not "קרדיט אחד ביום".
   Interpolate `creditsPhrase()` / `enhancementsPhrase()` from `src/lib/quota-policy.ts`
   so the Hebrew stays grammatical when the number changes ("שיפור אחד" vs "שני שיפורים"
   are different word forms, not a different digit).
2. **No `?? <number>` fallback at a call site.** Use
   `resolveDailyLimit(value, QUOTA_FALLBACK.freeDaily)`. Eight routes each invented
   their own fallback before this, so a Supabase blip handed different users
   different quotas depending on which route they hit.
3. **`src/lib/quota-policy.ts` is the only module allowed to name a quota number.**

**Credits do not accrue.** The daily allowance is a ceiling, not a wallet. An
unused day is not banked (the rolling reset SETS the balance to the limit, it
does not add), and no balance may exceed `public.credit_ceiling(plan_tier)`:
free → `daily_free_limit`, pro → `pro_monthly_credits`, admin → NULL (unmetered).
The `trg_clamp_credits_to_ceiling` trigger on `profiles` enforces the ceiling for
every writer, so a refund, referral grant, admin grant or churn downgrade cannot
lift a free user above 2. Do not "fix" an over-limit balance in application code;
the trigger already owns it.

Consequence to know before reviving the referral loop (master plan 3.8): a credit
reward for a free user is clamped away. Referral needs a different reward, or the
copy must stop promising credits.

Where to read it:
- Server components (pricing, FAQ, SEO copy): `getQuotaPolicy()` from `src/lib/quota-server.ts`
- Client components: `useSiteSettings()` → `settings.daily_free_limit` / `.guest_daily_limit`
- Guest runtime: `getGuestDailyLimit()` from `src/lib/guest-service.ts`
- Registered runtime: the `refresh_and_decrement_credits` RPC reads the column itself

Two SQL functions cannot import the module and carry a mirrored default that must be
kept in sync: `handle_new_user()` and `refresh_and_decrement_credits()`
(`supabase/migrations/20260901140000_quota_law.sql`).

## Privacy: profiles is not public (2026-09-02)

`profiles` carried `Public profiles are viewable by everyone.` (`USING (true)`
for role `public`, which includes `anon`), so anyone with the anon key from the
client bundle could read every user's email, name, plan tier and credit
balance. Dropped in `20260902110000_rls_and_grants_hygiene.sql`. Reads are now
own-row plus admin, and every non-admin read in the codebase is already
`.eq("id", user.id)`.

Consequence: the unused `global_leaderboard` view is `security_invoker` and
joined profiles for a display name, so it returns nothing to anonymous callers.
If a leaderboard is ever built it needs a definer view over whitelisted columns,
never a blanket read on the profile table.

Related: every SECURITY DEFINER function was executable by PUBLIC, so it was
callable as `POST /rest/v1/rpc/<name>` with the same anon key. Grants are now
by name (`20260902120000_definer_function_grants.sql`). When adding a definer
function, `REVOKE ALL ... FROM PUBLIC` and grant only the roles that call it.
Trigger bodies get no grant: PostgreSQL checks EXECUTE at CREATE TRIGGER, not
when the trigger fires.

## Business Logic
- **Free plan:** `site_settings.daily_free_limit` improvements/day (live: **2**)
- **Guests:** `site_settings.guest_daily_limit` (live: **1**), only while `allow_guest_access` is true
- **Pro plan:** LemonSqueezy subscription — store `Peroot` (312053), variant `Peroot Pro`;
  `PRO_MONTHLY_CREDITS` in `quota-policy.ts` is the single source for the 150/month figure
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
- **No em/en dashes law (owner decision, 2026-08-31):** no U+2014/U+2013 in ANY
  text a human sees: UI strings, JSX text, engine templates, AI-generated output,
  emails, blog/library content. Use a comma, colon, period, or plain hyphen for
  ranges (2-3). Enforced by ESLint (`no-restricted-syntax` on literals/JSX in
  eslint.config.mjs) and scrubbed deterministically in content-factory output
  (`stripAiDashes`). Goal: everything must read as human-written, so also avoid
  formulaic AI phrasing in copy and generated content. Code comments are exempt.
- **Theme classes swap, never stack.** The server renders `<html className="dark">`;
  the inline bootstrap script in `layout.tsx` must REMOVE the opposite class, not
  just add the stored one. `.dark` carries the dark palette and `.light` matches
  nothing (the light palette lives on bare `:root`), so `class="dark light"`
  paints dark. Pinned by `src/app/__tests__/theme-bootstrap.test.ts`.
- **Light mode is not optional.** A dark-only colour with no `dark:` counterpart
  fails `src/components/__tests__/light-mode.test.ts`. Deliberately dark screens
  (login gate, onboarding, maintenance, Connect docs) are listed there by name.
- Server Components by default, `"use client"` only when necessary

## Personal Library Architecture
- `PersonalLibraryView` orchestrates all library state and exposes it through `PersonalLibraryContext` to header, sidebar, grid, modals
- `localViewType: "grid" | "graph"` — sub-view toggle inside PersonalLibraryView (NOT a HomeClient viewMode)
- **History** is a virtual folder: `useHistory()` items are mapped to `PersonalPrompt[]` locally; `setFolder("history")` skips `ctxSetActiveFolder` to avoid server pagination with unknown folder key
- **Graph view** (`PromptGraphView`) uses ALL prompts from `filteredPersonalLibrary`, not the paginated slice
- `addPrompt` is actually `addPromptWithSuggestion` in LibraryDataContext — auto-categorizes via AI (non-blocking) for saves to "כללי" by authenticated users
- Shared library state is the context seam in `src/components/views/personal-library/context/PersonalLibraryContext.tsx` (`usePersonalLibrary()`); the old `PersonalLibrarySharedState` god-object and its `types.ts` are gone (2026-07-18 refactor, file removed 2026-09-02)

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

## Peroot Connect (public agent surface) — shipped 2026-08-30

Lets ANY agent (Claude Desktop, Cursor, claude.ai web, ChatGPT, curl) enhance
prompts through Peroot. Plan: `docs/plans/2026-08-29-peroot-for-agents.md` (v1.0).

- **One ops layer, two mouths.** `src/lib/connect/ops.ts` is the single
  implementation; both `/api/v1/*` (REST) and `/api/mcp` (stateless Streamable
  HTTP MCP, 14 tools + the `/peroot:` prompt commands) call it — never implement
  a capability on one surface only. The OpenAPI object in
  `src/lib/connect/openapi.ts` is the contract SoT: served at `/api/v1/openapi`,
  rendered at `/connect/docs`, pinned by `openapi.test.ts`.
- **Auth:** `prk_live_` API keys (SHA-256 hash + 16-char prefix lookup,
  `src/lib/api-keys.ts`, managed in Settings → Connect) **or** OAuth 2.1
  (`src/lib/connect/oauth.ts`: RFC 7591 dynamic registration, PKCE S256, Hebrew
  consent at `/oauth/authorize`, `pot_`/`por_` tokens hashed, refresh rotation;
  discovery under `/.well-known/`). `authenticateConnect`
  (`src/lib/connect/auth.ts`) resolves both; usage logs attach `api_key_id`
  only for prk keys.
- **Quota is unified** with the web (free 1/day, PRO monthly) via the same
  credit RPC — `connectEnhance` invokes the real `/api/enhance` handler
  in-process. Hardening: Idempotency-Key replay (Redis, 15 min), 55s hard-stop
  → 504 + refund, per-key (20/min) + per-user (40/min) ceilings.
- **CSRF:** `/api/v1/`, `/api/mcp`, `/api/oauth/token`, `/api/oauth/register`
  are exempt in `proxy.ts` (bearer/PKCE auth, no cookies). `/api/oauth/authorize`
  (the consent form) is deliberately NOT exempt.

## Engine templates: the row wins, so keep the row current (2026-09-02)

`getEngine()` prefers the active `prompt_engines` row over the code default in
`src/lib/engines/*-engine.ts`. Until 2026-09-02 the lookup lowercased the mode
against uppercase rows, matched nothing, and every engine ran on its code
default while the admin editor edited rows nobody read (and the
`global_system_identity` was never injected). The lookup is fixed, the rows
were synced to the shipped templates (old text kept in `prompt_engine_history`).

Rule: after changing an engine's default template in code, run
`npm run engines:sync`, apply and commit the migration it writes. Otherwise the
change never reaches users. The admin drift view
(`/api/admin/engine-shipped-baseline?mode=`) compares a row with the code.

## Chrome extension (v3, 2026-09-03)

`chrome-extension-v2.1/` is the extension (the folder name is historical).
Manifest V3, no build step; `npm run extension:build` zips it for the store,
`npm run extension:test` runs its unit tests (vitest picks up
`chrome-extension-v2.1/lib/__tests__`). The four shared modules under `lib/`
(`prefs`, `language`, `prompt-text`, `api`) are the only place the popup, the
options page and the content scripts read preferences, resolve the output
language or parse the enhance stream; `language.js` and `prompt-text.js`
mirror `src/lib/output-language.ts` and `src/lib/prompt-stream/trailer.ts`
and must change together. The store listing text is in
`chrome-extension-v2.1/STORE_LISTING.md`; `CHROME_STORE_URL` in
`src/lib/constants.ts` stays null until the listing is approved.

## Background jobs (style analysis, achievements)

`background_jobs` table → `/api/jobs/process` worker (hourly vercel.json cron
at :30, Bearer `CRON_SECRET`), batch-drains via the `fetch_next_job` RPC.
Hard-won rules: the worker and everything it calls MUST use the **service
client** (cron has no cookies — the SSR client silently reads empty under RLS
and jobs "complete" doing nothing); handlers must **throw** on failure so the
job retries; model JSON comes via `generateObject`+zod (free-text JSON parsing
broke twice on fences/Hebrew quotes). `src/lib/intelligence/*`.

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

## MCP servers (verified 2026-08-16)

MCP config is **per working directory**. `Prut/web/.mcp.json` only loads when a
session starts in `Prut/web`; sessions started at the repo root read
`C:\Users\sasso\dev\Peroot\.mcp.json` instead. Both are gitignored (they hold tokens).

- `supabase` — project-scoped to `ravinxlujmlvxhgbjxti`, **working** from both dirs.
- `vercel` — comes from the Vercel plugin, connected. Don't add a second one.
- `github`, `sentry`, `upstash`, `resend`, `lemonsqueezy`, `playwright`, `context7`,
  `clarity`, `deepseek` — defined in `Prut/web/.mcp.json` only.
- `cloudflare` — its token is **dead (401)**; the entry was removed 2026-08-16.
- The hosted `plugin:supabase:supabase` says "needs authentication" and is redundant
  with the local `supabase` server. Ignore it.

Whatever isn't wired as MCP, hit over REST with the key from `.env.local` — every
key there was pinged live on 2026-08-16 and works (see the connectivity notes in
Claude's project memory).
---

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`github.com/sassongal/Peroot`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role triage vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Running agents in parallel

`docs/agents/parallel-work.md` is the protocol, and `scripts/agent-worktree.mjs`
enforces it (isolated worktree, own `node_modules`, refuses to discard unpushed
work). Two agents in one working copy has corrupted this repo before.

## Design Context

The visual + strategic design system is documented and **normative** — read it before building or changing any UI:

- **[PRODUCT.md](PRODUCT.md)** — register (split: `product` app + `brand` marketing), users, brand personality (*expert · precise · empowering*), anti-references, 5 design principles, accessibility bar (IS 5568 / WCAG 2.0 AA).
- **[DESIGN.md](DESIGN.md)** — the visual system (Stitch format): obsidian `#080808` + Signal Gold `#F59E0B`, cool-slate light theme `#f8fafc`, Varela Round / Alef / IBM Plex Mono, glass + glow elevation, five engine hues. Named rules: **One Gold** (≤10% gold/screen), **Cool-Neutral** (no warm cream bg), **Readout** (mono = machine-exact only), **Glow-Not-Shadow**.

North Star: **"The Precision Instrument."** Hebrew-first, RTL-native. The impeccable design-detector hook is **on** — it flags slop after UI edits. Use `/impeccable <command>` (craft, critique, audit, polish, …) for design work; every command reads these two files.
