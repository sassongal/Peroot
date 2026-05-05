# Phase 0 — Baseline Snapshot
**Date:** 2026-05-05
**Executed by:** Claude Code agent

---

## Production URL Health

| URL | Status | Latency |
|---|---|---|
| https://www.peroot.space | 200 OK | 2.6s |
| https://peroot.space | 308 → www | 1.1s |
| https://www.peroot.space/api/health | 200 OK | 1.0s |
| https://www.peroot.space/api/me | 401 (correct, unauthed) | 0.6s |
| https://www.peroot.space/feed.xml | 200 OK | 1.0s |
| https://www.peroot.space/sitemap.xml | 200 OK | 0.7s |

## System Access

| System | Status |
|---|---|
| Cloudflare API | ✅ Connected — account: Gal@joya-tech.net, ID: f78ded495dd768bd57b691493c39c5b5 |
| Vercel | Needs user confirmation |
| Supabase | Needs user confirmation |
| LemonSqueezy | Needs user confirmation |
| Namecheap (DNS) | Needs user confirmation |

## Codebase State

- Branch: `main` (ab7039f)
- Next.js build: ✅ succeeds (13.9s compile, 847 static pages)
- All routes: Dynamic (SSR) except noted below
- `.vercel/project.json`: present (Vercel project ID stored)

## Packages Relevant to Migration

| Package | Installed |
|---|---|
| @vercel/analytics | ^2.0.1 (must remove in Phase 3) |
| @vercel/speed-insights | ^2.0.0 (must remove in Phase 3) |
| @opennextjs/cloudflare | NOT installed (Phase 3) |
| wrangler | NOT installed (Phase 3) |

## Vercel.json Crons (confirmed 5)

```
/api/cron/send-emails        — 0 9 * * *
/api/cron/content-factory    — 0 9 * * 1
/api/cron/reengagement       — 0 10 * * *
/api/cron/sync-subscriptions — 0 6 * * *
/api/cron/data-retention     — 0 3 1 * *
```

## ⚠️ NEW FINDING: ISR Routes (5 routes — needs Phase 1 decision)

These routes use Next.js Incremental Static Regeneration:

| Route | Revalidate | Impact |
|---|---|---|
| `src/app/page.tsx` (HOMEPAGE) | 60s | High — homepage hits ISR every 60s |
| `src/app/blog/page.tsx` | 3600s (1hr) | Low |
| `src/app/blog/[slug]/page.tsx` | 3600s (1hr) | Low |
| `src/app/feed.xml/route.ts` | 3600s (1hr) | Low |
| `src/app/prompts/[slug]/page.tsx` | 3600s (1hr) | Low |

With `incrementalCache: "dummy"` in open-next.config.ts, these pages will SSR on every request on Cloudflare. For the homepage (60s ISR currently), this may cause slight latency/cost increase.

**Option A (recommended):** Use Cloudflare Workers KV for ISR cache — `@opennextjs/cloudflare` supports this. Requires creating a KV namespace and binding it. Preserves ISR behavior.

**Option B (simpler):** Accept SSR on every request. Homepage is fast (no DB calls on render). Add to Phase 1 agenda.

## ⚠️ NEW FINDING: `Vercel-CDN-Cache-Control` header in library/categories

`src/app/api/library/categories/route.ts` sets `Vercel-CDN-Cache-Control` — a Vercel-specific header. Cloudflare ignores it. Not a blocker — just dead code, can be removed in Phase 3 or left as harmless.

## Baseline Metrics

| Metric | Vercel Baseline |
|---|---|
| Homepage load (p95 est.) | ~2.6s |
| /api/health | 1.0s |
| /api/me (auth) | 0.6s |
| 5xx error rate | 0% (all endpoints healthy) |

---

## Phase 0 Checklist

- [x] https://www.peroot.space responds 200
- [x] Cloudflare API connected
- [x] Codebase builds successfully (Next.js)
- [x] Git on main, clean state
- [x] All 5 cron jobs documented
- [x] ISR routes identified
- [ ] User confirmed Vercel access
- [ ] User confirmed Supabase access
- [ ] User confirmed LemonSqueezy access
- [ ] User confirmed Namecheap access
- [ ] ISR decision made (KV cache vs accept SSR)
