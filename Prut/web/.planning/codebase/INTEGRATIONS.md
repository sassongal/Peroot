# External Integrations

**Analysis Date:** 2026-04-11

## APIs and External Services

**AI / LLM (Vercel AI SDK):**

- Google Gemini — `@ai-sdk/google` — `GOOGLE_GENERATIVE_AI_API_KEY` — `src/lib/ai/models.ts`, `src/lib/ai/gateway.ts`
- Groq — `@ai-sdk/groq` — `GROQ_API_KEY`
- Mistral — `@ai-sdk/mistral` — `MISTRAL_API_KEY` (used when present; ensure prod env documents it)
- **Note:** `.env.example` lists `DEEPSEEK_API_KEY` and CSP includes DeepSeek; provider wiring in `models.ts` may not expose DeepSeek as a first-class route (verify if legacy)

**Payments / subscriptions:**

- LemonSqueezy — `@lemonsqueezy/lemonsqueezy.js` — `src/lib/lemonsqueezy.ts` (`configureLemonSqueezy` / setup)
- Checkout HTTP — `src/app/api/checkout/route.ts`
- Webhook — `src/app/api/webhooks/lemonsqueezy/route.ts` (HMAC verification, idempotency)

**Email:**

- Resend — `resend` — `src/lib/emails/service.ts`, `src/app/api/contact/route.ts`, `src/app/api/admin/email-campaigns/route.ts`

**Analytics / marketing:**

- PostHog — `posthog-js` — `src/lib/analytics.ts`, `src/components/providers/PostHogProvider.tsx`
- Vercel Analytics + Speed Insights — `@vercel/analytics`, `@vercel/speed-insights` — `src/components/providers/VercelAnalytics.tsx`
- Google Analytics (browser) — `src/components/providers/GoogleAnalytics.tsx`
- Google Analytics Data API (admin metrics) — `@google-analytics/data` — `src/app/api/admin/google-analytics/route.ts`
- Microsoft Clarity — CSP allowlist in `next.config.ts`; `NEXT_PUBLIC_CLARITY_ID` in `.env.example`

## Data Storage

**Database:**

- PostgreSQL (Supabase) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Clients: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (RSC/cookies), `src/lib/supabase/service.ts` (service role)
- Migrations: `supabase/migrations/` (repo root relative to web app)

**Caching / rate limits:**

- Upstash Redis — `@upstash/redis`, `@upstash/ratelimit` — `src/lib/ratelimit.ts` — env: `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or `REDIS_URL` / `REDIS_TOKEN` patterns as documented in code

**File / content ingestion (libraries):**

- `@mozilla/readability`, `mammoth`, `pdfjs-dist`, `papaparse`, `xlsx` — context extraction and file pipelines under `src/lib/context/` and related API routes

## Authentication and Identity

**Auth provider:**

- Supabase Auth — session via cookies; `createServerClient` in `src/middleware.ts` and `src/lib/supabase/server.ts`
- OAuth callback — `src/app/auth/callback/route.ts`
- Login UI — `src/app/login/`, password reset flows under `src/app/auth/`

**Programmatic API access:**

- Bearer JWT and `prk_` API keys — validated in enhance and related routes — `src/lib/api-auth.ts` (see architecture doc)

## Monitoring and Observability

**Error tracking:**

- Sentry — `@sentry/nextjs` — DSN via env; `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`; `src/middleware.ts`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/lib/logger.ts`

**Analytics:**

- PostHog (above); optional admin integration status — `src/app/api/admin/integrations/route.ts`

## CI/CD and Deployment

**Hosting:**

- Vercel — typical for Next.js; env vars in project settings

**CI:**

- Not fully enumerated in this pass — add workflow paths if present under `.github/workflows/`

## Environment Configuration

**Development:**

- `.env.local` (gitignored) — mirror `.env.example`
- Scripts: `scripts/run-all-migrations.ts` uses `dotenv` (knip flags `dotenv` as unlisted in package.json — consider declaring)

**Production:**

- Secrets in host (Vercel) environment variables

## Webhooks and Callbacks

**Incoming:**

- LemonSqueezy — `POST` `src/app/api/webhooks/lemonsqueezy/route.ts` — signature verification, DB side effects (subscription, credits, email)
- CSRF: `src/middleware.ts` exempts `/api/webhooks/` prefixes for external POST bodies

**Outgoing:**

- Email sends via Resend from various routes and `src/lib/emails/`

**Admin (debug, not external provider):**

- `src/app/api/admin/webhooks/route.ts` — reads `webhook_events` from DB for debugging

---

_Integrations analysis: 2026-04-11_
