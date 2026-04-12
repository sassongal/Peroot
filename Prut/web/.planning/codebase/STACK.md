# Technology Stack

**Analysis Date:** 2026-04-11

## Languages

**Primary:**

- TypeScript (strict) — all application code in `src/**/*.ts`, `src/**/*.tsx`
- TSX — React components

**Secondary:**

- JavaScript — `chrome-extension-v2.1/**/*.js`, legacy scripts
- CSS — Tailwind v4 via `src/app/globals.css`, PostCSS

**Config:**

- `tsconfig.json` — `target` ES2017, `module` esnext, `moduleResolution` bundler, `jsx` react-jsx, `strict` true, path alias `@/*` → `./src/*`, `allowJs` true

## Runtime

**Environment:**

- Node.js — **no** `engines` field in `package.json`; align team on an LTS version (e.g. 22.x) and optionally add `engines` + `.nvmrc`
- **Not detected:** `.nvmrc`

**Package Manager:**

- npm — lockfile `package-lock.json`

## Frameworks

**Core:**

- Next.js **16.1.4** — App Router, API routes, SSR/RSC — `next.config.ts`
- React **19.2.3** — UI

**Styling:**

- Tailwind CSS **4** — `postcss.config.mjs`, `@tailwindcss/postcss`, `tailwindcss`

**Testing:**

- Vitest **4.0.18** — unit/integration — `vitest.config.ts`
- Playwright **1.58.0** — E2E — `playwright.config.ts`, `e2e/*.spec.ts`
- Testing Library — `@testing-library/react`, `@testing-library/jest-dom`

**Build / Dev:**

- TypeScript **5.x** — `tsc --noEmit` via `npm run typecheck`
- ESLint **9** — `eslint.config.mjs`, `eslint-config-next`
- Prettier **3.x** — `.prettierrc`
- Husky + lint-staged — `.husky/pre-commit`, `.lintstagedrc`

## Key Dependencies

**Critical:**

- `ai` (^6.0.42) — Vercel AI SDK; streaming and `generateText` via `src/lib/ai/gateway.ts`
- `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/mistral` — LLM providers wired in `src/lib/ai/models.ts`
- `@supabase/ssr`, `@supabase/supabase-js` — auth and Postgres — `src/lib/supabase/client.ts`, `server.ts`, `service.ts`
- `@upstash/redis`, `@upstash/ratelimit` — rate limiting — `src/lib/ratelimit.ts`
- `zod` (^4.3.6) — request validation at API boundaries
- `@sentry/nextjs` — errors/performance — `next.config.ts` wrap, `sentry.*.config.ts`
- `posthog-js` — product analytics — `src/lib/analytics.ts`, `src/components/providers/PostHogProvider.tsx`
- LemonSqueezy billing — REST (`src/app/api/checkout/route.ts`, webhook) + `PLANS` in `src/lib/lemonsqueezy.ts` (no `@lemonsqueezy/lemonsqueezy.js` SDK dependency)
- `resend` — email — `src/lib/emails/service.ts`

**Infrastructure / UI:**

- `@tanstack/react-query` — server/async UI state
- `framer-motion` — animation
- `sanitize-html` — HTML sanitization (with `dangerouslySetInnerHTML` patterns in app)

## Configuration

**Environment:**

- Template: `.env.example` — Supabase, AI keys, Redis, Sentry, LemonSqueezy, PostHog, analytics IDs, app URLs, maintenance flags
- Runtime validation: `src/instrumentation.ts` → `validateEnv()` from `src/lib/env.ts`

**Build:**

- `next.config.ts` — Sentry wrapper, bundle analyzer (when `ANALYZE`), security headers, redirects, image remote patterns, Turbopack `root`
- `tsconfig.json` — compiler and path aliases
- `eslint.config.mjs` — flat config, Next core-web-vitals + TypeScript presets

## Platform Requirements

**Development:**

- macOS/Linux/Windows with Node.js and npm
- Local: `npm run dev` (Next dev server)

**Production:**

- Vercel (per project docs / deployment conventions) — environment variables in dashboard; cron routes under `src/app/api/cron/`

---

_Stack analysis: 2026-04-11_  
_Update after major dependency changes_
