# Phase 1 — Inventory & Audit Summary
**Date:** 2026-05-05
**Overall verdict: GREEN** with 2 fixable issues (below)

---

## Vercel-Specific Usage

| Item | Location | Action |
|---|---|---|
| `@vercel/analytics` | `VercelAnalytics.tsx` only | Phase 3: replace with no-op, uninstall package |
| `@vercel/speed-insights` | `VercelAnalytics.tsx` only | Phase 3: same |
| `Vercel-CDN-Cache-Control` header | `library/categories/route.ts` | Harmless (ignored by CF), remove as dead code |
| `VERCEL_*` env vars | **NONE** | ✅ Nothing to change |

---

## Runtime Declarations

| Route | Runtime | Notes |
|---|---|---|
| `api/library/categories` | `runtime = 'edge'` | Only Supabase client — edge-safe ✅ |
| `api/faq-chat` | `runtime = "nodejs"` | Explicit, fine ✅ |
| All others | implicit nodejs | Default — fine on CF with nodejs_compat ✅ |

**No routes need `export const runtime = 'edge'` added.**

---

## Routes That Must Stay nodejs (serverExternalPackages)

| Route | Package | Notes |
|---|---|---|
| `/api/context/extract-file` | `mammoth`, `xlsx`, `pdfjs-dist/legacy` | File extraction — keep as nodejs |
| `/api/context/extract-url` | `@mozilla/readability`, `jsdom`, `node:dns/promises` | URL extraction + SSRF check — keep as nodejs |

All handled by `nodejs_compat` flag. **Do NOT add `edge` runtime to these routes.**

Note: `@napi-rs/canvas` is NOT directly imported — `pdfjs-dist/legacy` build avoids it. ✅

---

## Node.js API Usage (all compatible with `nodejs_compat`)

| API | Files | Status |
|---|---|---|
| `node:crypto` (createHash, randomUUID, timingSafeEqual) | Many files | ✅ Works with nodejs_compat |
| `node:net` (isIP) | `enhance/route.ts` | ✅ Works with nodejs_compat |
| `node:dns/promises` | `context/engine/extract/url.ts` | ✅ Works with nodejs_compat |
| bare `fs` + `path` (not `node:` prefix) | `admin/seo-console/route.ts` | See Issue J below |

---

## ISR Routes (complete list — all covered by Workers KV decision)

| Route | Revalidate | `generateStaticParams` |
|---|---|---|
| `src/app/page.tsx` (homepage) | 60s | No |
| `src/app/blog/page.tsx` | 3600s | No |
| `src/app/blog/[slug]/page.tsx` | 3600s | Yes (pre-renders at build) |
| `src/app/feed.xml/route.ts` | 3600s | No |
| `src/app/prompts/[slug]/page.tsx` | 3600s | Yes (pre-renders at build) |
| `src/app/prompts/[slug]/[id]/page.tsx` | 86400s | Yes (pre-renders at build) |
| `src/app/guides/[slug]/page.tsx` | None (SSG) | Yes — fully static, served as assets |

All covered by `incrementalCache: "kv"` in `open-next.config.ts`. ✅

---

## Incompatible Packages

| Package | Installed? |
|---|---|
| bcrypt | ❌ Not installed ✅ |
| node-fetch | ❌ Not installed ✅ |
| ws | ❌ Not installed ✅ |
| sharp | ❌ Not installed ✅ |
| encoding | ❌ Not installed ✅ |

---

## Issue J (NEW — Phase 1 finding) — `seo-console` uses `process.cwd()` + `existsSync`

**File:** `src/app/api/admin/seo-console/route.ts` lines 106-108

```typescript
const sitemapExists =
  existsSync(join(process.cwd(), "src/app/sitemap.ts")) ||
  existsSync(join(process.cwd(), "src/app/sitemap.js")) ||
  existsSync(join(process.cwd(), "public/sitemap.xml"));
```

On Cloudflare Workers, source files are not present on disk at runtime. `existsSync` will return `false` for all three checks. Result: the admin SEO console will show "sitemap: not found" even though sitemap.ts exists.

**Severity:** Low — admin-only route, cosmetic display error only.
**Fix (Phase 3):** Replace with `const sitemapExists = true;` — we know sitemap.ts exists.

---

## Issue K (NEW — Phase 1 finding) — `after()` in `/api/enhance/route.ts`

**File:** `src/app/api/enhance/route.ts` lines 668 and 795.

`after()` is a Next.js 15+ API for scheduling work after the response is sent (credit deduction, analytics logging). On Cloudflare, `@opennextjs/cloudflare` should map this to `waitUntil()` internally.

**Severity:** High if it fails — credits would not be deducted after prompt enhancement.
**Action:** Test explicitly in Phase 4. Submit a prompt on the preview URL, verify credits are deducted correctly in Supabase. If `after()` fails, replace with direct `await` calls (slightly slower UX but functionally correct).

---

## Classification Summary

| Category | Count | Action |
|---|---|---|
| Routes — must stay nodejs | 2 | No change needed, nodejs_compat handles |
| Routes — already edge | 1 (library/categories) | ✅ Already correct |
| Routes — implicit nodejs OK | ~150+ | ✅ No change needed |
| ISR routes | 6 | ✅ Covered by Workers KV |
| Static (generateStaticParams, no revalidate) | 1 (guides/[slug]) | ✅ Served as assets |
| Vercel-specific imports | 1 file | Phase 3: replace with no-op |
| Vercel env vars | 0 | ✅ Nothing to do |
| Incompatible packages | 0 | ✅ Clean |
| Node.js APIs (fixable) | 1 (seo-console fs) | Phase 3: hardcode sitemapExists |
| Needs Phase 4 test | 1 (after()) | Critical test in Phase 4 |

---

## Final Verdict

**GREEN — proceed to Phase 2.**

No blocking issues discovered. Two new issues (J and K) are both fixable. The codebase is well-structured for this migration.
