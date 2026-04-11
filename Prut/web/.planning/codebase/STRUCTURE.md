# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Layout

```
web/
├── .planning/codebase/     # This codebase map (GSD)
├── .husky/                 # Git hooks (pre-commit → lint-staged)
├── e2e/                    # Playwright specs (*.spec.ts)
├── public/                 # Static assets, sw.js
├── scripts/                # DB migrations runner, benchmarks, tooling
├── src/
│   ├── app/                # Next.js App Router: pages + api/
│   ├── components/         # UI: ui/, features/, admin/, layout/, providers/
│   ├── context/            # React context (I18n, library, favorites)
│   ├── hooks/              # Client hooks
│   ├── i18n/               # Dictionaries and locale helpers
│   ├── lib/                # Shared libraries (AI, engines, supabase, jobs, …)
│   ├── __tests__/          # Top-level tests (e.g. middleware, engines)
│   └── middleware.ts       # Edge middleware (not a folder)
├── supabase/               # Migrations (repo-relative; under Peirutech tree)
├── chrome-extension-v2.1/ # Browser extension (JS, separate from Next bundle)
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.mjs
└── sentry.*.config.ts
```

## Directory Purposes

**`src/app/`:**

- Purpose: Routes, layouts, Route Handlers
- Contains: `page.tsx`, `layout.tsx`, `api/**/route.ts`, `sitemap.ts`, `robots.ts`, `feed.xml/`
- Key segments: `admin/`, `p/[id]/`, `prompts/`, `guides/`, `blog/`, `login/`, `auth/`, `settings/`, marketing pages
- API surface: `src/app/api/` — REST-style handlers

**`src/components/`:**

- Purpose: Reusable UI and feature components
- Subfolders: `ui/` (shadcn-style), `features/` (library, prompt-improver, chains), `admin/`, `layout/`, `providers/`, `views/`

**`src/lib/`:**

- Purpose: Server-safe and shared logic
- Key: `ai/`, `engines/`, `supabase/`, `services/`, `jobs/`, `context/` (engine injection), `memory/`, `ratelimit.ts`, `env.ts`

**`src/context/`:**

- Purpose: Client-side React context for i18n and library/favorites

**`src/hooks/`:**

- Purpose: Client hooks (`useLibrary.ts`, `usePromptWorkflow.ts`, etc.)

**`src/i18n/`:**

- Purpose: Locale dictionaries and helpers

**`e2e/`:**

- Purpose: Playwright E2E tests against local dev server

**`scripts/`:**

- Purpose: Operational scripts (`run-all-migrations.ts`, benchmarks, etc.)

## Key File Locations

**Entry points:**

- `src/app/layout.tsx` — root layout
- `src/app/page.tsx` + `src/app/HomeClient.tsx` — home experience
- `src/middleware.ts` — request middleware

**Configuration:**

- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`
- `.env.example` — env template

**Core product logic:**

- `src/app/api/enhance/route.ts` — main streaming enhance API
- `src/lib/ai/gateway.ts` — AI orchestration
- `src/lib/engines/` — prompt engines
- `src/lib/services/credit-service.ts` — credits

**Testing:**

- `src/**/*.test.ts`, `src/**/*.test.tsx`, `**/__tests__/**`
- `src/__tests__/middleware.test.ts`, `src/__tests__/engines.test.ts`
- `e2e/*.spec.ts`

## Naming Conventions

**Files:**

- React components: mostly **PascalCase** (`TargetModelSelect.tsx`); some **kebab-case** (`user-nav.tsx`, `auth-form.tsx`)
- App Router segments: **lowercase** folder names, `page.tsx`, `layout.tsx`
- Tests: `*.test.ts`, `*.test.tsx`; API “e2e-style” Vitest: `*.e2e.test.ts`
- Library modules: **kebab-case** or descriptive names under `src/lib/`

**Directories:**

- Feature folders under `components/features/`; plural route segments (`prompts/`, `guides/`)

**Special patterns:**

- `@/` imports map to `src/` via `tsconfig.json`

## Where to Add New Code

**New feature (user-facing):**

- Pages: `src/app/<segment>/`
- Components: `src/components/features/<feature>/`
- API: `src/app/api/<feature>/route.ts`
- Tests: co-located `__tests__/` or `*.test.ts` next to module

**New engine or AI behavior:**

- `src/lib/engines/` + DB rows in `prompt_engines` / `ai_prompts`
- Wire mode in `src/lib/capability-mode.ts` if new capability

**Shared utilities:**

- `src/lib/<area>/` — follow existing module boundaries

---

_Structure analysis: 2026-04-11_
