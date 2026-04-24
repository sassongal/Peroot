# Feature Status — Peroot

Live inventory of what ships in production vs. what is experimental or disabled.
Update this file whenever a feature changes state. Source of truth beats README claims.

Last reviewed: 2026-04-24

---

## Live (production)

| Area | Notes |
|---|---|
| Prompt engines (Standard, Image, Research, Agent, Video) | `src/lib/engines/*`; BaseEngine + 10-dim scoring |
| AI Gateway + fallback chain | Gemini 2.5 Flash → Mistral Small → Flash Lite → Llama 4 Scout |
| Circuit breaker + concurrency limiter | `src/lib/ai/circuit-breaker.ts`, `concurrency.ts` |
| Rolling 24h credits | RPC `refresh_and_decrement_credits`; `/api/me/quota` |
| Personal Library (grid + graph views) | `PersonalLibraryView`, `PromptGraphView` |
| Prompt chains | `src/components/features/chains/*` |
| Context engine (files, URLs, images) | `src/lib/context/engine/*`; SSRF-hardened |
| L0 user-memory facts | Auto-extract + inject + edit; `/settings?tab=memory` |
| Admin dashboard | Users, realtime, funnel, costs, DB, library, notifications, scoring, experiments, GSC, health |
| Admin: Prompts Feed | `/admin/prompts-feed` — input/output content viewer |
| Payments | LemonSqueezy subscriptions + webhooks |
| Email | Resend transactional; consent via `email_sequences` + `newsletter_subscribers` |
| Analytics | PostHog + GA4 + Microsoft Clarity |
| Monitoring | Sentry (server + client source maps in prod) |

## Experimental / limited

| Area | Notes |
|---|---|
| Video generation engine | Behind capability mode; low traffic |
| Agent builder engine | Behind capability mode |
| Graph edge tuning (category/tag/template/reference) | UX still iterating |

## Disabled / stubbed (intentionally)

| Area | Why | Re-enable path |
|---|---|---|
| Developer API (`prk_*` keys) | No `developer_api_keys` migration; no mint/revoke UI | Add migration + UI, then replace stub in `src/lib/api-auth.ts`. Detection branches kept in `proxy.ts`, `enhance/lib/auth.ts`, `enhance/route.ts` |
| `@react-pdf/renderer` top-level import | v4 sub-packages broken on npm | Use dynamic import via `src/lib/export/download-prompt-pdf.tsx` only |
| SSRF private-IP bypass via `NODE_ENV` | Previously opened private IPs on any non-prod deploy | Set `CONTEXT_ALLOW_PRIVATE_URLS=1` explicitly |
| `husky` prepare script | Windows incompat | Removed from `package.json`; hooks not active locally |
| `@next/bundle-analyzer` | Disabled locally | Stubbed import; enable with `ANALYZE=true` |

## Deprecated / migrated away

| Area | Replacement |
|---|---|
| `src/middleware.ts` | Next 16 requires `src/proxy.ts` — never create both |
| DeepSeek provider | Removed from CSP, `.env.example`, README. Mistral Small is the fallback-1 |
| `profiles.credits_balance` direct reads in hooks | Use `/api/me/quota` (rolling 24h semantics) |

## Known local-dev quirks (Windows)

- `UPSTASH_REDIS_REST_URL/TOKEN` missing → rate limit degraded, not blocking
- `NODE_ENV` startup warning is cosmetic
- Vercel + peroot-platform MCP may error — not blocking
