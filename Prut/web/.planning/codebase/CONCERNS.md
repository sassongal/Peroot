# Codebase Concerns

**Analysis Date:** 2026-04-11  
**Supply chain note (2026-04-11):** `npm audit fix` + Next **16.2.3** applied; remaining high is **`xlsx`** only (no upstream fix). See `IMPROVEMENT_BACKLOG.md` progress snapshot.

## Tech Debt

**Large surface-area files (hard to change safely):**

- Issue: Very large modules concentrate behavior and increase merge/regression risk.
- Files: `src/app/HomeClient.tsx`, `src/hooks/useLibrary.ts`, `src/app/admin/users/[id]/page.tsx`, `src/app/api/enhance/route.ts`, `src/app/api/webhooks/lemonsqueezy/route.ts`, `src/lib/engines/scoring/prompt-dimensions.ts`, `src/lib/chain-presets.ts`, admin tabs such as `src/components/admin/tabs/CostsTab.tsx`, `HealthTab.tsx`
- Impact: Slower reviews, harder testing, higher bug rate on edits.
- Fix approach: Extract subcomponents/hooks/pure functions; split webhook handlers by phase; keep enhance route orchestration thin.

**Admin API authorization duplication:**

- Issue: Two styles — `withAdmin` in `src/lib/api-middleware.ts` vs inline `validateAdminSession()` from `src/lib/admin/admin-security.ts` across many routes.
- Files: `src/lib/api-middleware.ts`, `src/lib/admin/admin-security.ts`, most `src/app/api/admin/**/route.ts`
- Impact: Inconsistent guard behavior risk; repeated boilerplate.
- Fix approach: Standardize on `withAdmin` (or a single wrapper) and migrate remaining routes.

**JSON-LD / SEO duplication:**

- Issue: Similar JSON-LD and meta patterns repeated across many `page.tsx` files.
- Files: `src/components/seo/HomeSEOContent.tsx`, various `src/app/**/page.tsx`
- Impact: Drift in structured data and harder global SEO changes.
- Fix approach: Centralize builders for Organization/WebSite/Article schema.

**Knip / dead-code signal:**

- Issue: Knip reports unused files, unlisted dependencies, and many unused exports (77 exports, 85 types, 3 unused files).
- Evidence: `npx knip` (2026-04-11) — e.g. scripts `scripts/canonicalize-tailwind-classes.mjs`, `scripts/test-engines-live.ts` flagged unused; **`public/sw.js` is a false positive** (registered in `src/components/providers/ServiceWorkerRegistration.tsx`). `postcss` / `dotenv` / `knip` are now declared in `package.json` — move tooling packages to **devDependencies** when cleaning the manifest.
- Impact: Noise in reviews; some exports are library API vs truly dead code — triage required.
- Fix approach: Add missing deps to `package.json` or adjust knip config; remove or scope exports; delete obsolete scripts after confirmation.

**Tooling metadata:**

- Issue: `tsx` / `repomix` invoked via `npx` in scripts — knip may still flag as unlisted binaries; optional to add as devDependencies for lockfile clarity.
- Files: `package.json`
- Fix approach: Declare or document; keep `postcss` / `dotenv` / `knip` in **devDependencies** (not production `dependencies`).

## Known Bugs

No separate ticket list was validated in this pass. **None blocking** typecheck or lint (errors). Track product bugs in your issue tracker; this document captures structural risks.

## Security Considerations

**Dependency vulnerabilities (npm audit):**

- Risk: Direct `xlsx` (SheetJS) — advisories including ReDoS / prototype pollution; **no fix available** in npm advisory DB as of 2026-04-11.
- Evidence: After `npm audit fix` and Next **16.2.3**, `npm audit` typically shows **1 high** (`xlsx` only).
- Current mitigation: `xlsx` used only in server-side office extraction (`src/lib/context/engine/extract/file-office.ts`), not in browser; buffer size matches `dispatchFile` limit, `sheetRows` caps parse work, `MAX_CHARS` trims output.
- Recommendations: Prefer trusted uploads only; long-term replace SheetJS or vendor a patched fork; review `sanitize-html` for HTML paths

**Middleware CSRF and Bearer bypass:**

- Risk: `Authorization: Bearer` requests skip CSRF origin checks by design (`src/middleware.ts`) for API keys/extensions.
- Current mitigation: Route-level auth and API key validation
- Recommendations: Ensure no state-changing handler relies on Bearer alone where cross-site abuse is relevant; document extension security model

**HTML injection / XSS:**

- Risk: `dangerouslySetInnerHTML` used for JSON-LD and controlled snippets; user HTML must go through `src/components/ui/SafeHtmlInner.tsx` (sanitize-html).
- Files: Many `src/app/**/page.tsx`, `src/app/layout.tsx`
- Recommendations: Audit any new rich-HTML surfaces; keep CSP in `next.config.ts` under review when adding scripts

**Webhook hardening (positive note):**

- LemonSqueezy webhook uses signing secret, timing-safe compare, idempotency patterns — `src/app/api/webhooks/lemonsqueezy/route.ts` (still large — see Tech Debt)

## Performance Bottlenecks

**Enhance route:**

- Problem: Complex orchestration (auth, credits, cache, engines, streaming, `after()` deferred work).
- File: `src/app/api/enhance/route.ts`
- Measurement: Not profiled in this audit — use production traces (Sentry, Vercel) for p95
- Improvement path: Already uses `after()` for post-stream work; keep DB writes off the critical stream path

**Bundle size:**

- Problem: Large client components and icon sets affect JS payload.
- Files: `HomeClient.tsx`, `src/components/ui/PlatformIcons.tsx`
- Improvement path: `next.config.ts` `optimizePackageImports`; dynamic imports for heavy admin or rare modals

## Fragile Areas

**Middleware:**

- File: `src/middleware.ts`
- Why fragile: Ordering of maintenance, auth prefixes, CSRF, Sentry context — behavior is easy to break when adding routes
- Common failures: New `/api` routes wrong exempt list; session refresh edge cases
- Safe modification: Extend `src/__tests__/middleware.test.ts` before behavioral changes; note Next 16 `proxy.ts` migration mentioned in tests

**Circuit breaker:**

- File: `src/lib/ai/circuit-breaker.ts`
- Why fragile: Logging uses `console` — inconsistent with `src/lib/logger.ts`
- Improvement: Route through structured logger for observability

## Scaling Limits

**Supabase / Vercel:**

- Current capacity: Depends on plan — document in ops runbook (not measured here)
- Symptoms at limit: DB connection limits, function timeouts, rate limits from AI providers
- Scaling path: Supabase compute, Vercel plan, Redis tuning, concurrency slots in `src/lib/ai/concurrency.ts`

## Dependencies at Risk

**npm audit (2026-04-11):**

- High-severity transitive issues reported (e.g. `@xmldom/xmldom`, `flatted`, `minimatch` — see full `npm audit` output)
- `xlsx` — direct dependency; advisory notes **no fix available** — track upstream or replace for untrusted input paths

**Optional / legacy env:**

- `DEEPSEEK_API_KEY` in `.env.example` and CSP `connect-src` — verify whether still needed vs dead configuration (`INTEGRATIONS.md`)

## Missing Critical Features

Not assessed as product gaps — use product roadmap. Technical gap: **admin API routes lack Vitest coverage** (see Test Coverage Gaps).

## Test Coverage Gaps

**Sparse route-level tests:**

- What's not tested: Most `src/app/api/admin/**` handlers; checkout/subscription flows beyond integration assumptions
- Risk: Regressions in admin or billing require manual or Playwright-only detection
- Priority: Medium–High for billing-related routes
- Mitigation: Strong coverage on `src/app/api/enhance/__tests__/`, `src/app/api/webhooks/lemonsqueezy/__tests__/`, and `src/lib/**/__tests__/`

**Middleware integration:**

- `src/__tests__/middleware.test.ts` tests helpers; full `middleware()` integration is limited (called out in file comments)

## Lint / Static Health (audit date)

**ESLint:**

- `npm run lint` — **0 errors**, **~48 warnings** in `src/` (2026-04-11 after ignoring `chrome-extension-v2.1/**` and partial cleanup)
- Files: mostly unused vars and redundant eslint-disable directives — see `IMPROVEMENT_BACKLOG.md` P2-4

**TypeScript:**

- `npm run typecheck` — **passes**

---

_Concerns audit: 2026-04-11_  
_Update as issues are fixed or new ones discovered_
