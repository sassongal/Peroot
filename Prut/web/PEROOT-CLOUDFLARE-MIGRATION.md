# Peroot — Vercel → Cloudflare Migration Plan
**For: Claude Code agent operating inside the Peroot repository**
**Owner: Gal Sasson (גל ששון)**
**Production URL: https://peroot.space**
**Plan version: 3 (updated 2026-05-05 — see changelog at bottom)**

---

## Mission

Migrate Peroot from Vercel to Cloudflare Pages with **zero customer-facing downtime** and **100% feature parity**. Customers must always be able to:
- Sign in
- Submit prompts
- Receive enhanced prompts (LLM streaming)
- Manage their account
- Be billed correctly

**This migration is COMPLETE only when 7 consecutive days have passed at 100% Cloudflare traffic with zero errors and Vercel decommissioned.**

---

## Hard Rules — NEVER violate

1. **NEVER decommission Vercel before 7 days of clean Cloudflare data.**
2. **NEVER push to `main` branch during migration without testing on preview URL first.**
3. **NEVER modify the Supabase schema during this migration.** Migration is infrastructure-only.
4. **NEVER modify LemonSqueezy webhook URLs until cutover phase.**
5. **NEVER reduce DNS TTL above 300s during migration window.** Default to 60s.
6. **NEVER skip a verification gate** — if a checkbox in any phase isn't checked, do not proceed.
7. **NEVER assume something works** — verify with HTTP probe, console check, or user-flow test.
8. **ANY customer-impacting error triggers immediate rollback** (see Rollback Procedures).
9. **NEVER touch production env vars on Vercel during migration.** Only Cloudflare side.
10. **NEVER use force-push.** All changes via PR.

---

## Status Tracker (the agent updates this section after each step)

```
PHASE 0: Pre-flight                     [ ] not started
PHASE 1: Inventory & Audit              [ ] not started
PHASE 2: Cloudflare Setup               [ ] not started
PHASE 2.5: DNS Transfer to Cloudflare   [ ] not started
PHASE 3: Code Compatibility             [ ] not started
PHASE 3.5: Cron Job Migration           [ ] not started
PHASE 4: Parallel Deploy (preview)      [ ] not started
PHASE 5: AI Gateway Setup               [ ] not started
PHASE 6: Internal Testing               [ ] not started
PHASE 7: Canary (10% traffic)           [ ] not started
PHASE 8: Gradual Rollout                [ ] not started
PHASE 9: Stabilization (7 days)         [ ] not started
PHASE 10: Decommission Vercel           [ ] not started
```

After completing each step, update from `[ ]` → `[x]` and add a timestamp + 1-line summary.

---

## Known Codebase Issues (pre-audit findings — must be addressed in Phase 3)

These were found during plan preparation and are confirmed blockers. Phase 1 will find more.

### Issue A — `serverExternalPackages` blocks edge runtime for many routes

`next.config.ts` declares these as Node.js-only:
```
pdfjs-dist, mammoth, xlsx, jsdom, @mozilla/readability, @napi-rs/canvas
```
Any API route that imports these packages CANNOT use `export const runtime = 'edge'`.
The plan MUST NOT blanket-add edge runtime to all routes. Each route needs individual assessment.
Routes using context extraction (`/api/context/extract-file`, etc.) are likely affected.
Use `nodejs_compat` flag on Cloudflare and keep those routes as Node.js runtime — `@opennextjs/cloudflare` supports mixed runtimes.

### Issue B — CSP references Vercel-specific scripts

`next.config.ts` lines 23 and 27 include `va.vercel-scripts.com` and `vitals.vercel-insights.com` in CSP headers.
Phase 3 must remove these from `script-src` and `connect-src`.
If Vercel Analytics (`@vercel/analytics`) or Speed Insights (`@vercel/speed-insights`) are imported anywhere, remove those imports too.

### Issue C — Sentry webpack plugin compatibility

`next.config.ts` wraps config with `withSentryConfig(...)` which uses Webpack.
`@opennextjs/cloudflare` uses esbuild for its build pass. The Sentry webpack plugin runs during `next build` (which the adapter calls first), so source maps should still upload — but this must be explicitly verified in Phase 4. If the Cloudflare build step fails because of Sentry, set `SENTRY_DISABLE_WEBPACK_PLUGIN=1` for the CF build only.

### Issue D — Image optimization needs a decision

`next.config.ts` enables avif/webp optimization. On Cloudflare Pages, Next.js image optimization requires either:
- **Cloudflare Image Resizing** (recommended — enable in dashboard, no code change needed)
- Or `images: { unoptimized: true }` (degrades image quality, avoid for production)
This decision must be made and configured in Phase 2.

### Issue E — 5 cron jobs in `vercel.json` need migration

Cloudflare Pages has no cron system. 4 of 5 jobs move to Cloudflare Cron Triggers via a dedicated Worker. The 5th (content-factory) is handled separately — see Issue H. Full details in Phase 3.5.

Cron jobs identified:
```
/api/cron/send-emails        — 0 9 * * *    (daily 09:00 UTC)
/api/cron/content-factory    — 0 9 * * 1    (weekly Mon 09:00 UTC) ← GitHub Actions only
/api/cron/reengagement       — 0 10 * * *   (daily 10:00 UTC)
/api/cron/sync-subscriptions — 0 6 * * *    (daily 06:00 UTC)
/api/cron/data-retention     — 0 3 1 * *    (monthly 1st 03:00 UTC)
```

### Issue F (Phase 0 finding) — ISR on 5 routes — Workers KV solution chosen

5 routes use Next.js ISR (`export const revalidate`):

| Route | Revalidate |
|---|---|
| `src/app/page.tsx` (homepage) | 60s |
| `src/app/blog/page.tsx` | 3600s |
| `src/app/blog/[slug]/page.tsx` | 3600s |
| `src/app/feed.xml/route.ts` | 3600s |
| `src/app/prompts/[slug]/page.tsx` | 3600s |

**Decision (user confirmed):** Option A — Workers KV incremental cache. Preserves ISR behavior on Cloudflare.

**Impact on Phase 2:** Create a Workers KV namespace (`NEXT_CACHE_WORKERS_KV`) in Cloudflare and bind it in `wrangler.toml`.

**Impact on Phase 3:** Use `incrementalCache: "kv"` (or the KV binding variant) in `open-next.config.ts` instead of `"dummy"`.

Also found: `Vercel-CDN-Cache-Control` header in `src/app/api/library/categories/route.ts` — harmless on Cloudflare (ignored), dead code only.

### Issue G — `VercelAnalytics` component actively used in `src/app/layout.tsx` (was F)

`src/components/providers/VercelAnalytics.tsx` imports and renders:
- `Analytics` from `@vercel/analytics/next`
- `SpeedInsights` from `@vercel/speed-insights/next`

`src/app/layout.tsx` line 239: `<VercelAnalytics />` is rendered in the root layout.

These load `va.vercel-scripts.com` which will fail on Cloudflare. PostHog + GA4 + Clarity already provide full analytics coverage.

**Fix (Phase 3):** Replace the content of `src/components/providers/VercelAnalytics.tsx` with a no-op export, and remove `@vercel/analytics` and `@vercel/speed-insights` from `package.json`. Layout stays unchanged.

### Issue H — `content-factory` maxDuration = 120 → Cloudflare 30s wall-clock limit

`src/app/api/cron/content-factory/route.ts` exports `maxDuration = 120`.

Cloudflare Pages Functions hard-kill HTTP handlers at 30 seconds wall-clock. This route needs 2 minutes and **cannot run on a Cloudflare Cron Trigger Worker**.

**Solution (user confirmed):** GitHub Actions scheduled workflow calls `https://www.peroot.space/api/cron/content-factory` with the `CRON_SECRET` Bearer header on the same Monday 09:00 UTC schedule. The content-factory route is excluded from the Cloudflare cron Worker entirely.

**Fix (Phase 3.5):** Create `.github/workflows/cron-content-factory.yml`. Do NOT include content-factory in the Cloudflare cron Worker.

### Issue J (Phase 1 finding) — `seo-console` uses `process.cwd()` + `existsSync`

`src/app/api/admin/seo-console/route.ts` lines 106-108:
```typescript
const sitemapExists =
  existsSync(join(process.cwd(), "src/app/sitemap.ts")) || ...
```
On Cloudflare Workers, source files are not on disk at runtime. `existsSync` always returns `false` → admin SEO console shows "sitemap not found" incorrectly.

**Fix (Phase 3):** Replace with `const sitemapExists = true;` — sitemap.ts exists in the build.

### Issue K (Phase 1 finding) — `after()` in `/api/enhance/route.ts`

`after()` (Next.js 15+ API for post-response work) is used at lines 668 and 795 for credit deduction and analytics logging. `@opennextjs/cloudflare` should map to `waitUntil()` internally, but this must be verified.

**Action (Phase 4):** Submit a prompt on the preview URL, verify credits decrease in Supabase. If `after()` fails, replace with direct `await` inside the handler.

### Issue I — Sentry `setUser()` in `src/proxy.ts` middleware

`src/proxy.ts` imports `* as Sentry from "@sentry/nextjs"` and calls `Sentry.setUser({ id: user.id })` at line 238.

With `middleware: { external: true }` in `open-next.config.ts`, the middleware runs in a Cloudflare V8 isolate. `@sentry/nextjs` has edge-safe exports but `Sentry.setUser()` behavior in a V8 isolate needs explicit testing.

**Mitigation (Phase 4):** During preview testing, trigger a test error and verify Sentry receives it with correct user context. If `setUser()` fails, remove it from `proxy.ts` — the `SentryUserProvider` client component already handles user identification on the frontend.

---

## PHASE 0: Pre-flight Checks
**Goal:** Confirm we have everything needed before touching anything.
**Time:** 30 minutes
**Risk:** Zero (read-only)

### Steps the agent runs

1. **Verify access to all systems:**
   - [x] Cloudflare API connected — account: Gal@joya-tech.net, ID: f78ded495dd768bd57b691493c39c5b5
   - [x] Cloudflare credentials in `.env.local` (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
   - [x] No existing Pages projects — clean slate
   - [ ] User confirms Vercel account access
   - [ ] User confirms Supabase project dashboard access
   - [ ] User confirms LemonSqueezy dashboard access
   - [ ] User confirms access to domain registrar (where peroot.space DNS is managed)

2. **Inventory current production:**
   ```bash
   mkdir -p migration-logs
   curl -I https://peroot.space
   curl -I https://www.peroot.space
   curl -I https://www.peroot.space/api/health
   git log --oneline -20
   git branch -a
   cat next.config.ts
   cat vercel.json
   ls -la .vercel 2>/dev/null || echo "no .vercel folder"
   ```

3. **Snapshot current production state:**
   - [ ] Screenshots of: dashboard, prompt enhancer, billing page, settings
   - [ ] Current page load time (Lighthouse)
   - [ ] API response times for `/api/enhance` and `/api/me`
   - [ ] Active user count from Supabase dashboard
   - [ ] Current monthly spend from Vercel dashboard

### Verification Gate before Phase 1

- [ ] https://www.peroot.space responds 200?
- [ ] Codebase runnable locally?
- [ ] User confirmed access to all services?
- [ ] `./migration-logs/phase-0-baseline.md` created with all snapshots?

**STOP if any answer is NO. Ask the user.**

---

## PHASE 1: Inventory & Audit
**Goal:** Confirm and extend pre-audit findings. Produce a complete compatibility report.
**Time:** 1-2 hours
**Risk:** Zero (read-only)

### Steps the agent runs

1. **Search for Vercel-specific imports:**
   ```bash
   grep -r "@vercel/" src/ --include="*.ts" --include="*.tsx"
   grep -r "process.env.VERCEL" src/
   grep -r "VERCEL_URL\|VERCEL_ENV\|VERCEL_REGION" src/
   grep -r "@vercel/analytics\|@vercel/speed-insights" src/ package.json
   ```
   Note: initial scan found zero `process.env.VERCEL*` usage — good sign.

2. **Find Node-only APIs:**
   ```bash
   grep -r "from ['\"]fs['\"]" src/
   grep -r "from ['\"]fs/promises['\"]" src/
   grep -r "from ['\"]child_process['\"]" src/
   grep -r "from ['\"]net['\"]" src/
   grep -r "node:" src/
   ```

3. **Audit which routes import the incompatible serverExternalPackages:**
   ```bash
   grep -rn "pdfjs-dist\|mammoth\|xlsx\|jsdom\|@mozilla/readability\|@napi-rs/canvas" src/ --include="*.ts" --include="*.tsx"
   ```
   These routes MUST stay on Node.js runtime (do not add `export const runtime = 'edge'`).

4. **Runtime audit of all API routes:**
   ```bash
   find src/app/api -name "route.ts" | sort
   grep -rn "export const runtime" src/app/api/ --include="*.ts"
   ```
   Currently known:
   - `src/app/api/faq-chat/route.ts` → `runtime = "nodejs"` (explicit)
   - `src/app/api/library/categories/route.ts` → `runtime = 'edge'` (explicit)
   - All others: implicit nodejs (Next.js default)

5. **Audit LLM provider SDKs in `src/lib/ai/gateway.ts`:**
   For each provider, verify uses `fetch` directly or SDK is edge-compatible.
   - Gemini (`@google/generative-ai`): fetch-based, edge-compatible
   - Mistral, others: check package internals
   Document in `./migration-logs/phase-1-llm-audit.md`

6. **Check ISR and revalidation:**
   ```bash
   grep -rn "revalidatePath\|revalidateTag\|export const revalidate" src/ --include="*.ts" --include="*.tsx"
   ```
   ISR on Cloudflare Pages with `@opennextjs/cloudflare` has limited support. Routes using ISR may need to become SSR (per-request rendering).

7. **Check for incompatible npm packages:**
   ```bash
   grep -E "\"(bcrypt|node-fetch|ws|sharp)\"" package.json
   ```

### Verification Gate before Phase 2

Produce `./migration-logs/phase-1-summary.md` with:
- [ ] All routes and their runtime classification (must-stay-nodejs / can-be-edge / already-edge)
- [ ] List of routes blocked by serverExternalPackages
- [ ] ISR/revalidation usage and migration plan
- [ ] Any incompatible packages found
- [ ] Overall estimate: green / yellow / red
- [ ] **Present to user. Get explicit GO before Phase 2.**

**STOP. Wait for user confirmation.**

---

## PHASE 2: Cloudflare Setup
**Goal:** Create Cloudflare Pages project, configure env vars and build settings.
**Time:** 30 minutes
**Risk:** Zero (no production change)

### Steps

1. **Cloudflare API already connected:**
   - Account ID: `f78ded495dd768bd57b691493c39c5b5`
   - API Token: in `.env.local`
   - No existing Pages projects (confirmed)

2. **User creates Cloudflare Pages project:**
   - Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
   - Authorize GitHub → select Peroot repo
   - **DO NOT click "Save and Deploy" yet.**
   - Project name: `peroot`
   - Production branch: `main`
   - Build settings:
     - Framework preset: **Next.js** (Cloudflare may suggest `@cloudflare/next-on-pages` — ignore that, we use `@opennextjs/cloudflare`)
     - Build command: `npx @opennextjs/cloudflare build`
     - Build output directory: `.open-next/assets`
     - Root directory: `Prut/web` (monorepo — Next.js app is not at repo root)
   - Node.js version: `20`

3. **CRITICAL — Compatibility flags (set BEFORE first deploy):**
   Pages project → Settings → Functions → Compatibility flags:
   - Add `nodejs_compat` to **Production** environment
   - Add `nodejs_compat` to **Preview** environment
   - Compatibility date: `2024-09-23` or later

4. **Create Workers KV namespace for ISR cache (Issue F decision — Option A):**
   - Cloudflare dashboard → Workers & Pages → KV → Create namespace
   - Name: `PEROOT_NEXT_CACHE`
   - Note the namespace ID
   - Add KV binding in Pages project: Settings → Functions → KV namespace bindings
     - Variable name: `NEXT_CACHE_WORKERS_KV`
     - KV namespace: `PEROOT_NEXT_CACHE`
   - This enables ISR on Cloudflare — homepage, blog, feed.xml, prompts pages will cache correctly.

5. **Image Resizing decision (ask user):**
   - **Option A (recommended):** Enable Cloudflare Image Resizing via dashboard → Speed → Optimization → Image Resizing. No code changes needed.
   - **Option B (fallback):** Set `images: { unoptimized: true }` in `next.config.ts`. Lower quality but simpler.
   - **Ask user which to use before proceeding.**

6. **Copy env vars from Vercel:**
   ```bash
   # Use Vercel CLI if installed, or user exports from dashboard
   npx vercel env ls 2>/dev/null || echo "vercel CLI not installed — export manually"
   ```
   - [ ] All vars added to Cloudflare Pages (production)
   - [ ] All vars added to Cloudflare Pages (preview)
   - [ ] Sensitive ones marked encrypted
   - [ ] Count matches Vercel exactly
   
   **Do NOT copy these Vercel-internal vars:**
   `VERCEL_URL`, `VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_GIT_*`, `ANALYZE`

7. **User confirms:**
   - [ ] Pages project created, connected to GitHub
   - [ ] `nodejs_compat` enabled on both environments
   - [ ] KV namespace `PEROOT_NEXT_CACHE` created and bound as `NEXT_CACHE_WORKERS_KV`
   - [ ] All env vars copied (count match confirmed)
   - [ ] Image resizing approach decided and configured
   - [ ] Correct build settings (especially root directory `Prut/web`)

### Verification Gate before Phase 3

- [ ] Cloudflare Pages project exists with correct settings
- [ ] `nodejs_compat` flag on both environments
- [ ] KV namespace created and bound as `NEXT_CACHE_WORKERS_KV`
- [ ] All env vars present
- [ ] **No deploy triggered yet.**

---

## PHASE 2.5: DNS Transfer to Cloudflare
**Goal:** Add `peroot.space` as a Cloudflare zone and change nameservers at Namecheap. This gives Cloudflare control of DNS, required for Phase 7 traffic routing.
**Time:** 30 minutes setup + 24-48 hours propagation (wait time, not active work)
**Risk:** Low — current DNS records remain unchanged during propagation. Vercel continues serving traffic.

**Must complete before Phase 7 (canary).** Can run in parallel with Phases 3–6.

### Current DNS state (confirmed)

```
Namecheap (registrar) → Vercel nameservers (ns1.vercel-dns.com / ns2.vercel-dns.com)
                       → Vercel manages A/CNAME records
```

### Steps

1. **Add `peroot.space` as a new zone in Cloudflare:**
   - Cloudflare dashboard → main navigation → Websites → Add a site
   - Enter: `peroot.space`
   - Select plan: **Free**
   - Cloudflare scans existing DNS and imports records automatically

2. **Verify imported DNS records match current Vercel records:**
   - Check `peroot.space` and `www.peroot.space` A/CNAME records
   - Check any MX records (email) are correctly imported
   - Check any TXT records (domain verification, SPF, DKIM) are imported
   - If any record is missing: add it manually before proceeding
   - **Do NOT delete or modify existing records — just verify they were imported**

3. **Note the two Cloudflare nameservers** Cloudflare assigns (example: `nora.ns.cloudflare.com` and `ben.ns.cloudflare.com` — yours will be different).

4. **Change nameservers at Namecheap:**
   - Log in to Namecheap → Domain List → `peroot.space` → Manage → Nameservers
   - Switch from "Vercel nameservers" to "Custom DNS"
   - Enter both Cloudflare nameservers from step 3
   - Save

5. **Wait for propagation (24-48 hours):**
   ```bash
   # Run periodically until Cloudflare nameservers appear:
   dig peroot.space NS +short
   # Expected: nora.ns.cloudflare.com, ben.ns.cloudflare.com (your actual values)
   ```
   During propagation, Vercel continues to serve traffic — no customer impact.

6. **Once propagation complete:**
   - Cloudflare dashboard → `peroot.space` zone → should show "Active"
   - DNS records: A/CNAME still pointing to Vercel → Vercel still serves all traffic
   - Cloudflare now controls DNS but is NOT proxying traffic yet (proxy off for now)

7. **Set Cloudflare proxy mode:**
   - For now, keep proxy (orange cloud) OFF on all records
   - The proxy switches on in Phase 7 when we add the routing Worker

### Verification Gate before Phase 7

- [ ] `peroot.space` zone active in Cloudflare dashboard
- [ ] All DNS records imported and matching pre-migration state
- [ ] `dig peroot.space NS` returns Cloudflare nameservers
- [ ] `curl -I https://www.peroot.space` still returns 200 (Vercel still serving)
- [ ] MX/TXT records intact (email unaffected)

**STOP if any answer is NO. Do not proceed to Phase 7 until DNS is on Cloudflare.**

---

## PHASE 3: Code Compatibility
**Goal:** Make codebase work with `@opennextjs/cloudflare`. Feature branch only.
**Time:** 3-5 hours
**Risk:** Low (branch, not main)

### Why `@opennextjs/cloudflare` not `@cloudflare/next-on-pages`

`@cloudflare/next-on-pages` requires ALL routes to use edge runtime and cannot handle Node.js-only packages. `@opennextjs/cloudflare` supports mixed runtimes (some routes nodejs, some edge), handles `nodejs_compat` correctly, and is the current standard for Next.js App Router on Cloudflare. This is not negotiable for this codebase.

### Steps

1. **Create feature branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b cloudflare-migration
   ```

2. **Install adapter:**
   ```bash
   npm install --save-dev @opennextjs/cloudflare wrangler
   ```
   Do NOT install `@cloudflare/next-on-pages`.

3. **Create `Prut/web/open-next.config.ts`:**
   ```typescript
   import type { OpenNextConfig } from "@opennextjs/cloudflare";
   
   const config: OpenNextConfig = {
     default: {
       override: {
         wrapper: "cloudflare-node",
         converter: "edge",
         incrementalCache: "kv",       // Workers KV — preserves ISR for homepage/blog/feed/prompts
         tagCache: "dummy",
         queue: "dummy",
       },
     },
     middleware: {
       external: true,
     },
   };
   
   export default config;
   ```
   Note: `incrementalCache: "kv"` requires the `NEXT_CACHE_WORKERS_KV` binding created in Phase 2.

4. **Create `Prut/web/wrangler.toml`:**
   ```toml
   name = "peroot"
   compatibility_date = "2024-09-23"
   compatibility_flags = ["nodejs_compat"]
   pages_build_output_dir = ".open-next/assets"
   
   [assets]
   directory = ".open-next/assets"
   binding = "ASSETS"
   
   [[kv_namespaces]]
   binding = "NEXT_CACHE_WORKERS_KV"
   id = "<your-kv-namespace-id-from-phase-2>"
   ```

5. **Fix Issue B — Remove Vercel CSP domains from `next.config.ts`:**
   - Remove `https://va.vercel-scripts.com` from `script-src`
   - Remove `https://va.vercel-scripts.com` from `connect-src`
   - Remove `https://vitals.vercel-insights.com` from `connect-src`
   - If `@vercel/analytics` or `@vercel/speed-insights` are imported anywhere in `src/`, remove those imports

6. **Fix Issue D — Image optimization (per Phase 2 decision):**
   If Cloudflare Image Resizing is enabled: no code change needed.
   If `unoptimized: true` was chosen:
   ```typescript
   // next.config.ts — images section
   images: {
     unoptimized: true,
     remotePatterns: [ /* keep existing */ ],
   },
   ```

7. **Do NOT blanket-add `export const runtime = 'edge'`.**
   Based on Phase 1 audit findings, mark only routes that:
   - Have no imports of the 6 serverExternalPackages
   - Have no Node.js-only APIs
   Routes using `pdfjs-dist`, `mammoth`, `xlsx`, `jsdom`, `@mozilla/readability`, `@napi-rs/canvas` stay as nodejs runtime. The `nodejs_compat` flag handles them on Cloudflare.

8. **Fix Issue G — Replace `VercelAnalytics` with no-op:**
   ```tsx
   // src/components/providers/VercelAnalytics.tsx — replace entire file with:
   "use client";
   export function VercelAnalytics() {
     return null;
   }
   ```
   Then remove from `package.json`:
   ```bash
   npm uninstall @vercel/analytics @vercel/speed-insights
   ```
   `src/app/layout.tsx` does NOT need changes — `<VercelAnalytics />` still renders (just returns null now).

9. **Fix Issue H — Exclude content-factory from cron Worker (documented in Phase 3.5):**
   No code change needed to the route itself. The GitHub Actions workflow (created in Phase 3.5) replaces Vercel's invocation. Ensure `src/app/api/cron/content-factory/route.ts` still has `verifyCronSecret(request)` — it does.

10. **Note Issue I — Sentry `setUser()` in proxy.ts:**
    No code change in this phase. This will be tested explicitly in Phase 4.
    If Phase 4 testing shows `Sentry.setUser()` fails in the V8 isolate:
    ```typescript
    // Remove from src/proxy.ts line 238:
    // Sentry.setUser({ id: user.id });
    ```
    The `SentryUserProvider` client component handles user identification on the frontend already.

11. **Fix Issue J — `seo-console` `existsSync` (admin-only, cosmetic):**
    ```typescript
    // src/app/api/admin/seo-console/route.ts — replace lines 105-108:
    // const sitemapExists =
    //   existsSync(join(process.cwd(), "src/app/sitemap.ts")) || ...
    const sitemapExists = true; // sitemap.ts exists — hardcoded for CF compatibility
    ```
    Also update imports: remove `existsSync` from `"fs"` and `join` from `"path"` if no longer needed.

12. **Verify `after()` mapping (Issue K) — note for Phase 4:**
    No code change needed now. `@opennextjs/cloudflare` handles `after()` → `waitUntil()` mapping.
    Add to Phase 4 test checklist: submit prompt, verify credits deducted in Supabase.

13. **Verify `src/proxy.ts` (middleware) is edge-compatible:**
    With `middleware: { external: true }` in `open-next.config.ts`, middleware runs separately.
    Check:
    - [ ] No Node.js-only imports in `src/proxy.ts` (confirmed: only `@sentry/nextjs`, `@supabase/ssr`, `@upstash/redis` — all edge-safe)
    - [ ] Supabase SSR client (`@supabase/ssr`) is used — edge-safe
    - [ ] CSRF logic uses `URL`, `request.headers`, `request.cookies` — Web APIs, edge-safe
    If any issue, adjust the middleware section in `open-next.config.ts`.

12. **Sentry — verify build process:**
    `withSentryConfig` runs during `next build`, which `@opennextjs/cloudflare` calls first. Source maps should upload. If the Cloudflare-specific build step fails because of Sentry:
    ```bash
    SENTRY_DISABLE_WEBPACK_PLUGIN=1 npx @opennextjs/cloudflare build
    ```
    Note in Phase 4 verification: confirm Sentry receives errors from preview URL.

13. **Add build scripts to `package.json`:**
    ```json
    "build:cloudflare": "npx @opennextjs/cloudflare build",
    "preview:cloudflare": "npx wrangler pages dev",
    "deploy:cloudflare": "npx wrangler pages deploy"
    ```

14. **Verify both builds succeed:**
    ```bash
    npm run build              # Standard Next.js build — must still work
    npm run build:cloudflare   # Cloudflare build — must also succeed
    ```
    If Cloudflare build fails: read the error, fix one issue at a time, re-run.

15. **Local Cloudflare dev test:**
    ```bash
    npm run preview:cloudflare
    # Serves at http://localhost:8788
    ```
    - [ ] Homepage loads
    - [ ] Login with test account
    - [ ] Submit prompt, verify streaming
    - [ ] Context file upload (tests Node.js-runtime routes)
    - [ ] Billing page loads
    - [ ] Logout works

16. **Commit and push:**
    ```bash
    git add .
    git commit -m "feat(cloudflare): add opennextjs adapter, fix CSP, wrangler config, replace VercelAnalytics"
    git push origin cloudflare-migration
    ```

### Verification Gate before Phase 3.5

- [ ] `npm run build` succeeds (Vercel build unbroken)
- [ ] `npm run build:cloudflare` succeeds
- [ ] All 6 local tests passed
- [ ] No Node.js-only routes incorrectly marked as edge
- [ ] CSP no longer references Vercel domains
- [ ] Branch pushed

---

## PHASE 3.5: Cron Job Migration
**Goal:** Replace Vercel cron jobs across two tracks: Cloudflare Cron Worker (4 jobs) + GitHub Actions (1 job).
**Time:** 1-2 hours
**Risk:** Low (Vercel crons keep running until Phase 9)

### Context

Vercel cron jobs are invoked via HTTP. Cloudflare Pages has no cron system. The 5 jobs split into two tracks:

**Track A — Cloudflare Cron Triggers Worker (4 jobs, all ≤30s):**
- `send-emails` — `0 9 * * *` (daily 09:00 UTC)
- `reengagement` — `0 10 * * *` (daily 10:00 UTC)
- `sync-subscriptions` — `0 6 * * *` (daily 06:00 UTC)
- `data-retention` — `0 3 1 * *` (monthly 1st 03:00 UTC)

**Track B — GitHub Actions scheduled workflow (1 job, needs 120s):**
- `content-factory` — `0 9 * * 1` (weekly Mon 09:00 UTC)
- Reason: `maxDuration = 120` — exceeds Cloudflare's 30s wall-clock limit for HTTP handlers.

### Steps

1. **Verify cron route authentication:**
   ```bash
   grep -rn "verifyCronSecret\|CRON_SECRET" src/app/api/cron/ --include="*.ts"
   ```
   All 5 routes use `verifyCronSecret(request)` from `src/lib/cron-auth.ts` (confirmed). Both the Cloudflare Worker and GitHub Actions will send `Authorization: Bearer {CRON_SECRET}`.

2. **Track A — Create `Prut/web/cron-worker/index.ts`:**
   ```typescript
   interface Env {
     CRON_SECRET: string;
     APP_URL: string;
   }
   
   const CRON_ROUTES: Record<string, string> = {
     "0 9 * * *":   "/api/cron/send-emails",
     "0 10 * * *":  "/api/cron/reengagement",
     "0 6 * * *":   "/api/cron/sync-subscriptions",
     "0 3 1 * *":   "/api/cron/data-retention",
   };
   
   export default {
     async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
       const path = CRON_ROUTES[event.cron];
       if (!path) {
         console.error(`Unknown cron expression: ${event.cron}`);
         return;
       }
       const response = await fetch(`${env.APP_URL}${path}`, {
         method: "GET",
         headers: { "Authorization": `Bearer ${env.CRON_SECRET}` },
       });
       if (!response.ok) {
         console.error(`Cron ${path} failed: ${response.status}`);
       } else {
         console.log(`Cron ${path} OK: ${response.status}`);
       }
     },
   };
   ```

3. **Track A — Create `Prut/web/cron-worker/wrangler.toml`:**
   ```toml
   name = "peroot-cron"
   main = "index.ts"
   compatibility_date = "2024-09-23"
   compatibility_flags = ["nodejs_compat"]
   
   [triggers]
   crons = [
     "0 9 * * *",
     "0 10 * * *",
     "0 6 * * *",
     "0 3 1 * *"
   ]
   
   [vars]
   APP_URL = "https://www.peroot.space"
   ```
   Note: `content-factory` is intentionally absent from this Worker.

4. **Track B — Create `.github/workflows/cron-content-factory.yml`:**
   ```yaml
   name: Content Factory Cron
   
   on:
     schedule:
       - cron: "0 9 * * 1"  # Monday 09:00 UTC
     workflow_dispatch:      # Allow manual trigger
   
   jobs:
     run-content-factory:
       runs-on: ubuntu-latest
       timeout-minutes: 5
       steps:
         - name: Trigger content-factory
           run: |
             response=$(curl -s -o /dev/null -w "%{http_code}" \
               -X GET \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
               https://www.peroot.space/api/cron/content-factory)
             echo "Response: $response"
             if [ "$response" != "200" ]; then
               echo "Content factory failed with status $response"
               exit 1
             fi
   ```
   - Add `CRON_SECRET` to GitHub repository secrets (Settings → Secrets → Actions)
   - This runs directly against production URL at all times (no preview variant needed)

5. **Deploy Track A Worker during Phase 4 (not now):**
   Deploy against preview URL first, then update `APP_URL` to production in Phase 9.
   ```bash
   cd cron-worker
   npx wrangler deploy
   npx wrangler secret put CRON_SECRET   # enter the secret
   ```

6. **Enable Track B GitHub Actions workflow:**
   - Merge to `main` so the schedule fires automatically
   - GitHub Actions schedule crons only run on the default branch
   - On first push, manually trigger to verify it works: Actions tab → Content Factory Cron → Run workflow

7. **Timing rule:** Do NOT disable Vercel cron jobs until the Cloudflare Worker and GitHub Actions have each fired successfully for 72+ hours. All three systems run simultaneously without conflict — they all make authenticated HTTP calls to the same idempotent routes.

### Verification Gate before Phase 4

- [ ] Track A: Cloudflare Worker code written for 4 crons (content-factory excluded)
- [ ] Track B: GitHub Actions workflow created for content-factory
- [ ] `CRON_SECRET` added to GitHub repository secrets
- [ ] All 5 cron routes confirmed to use `verifyCronSecret(request)`
- [ ] Schedule expressions match `vercel.json` exactly
- [ ] GitHub Actions manually triggered and returned HTTP 200

---

## PHASE 4: Parallel Deploy (Preview URL)
**Goal:** Deploy to Cloudflare preview URL. Vercel still owns peroot.space.
**Time:** 30 minutes + testing
**Risk:** Zero (preview only, no production traffic)

### Steps

1. **Wait for Cloudflare auto-build on the pushed branch:**
   - Cloudflare dashboard → Workers & Pages → peroot → Deployments
   - Preview URL: `cloudflare-migration.peroot.pages.dev` (or similar)

2. **If build fails:** Read full build log. Most common causes:
   - Missing env var on Cloudflare
   - `nodejs_compat` flag not set
   - Import failing — check Phase 1 findings
   Fix and push. Never proceed with a broken build.

3. **Add preview domain to Supabase Auth:**
   - Supabase dashboard → Authentication → URL Configuration → Redirect URLs
   - Add `https://cloudflare-migration.peroot.pages.dev`
   - Required for OAuth and session callbacks to work on preview URL
   - Remove this URL in Phase 10 cleanup

4. **HTTP smoke tests:**
   ```bash
   PREVIEW_URL="https://cloudflare-migration.peroot.pages.dev"
   curl -I $PREVIEW_URL                  # Expect 200
   curl -I $PREVIEW_URL/api/health       # Expect 200
   curl -I $PREVIEW_URL/api/me           # Expect 401 (unauthenticated — correct)
   ```

5. **Manual user testing (incognito window):**
   - [ ] Homepage loads <2s
   - [ ] Sign-up with new test email
   - [ ] Login with existing test account
   - [ ] Submit prompt → streaming response
   - [ ] Context file upload works (Node.js runtime routes)
   - [ ] Test LLM fallback chain
   - [ ] Settings page — profile editable
   - [ ] Billing page — shows correct tier
   - [ ] Logout
   - [ ] Hebrew RTL renders correctly
   - [ ] Mobile (iPhone Safari + Android Chrome)
   - [ ] Sentry receives a test error (trigger one intentionally, check Sentry dashboard)

6. **Deploy cron worker against preview URL:**
   ```bash
   cd cron-worker
   # Temporarily set APP_URL to preview URL for testing
   npx wrangler deploy
   npx wrangler secret put CRON_SECRET
   ```
   Trigger a manual test run from Cloudflare dashboard → Workers → peroot-cron → Triggers → Trigger.
   Verify the route returned 200.

7. **Document comparison in `./migration-logs/phase-4-comparison.md`**

### Verification Gate before Phase 5

- [ ] Preview URL responds 200
- [ ] All 11 manual tests passed
- [ ] Cron worker deployed and at least one manual trigger succeeded
- [ ] No errors in Cloudflare Pages logs
- [ ] Performance equal or better than Vercel
- [ ] Sentry receiving events from preview
- [ ] **User personally tested and explicitly approved**

**STOP. User must say "Phase 4 complete, proceed to Phase 5."**

---

## PHASE 5: AI Gateway Setup (optional but recommended)
**Goal:** Route LLM calls through Cloudflare AI Gateway for caching and observability.
**Time:** 1-2 hours
**Risk:** Low (env-var gated, easily reversible)

Saves 15-40% on LLM costs through semantic caching. AI Gateway permission confirmed on current Cloudflare token.

### Hookup point: `src/lib/ai/models.ts` (NOT gateway.ts)

`gateway.ts` uses `streamText`/`generateText` from `"ai"` and does not instantiate providers — it receives provider instances from `models.ts`. The AI Gateway `baseURL` must be set at **provider instantiation** in `src/lib/ai/models.ts`.

### Steps

1. **User creates AI Gateway:**
   - Cloudflare dashboard → AI → AI Gateway → Create Gateway
   - Name: `peroot-llm`
   - Note the Universal Endpoint URL

2. **Update `src/lib/ai/models.ts`** — add `baseURL` to all provider instantiations, gated by env var:

   ```typescript
   const cfGateway = process.env.CF_AI_GATEWAY_URL;
   
   // Google (primary + backup) — both instances need baseURL:
   const google = createGoogleGenerativeAI({
     apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
     ...(cfGateway ? { baseURL: `${cfGateway}/google-ai-studio/v1` } : {}),
   });
   const googleBackup = createGoogleGenerativeAI({
     apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY_BACKUP,
     ...(cfGateway ? { baseURL: `${cfGateway}/google-ai-studio/v1` } : {}),
   });
   
   // Mistral:
   const mistralProvider = createMistral({
     apiKey: process.env.MISTRAL_API_KEY,
     ...(cfGateway ? { baseURL: `${cfGateway}/mistral` } : {}),
   });
   
   // Groq — currently uses singleton `groq("model")`. Must switch to createGroq() for baseURL:
   import { createGroq } from "@ai-sdk/groq";
   const groqProvider = createGroq({
     apiKey: process.env.GROQ_API_KEY,
     ...(cfGateway ? { baseURL: `${cfGateway}/groq` } : {}),
   });
   // Then: groqProvider("llama-4-scout-17b-16e-instruct") and groqProvider("gpt-oss-20b") etc.
   ```

3. **Add env var:**
   `CF_AI_GATEWAY_URL` = `https://gateway.ai.cloudflare.com/v1/f78ded495dd768bd57b691493c39c5b5/peroot-llm`
   - Add to Cloudflare Pages (production + preview)
   - Add to Vercel (so both use same gateway during transition, unified cache)
   - Add to local `.env.local`

4. **Configure AI Gateway caching:**
   - Semantic cache: similarity threshold 0.92, TTL 60 minutes

5. **Test:** Submit same prompt twice. Second response should be "CACHE HIT" in AI Gateway logs.

### Verification Gate before Phase 6

- [ ] Gateway created in Cloudflare dashboard
- [ ] `models.ts` updated for Google (x2), Mistral, Groq — all with `baseURL` when `CF_AI_GATEWAY_URL` set
- [ ] Groq switched from singleton to `createGroq({ baseURL })` pattern
- [ ] Preview URL still works — all providers respond correctly
- [ ] Cache hit confirmed (submit same prompt twice, check AI Gateway logs)
- [ ] Circuit breaker in `gateway.ts` still coexists (test a provider failure — breaker should open)

---

## PHASE 6: Internal Testing (Soak Test)
**Goal:** 48 hours on preview URL with synthetic + personal traffic.
**Time:** 48 hours
**Risk:** Zero

### Steps

1. **Synthetic monitor:** Configure UptimeRobot (or equivalent) on preview URL health endpoint, every 5 minutes. Log to `./migration-logs/soak-test.log`.

2. **User uses preview URL personally for 48 hours.**

3. **Verify cron worker fires on schedule:** Check Cloudflare Workers logs after each fire.

4. **At 48 hours:**
   - [ ] Uptime 100%
   - [ ] p95 latency ≤ Vercel + 100ms
   - [ ] Zero 5xx errors
   - [ ] Zero auth failures
   - [ ] All 4 Cloudflare Worker cron routes returned 200 at least once on schedule
   - [ ] GitHub Actions content-factory fired and returned 200 at least once

### Verification Gate before Phase 7

- [ ] 48 hours passed
- [ ] All metrics clean
- [ ] Cron jobs verified
- [ ] **User explicitly approves canary. This is the last safe stop.**

---

## PHASE 7: Canary — 10% Traffic Split
**Goal:** Route 10% of production traffic to Cloudflare.
**Time:** 24 hours minimum
**Risk:** Medium (real customers, limited blast radius)

### Pre-canary (24 hours before)

1. **Lower DNS TTL to 60s** on `peroot.space` and `www.peroot.space`.
2. **Open monitoring tabs:** Cloudflare Analytics, Vercel dashboard, Supabase logs.

### Canary execution

3. **Add custom domains to Pages project** (don't activate yet):
   - `peroot.space` and `www.peroot.space`
   - Verify SSL cert issued

4. **Deploy routing Worker:**
   ```javascript
   export default {
     async fetch(request) {
       const url = new URL(request.url);
       if (Math.random() < 0.10) {
         url.hostname = 'peroot.pages.dev';  // Cloudflare
       } else {
         url.hostname = 'cname.vercel-dns.com';  // Vercel
       }
       return fetch(url, { headers: request.headers, method: request.method, body: request.body });
     }
   };
   ```

5. **Watch first 30 minutes intensively, then 24 hours.**

### Verification Gate before Phase 8

After 24 hours at 10%:
- [ ] Zero 5xx on Cloudflare-served requests
- [ ] No degradation on Vercel-served requests
- [ ] No customer complaints
- [ ] Streaming works for all sampled requests
- [ ] Auth success rate ≥ Vercel baseline
- [ ] Webhooks processing correctly
- [ ] Cloudflare error rate < 0.1%

**Rollback triggers (immediate, no debate):** 5xx > 1% for 5min, any auth failure, any webhook failure, any customer complaint.

---

## PHASE 8: Gradual Rollout — 25% → 50% → 75% → 100%
**Goal:** Increase Cloudflare traffic daily.
**Time:** 4 days

**Day 1:** 25% — watch 24h
**Day 2:** 50% — watch 24h
**Day 3:** 75% — watch 24h
**Day 4:** 100% (remove Worker or point DNS directly at Cloudflare Pages)

At each stage verify: 5xx stable, p95 latency stable, no complaints, streaming works, webhooks work, AI Gateway cache hit rate > 10%.

### Verification Gate before Phase 9

- [ ] 100% for 24 hours
- [ ] All metrics at or better than Vercel baseline
- [ ] Zero rollback events in past 24 hours
- [ ] User confirms it "feels right"

---

## PHASE 9: Stabilization — 7 Days at 100%
**Goal:** 7 consecutive clean days. Watch for slow-burn issues.
**Time:** 7 days

### Daily checklist

- [ ] Cloudflare Pages: error rate, p95 latency, request count
- [ ] AI Gateway: cache hit rate, provider errors
- [ ] Supabase: auth success rate, query latency
- [ ] LemonSqueezy: webhook success rate
- [ ] Cloudflare cron Worker: 4 scheduled jobs fired today and returned 200
- [ ] GitHub Actions content-factory: fired on Monday (check weekly), returned 200
- [ ] User-reported issues: zero
- [ ] Vercel: still healthy (do NOT decommission yet)

### During Phase 9

Update cron worker `APP_URL` to production:
```bash
cd cron-worker
npx wrangler secret put APP_URL  # https://www.peroot.space
```

### Slow-burn risks to watch

- DNS caching issues for users with aggressive local DNS
- Edge runtime memory limits on long sessions
- AI Gateway rate limits if cache miss rate too high
- Cron route timeout — Cloudflare Workers default 30s CPU, verify all cron routes return within that

### Verification Gate before Phase 10

- [ ] 7 consecutive days clean
- [ ] Zero customer complaints for 7 days
- [ ] All daily checklists complete
- [ ] **User explicitly says: "Migration complete, decommission Vercel."** (required exact phrase)

---

## PHASE 10: Decommission Vercel
**Goal:** Cleanly shut down Vercel deployment.
**Time:** 30 minutes

### Steps

1. **Backup:** Export Vercel env vars + screenshot project settings.

2. **Disconnect Vercel repo** (keeps project for 30 days):
   Vercel → Project → Settings → Git → Disconnect repository.

3. **Update LemonSqueezy webhook URL** to `https://www.peroot.space/api/webhooks/lemonsqueezy`. Test with $1 purchase.

4. **Clean up Supabase Auth:**
   - Remove Cloudflare preview URL from Redirect URLs (added in Phase 4)
   - Verify only production URL remains

5. **Update any remaining Vercel references:** OAuth callback URLs in Supabase Auth (Google, GitHub OAuth).

6. **Bump DNS TTL back to 3600s.**

7. **Final verification:**
   - [ ] www.peroot.space loads
   - [ ] Login works
   - [ ] Prompt + streaming works
   - [ ] Webhook tested
   - [ ] No services pointing to Vercel URLs

8. **Tag:**
   ```bash
   git tag -a v2.0.0-cloudflare -m "Migration to Cloudflare Pages complete"
   git push origin v2.0.0-cloudflare
   ```

9. **After 30 days:** Delete Vercel project.

### Final Gate

- [ ] All steps complete
- [ ] User confirms: "Vercel decommissioned, migration done"

---

## Rollback Procedures

### From Phase 7/8 (canary/rollout)
1. Update routing Worker to `random < 0.0` (0% Cloudflare)
2. Redeploy Worker (~1 minute)
3. Verify all traffic → Vercel
4. Time: ~2 minutes

### From Phase 9 (100% Cloudflare)
1. DNS swap: change `peroot.space` CNAME to `cname.vercel-dns.com`
2. With 60s TTL: propagation ~2 minutes
3. Verify Vercel headers via curl
4. Document in `./migration-logs/rollback-{date}.md`
5. Time: ~5 minutes

### From Phase 10 (Vercel paused)
1. Vercel → Reconnect repository
2. Trigger manual deploy from main
3. Once green, DNS swap as above
4. Time: ~15 minutes

### Auto-rollback triggers (no debate)
- 5xx > 1% for 5+ minutes
- Auth failure rate > 0.5%
- Any payment webhook failure
- Any customer complaint
- Cloudflare service outage
- p95 latency degradation > 500ms

---

## When the agent must STOP and ASK

1. Any verification gate fails
2. Cost-incurring action
3. External account creation or config change needed
4. DNS change about to happen
5. Unexpected complexity discovered
6. Customer-impacting decision needed

---

## Success Criteria

- [ ] peroot.space serves from Cloudflare Pages
- [ ] Full feature parity confirmed
- [ ] Performance equal or better than Vercel
- [ ] Zero customer issues during migration
- [ ] All 5 cron jobs on Cloudflare Cron Triggers for 7+ days
- [ ] LLM streaming flawless for 7+ consecutive days
- [ ] AI Gateway caching active (optional but recommended)
- [ ] Vercel decommissioned
- [ ] Migration logs archived in `./migration-logs/`
- [ ] User confirms complete

---

## Tools Used

- `git` — branch management
- `curl` — HTTP probes
- `npm` / `npx` — dependencies
- `npx @opennextjs/cloudflare build` — Cloudflare build
- `npx wrangler` — Cloudflare dev/deploy
- Cloudflare API (`CLOUDFLARE_API_TOKEN` in `.env.local`) — account management
- File system — `./migration-logs/`

---

## Changelog

**v1 (original):** 2026-05-05 — Initial plan  
**v2:** 2026-05-05 — Codebase audit corrections:
- Replaced `@cloudflare/next-on-pages` with `@opennextjs/cloudflare` throughout (Phase 2, 3)
- Added Phase 3.5 for 5 cron job migrations (critical gap in v1)
- Fixed Phase 3 to NOT blanket-add edge runtime — per-route assessment required due to `serverExternalPackages`
- Fixed Phase 5 AI Gateway to target `src/lib/ai/gateway.ts` specifically
- Added "Known Codebase Issues" section with 5 confirmed blockers
- Added Supabase Auth redirect URL step for preview testing (Phase 4)
- Added Sentry `withSentryConfig` compatibility note (Phase 3)
- Added image optimization strategy (Phase 2, 3)
- Fixed build output directory: `.open-next/assets` (not `.vercel/output/static`)
- Added CSP cleanup for `va.vercel-scripts.com` and `vitals.vercel-insights.com` (Phase 3)
- Added cron route auth verification requirement (Phase 3.5)
- Removed `vercel` as a required dependency (not needed by `@opennextjs/cloudflare`)

**v3 (this version):** 2026-05-05 — Deep research + Cloudflare access audit:
- Added Issue F: `VercelAnalytics` actively rendered in layout.tsx — must replace with no-op (Phase 3)
- Added Issue G: `content-factory` maxDuration=120 is hard blocker — GitHub Actions solution (Phase 3.5)
- Added Issue H: Sentry `setUser()` in proxy.ts middleware — needs Phase 4 explicit test
- Added Phase 2.5: DNS Transfer — add peroot.space zone to Cloudflare, change nameservers at Namecheap from Vercel to Cloudflare before Phase 7
- Updated Phase 3.5 cron Worker to exclude content-factory (Track A: CF Worker 4 crons; Track B: GitHub Actions 1 cron)
- Added GitHub Actions workflow for content-factory cron (`.github/workflows/cron-content-factory.yml`)
- Fixed Phase 5 AI Gateway hookup: target is `src/lib/ai/models.ts` not gateway.ts — `baseURL` must be set at provider instantiation
- Documented Groq singleton → `createGroq({ baseURL })` migration required for AI Gateway support
- Updated status tracker to include Phase 2.5
- Confirmed Cloudflare token access: no IP restriction, AI Gateway Read/Write/Run confirmed

**END OF PLAN**

*Last updated: 2026-05-05*
