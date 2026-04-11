# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Single deployable **monolithic Next.js App Router** application (`package.json` name `web`). No separate backend package in-repo.

**Key characteristics:**

- Server-first API via `src/app/api/**/route.ts` Route Handlers
- Domain logic in `src/lib/` (engines, AI gateway, services, jobs)
- Supabase for auth + Postgres + RLS; Upstash for rate limits
- Streaming AI responses for the core “enhance” product path

## Layers

**App Router (UI + metadata):**

- Purpose: Pages, layouts, loading/error boundaries, SEO
- Contains: `src/app/**/*.tsx`, co-located `page.tsx`, `layout.tsx`, `loading.tsx`
- Depends on: `src/components/`, React contexts, server components calling `src/lib/supabase/server.ts`
- Used by: Browser and crawlers

**API routes (HTTP):**

- Purpose: JSON/streaming endpoints, cron, webhooks
- Contains: `src/app/api/**/route.ts`
- Depends on: `src/lib/*`, Zod validation, Supabase, Redis, `AIGateway`
- Used by: Client (`fetch`, streaming), cron, LemonSqueezy webhooks, extensions (Bearer)

**Engines (prompt assembly):**

- Purpose: Mode-specific system/user prompts, refinement, scoring hooks
- Contains: `src/lib/engines/` — `BaseEngine`, `standard-engine.ts`, `research-engine.ts`, `image-engine.ts`, `video-engine.ts`, `agent-engine.ts`, `index.ts` registry
- Depends on: Supabase `prompt_engines`, `ai_prompts` (`global_system_identity`), `src/lib/capability-mode.ts`
- Used by: `src/app/api/enhance/route.ts`, admin test routes

**AI gateway:**

- Purpose: Model routing, fallbacks, circuit breaker, concurrency slots, task-aware defaults
- Contains: `src/lib/ai/gateway.ts`, `models.ts`, `circuit-breaker.ts`, `concurrency.ts`, `context-router.ts`, `enhance-cache.ts`, `inflight-lock.ts`
- Depends on: `ai` package, provider API keys
- Used by: Enhance route, chain generation, admin engine tests

**Services:**

- Purpose: Credits, emails, billing helpers
- Contains: `src/lib/services/credit-service.ts` (RPC `refresh_and_decrement_credits`, refunds), `src/lib/emails/`, `src/lib/lemonsqueezy.ts`

**Cross-cutting:**

- Middleware — `src/middleware.ts` (maintenance, CSRF origin checks, auth prefix gating, Sentry user context)
- Instrumentation — `src/instrumentation.ts` (env validation)

## Data Flow

**Primary flow: client → `/api/enhance` → engine → `AIGateway`**

1. Client (e.g. `src/app/HomeClient.tsx`) POSTs streaming request to `/api/enhance`.
2. `src/middleware.ts` runs for configured prefixes: Supabase `getUser()` where `AUTH_REQUIRED_PREFIXES` applies; CSRF validation for mutating `/api/*` except exempt paths and Bearer-authenticated calls.
3. `src/app/api/enhance/route.ts` parses body (Zod), resolves auth (session, Bearer, API key via `src/lib/api-auth.ts`), enforces rate limits and credits (`src/lib/services/credit-service.ts`), optional enhance cache and in-flight dedup.
4. `getEngine(mode)` from `src/lib/engines/index.ts` loads engine config from Supabase and returns the appropriate engine instance.
5. Engine produces `systemPrompt` / `userPrompt` via `generate` or `generateRefinement`.
6. `AIGateway.generateStream()` runs `streamText` with task defaults, fallback model order, optional `preferredModel` from `src/lib/ai/context-router.ts`.
7. Response streams to the client; `after()` defers non-critical work (history, telemetry, cache, refunds).

**Parallel flows:**

- Checkout: `src/app/api/checkout/route.ts` → LemonSqueezy API
- Webhook: LemonSqueezy → `src/app/api/webhooks/lemonsqueezy/route.ts` → DB + credits + email
- Cron: `src/app/api/cron/**/route.ts` — scheduled jobs (protect with `CRON_SECRET` pattern per route)
- Chains: `src/app/api/chain/generate/route.ts`
- Context extraction: `src/app/api/context/extract-file/route.ts`, `extract-url/route.ts`, `describe-image/route.ts`

**State management:**

- React Context — i18n, library/favorites (`src/context/`)
- TanStack Query — server/async UI state
- Supabase — source of truth for user data, prompts, subscriptions
- Redis — rate limiting; optional caching in AI path

## Key Abstractions

**`BaseEngine` (`src/lib/engines/base-engine.ts`):**

- Purpose: Shared template assembly, sanitization, scoring hooks
- Pattern: Template method / inheritance — concrete engines extend

**`PromptEngine` registry (`src/lib/engines/index.ts`):**

- Purpose: Map `CapabilityMode` to engine implementation + cached `EngineConfig` from DB

**`CapabilityMode` (`src/lib/capability-mode.ts`):**

- Purpose: STANDARD, DEEP_RESEARCH, IMAGE_GENERATION, AGENT_BUILDER, VIDEO_GENERATION — drives UI and engine selection

**Credit service (`src/lib/services/credit-service.ts`):**

- Purpose: Atomic decrement via RPC, refunds on failure, ledger consistency

**`AIGateway` (`src/lib/ai/gateway.ts`):**

- Purpose: Single entry for `generateStream` / `generateFull` with provider failover

## Entry Points

**Root layout:**

- `src/app/layout.tsx` — fonts, metadata, providers, optional `getUser()` for shell

**Middleware:**

- `src/middleware.ts` — first line of defense for auth gating and CSRF on APIs

**Representative API routes:**

- Core: `src/app/api/enhance/route.ts`
- User: `src/app/api/me/route.ts`, `src/app/api/history/route.ts`, `src/app/api/favorites/route.ts`, `src/app/api/personal-library/route.ts`
- Billing: `src/app/api/subscription/route.ts`, `src/app/api/checkout/route.ts`, `src/app/api/webhooks/lemonsqueezy/route.ts`
- Admin: `src/app/api/admin/**/route.ts`
- Health: paths exempted in middleware (e.g. `src/app/api/health`)

## Error Handling

**Strategy:** Route handlers return `NextResponse.json({ error: "..." }, { status })` per project convention; streaming routes handle errors in generator/`onFinish` patterns; Sentry captures unhandled errors in app boundaries.

**Patterns:**

- Zod parse failures → 400 with message
- Credit / auth failures → 401/402/429 as implemented per route
- AI failures → fallback models; refunds via credit service where applicable

## Cross-Cutting Concerns

**Logging:**

- `src/lib/logger.ts` — structured logging; prefer over raw `console` in new code (circuit breaker still uses `console` in places — see CONCERNS)

**Validation:**

- Zod at API boundaries; engine input types in `src/lib/engines/types.ts`

**Authentication:**

- Supabase session cookies; Bearer for API/extension; middleware cooperates with route-level checks

**Internationalization:**

- `src/i18n/` — Hebrew-first dictionaries consumed by `I18nProvider`

---

_Architecture analysis: 2026-04-11_
