# Improvement Backlog

**Analysis Date:** 2026-04-11  
**Last progress update:** 2026-04-12 (`xlsx` hardening + content-factory batch dedup)

**Sources:** Explore agents, `npm audit`, `npx knip`, `npm run typecheck`, `npm run lint`, manual review of `next.config.ts` and middleware.

Priorities are **technical** (stability, security hygiene, maintainability). Product priorities may reorder this list.

**Working rule (knip / dead code):** Prefer wiring, tests, or narrowing exports before deleting; do not remove modules flagged by knip without confirming with the team — ship behavior first.

- **Content Factory (2026-04-12):** [`filterDuplicates`](../../src/lib/content-factory/dedup.ts) — single DB read per batch + **within-batch** title dedup (`decisions[]` aligned to input order); wired in [`generate-prompts/route.ts`](../../src/app/api/admin/content-factory/generate-prompts/route.ts) and [`cron/content-factory/route.ts`](../../src/app/api/cron/content-factory/route.ts); tests in [`dedup.test.ts`](../../src/lib/content-factory/__tests__/dedup.test.ts).

---

## Progress snapshot (2026-04-11)

**Completed in implementation session:**

- **P0-1 / P0-3:** `package.json` — `engines.node >=20`, `"knip": "knip"` script; **`postcss`**, **`dotenv`**, **`knip`** in **devDependencies** (not production deps); `npm install` refreshed lockfile.
- **P0-2:** [`file-office.ts`](../../src/lib/context/engine/extract/file-office.ts) — `xlsx` server-only; comment + **`sheetRows`** cap, buffer guard vs [`MAX_FILE_SIZE_MB`](../../src/lib/context/engine/extract/index.ts), [`MAX_CHARS`](../../src/lib/context/engine/extract/file-office.ts) on output; oversized-buffer test in [`file-office.test.ts`](../../src/lib/context/engine/__tests__/extract/file-office.test.ts).
- **P1-3:** [`useContextAttachments.ts`](../../src/hooks/useContextAttachments.ts) — dependency arrays include `limits.maxFiles` / `maxUrls` / `maxImages`.
- **P1-4:** [`.env.example`](../../.env.example) — `MISTRAL_API_KEY` documented; `DEEPSEEK` commented as optional/legacy.
- **P2-4:** ESLint warning burn-down in `src/` — `npm run lint` reports **no warnings** (unused vars, test mocks, revenue KPI locals, etc.).
- **P2-5:** [`circuit-breaker.ts`](../../src/lib/ai/circuit-breaker.ts) uses `logger.info` instead of `console.log`.
- **P2-3 (partial):** [`package.json`](../../package.json) — `tailwind:canonicalize`, `test:engines-live`; `db:migrate` uses local **`tsx`**; dead module `src/lib/engines/refinement/enhanced-questions.ts` removed (nothing imported it). [`knip.json`](../../knip.json) — `entry` for `public/sw.js`, `ignoreBinaries` / `ignoreDependencies` for dev-tool noise. **`tsx`** added to **devDependencies**.
- **P2-6:** [`JsonLd`](../../src/components/seo/JsonLd.tsx) — shared JSON-LD `<script>` wrapper; app pages use `<JsonLd data={...} />` instead of duplicating `dangerouslySetInnerHTML` + `JSON.stringify` (schema builders remain in [`schema.ts`](../../src/lib/schema.ts)).
- **P2-2 (partial):** Knip **unused exports** reduced **~76 → ~17** (ongoing triage). Earlier: PlatformIcons / LibraryContext / MaintenanceMode / `_stagePillTestids`; removed dead [`getCacheKey`](../../src/hooks/usePromptWorkflow.ts); internalized [`trackEvent`](../../src/lib/analytics.ts); removed unused [`getConcurrencyStats`](../../src/lib/ai/concurrency.ts); removed dead [`configureLemonSqueezy`](../../src/lib/lemonsqueezy.ts) + **`@lemonsqueezy/lemonsqueezy.js`** (checkout uses REST `fetch`); [`jaccardSimilarity`](../../src/lib/prompt-similarity.ts) file-private; dropped [`fromPublicLibraryRow`](../../src/lib/prompt-entity/index.ts) barrel re-export; [`knip.json`](../../knip.json) `ignoreIssues` for [`maintenance.ts`](../../src/lib/maintenance.ts) and [`emails/templates/index.ts`](../../src/lib/emails/templates/index.ts). Docs: [`INTEGRATIONS.md`](../../.planning/codebase/INTEGRATIONS.md), [`STACK.md`](../../.planning/codebase/STACK.md) LemonSqueezy notes updated.
- **Analytics (product):** Restored PostHog helpers in [`analytics.ts`](../../src/lib/analytics.ts) (`trackLibraryUse`, `trackSignUp`, `trackFeatureUse`, `trackChainRun`) and wired: [`UsePromptButton`](../../src/app/prompts/[slug]/UsePromptButton.tsx), [`auth-form`](../../src/components/auth/auth-form.tsx), [`markFeatureUsed`](../../src/hooks/useFeatureDiscovery.ts), [`ChainRunner`](../../src/components/features/chains/ChainRunner.tsx).
- **P2-2 (earlier session):** Unexported internal-only [`FACTS_HE` / `FACTS_EN`](../../src/lib/peroot-facts.ts); file-private [`GUIDE_SEARCH_INDEX`](../../src/lib/site-search/guide-index.ts); removed dead [`getVideoPlatform`](../../src/lib/video-platforms.ts); shared prompt page JSON-LD via [`promptCreativeWorkSchema`](../../src/lib/schema.ts) on [`p/[id]/page.tsx`](../../src/app/p/[id]/page.tsx).
- **Product wiring:** [`QUICK_REFINE_ACTIONS`](../../src/lib/constants.ts) — preset "דלתות מהירות" after שדרוג; [`ResultSection`](../../src/components/features/prompt-improver/ResultSection.tsx) `onQuickRefine` → [`handleRefine`](../../src/app/HomeClient.tsx) (true refinement, not `שפר שוב` re-enhance). PostHog: `trackFeatureUse('quick_refine_*')`.
- **P2-2 (this session):** File-private helpers in [`dedup.ts`](../../src/lib/content-factory/dedup.ts) / [`slug-utils.ts`](../../src/lib/content-factory/slug-utils.ts); [`token-counter.ts`](../../src/lib/context/token-counter.ts) — removed unused `MAX_*` constants, dead [`trimToTokenLimit`](../../src/lib/context/token-counter.ts); file-private [`signNewsletterUnsubscribeEmail`](../../src/lib/email/newsletter-unsubscribe-signing.ts); removed unused [`CATEGORY_LIST`](../../src/lib/engines/base-engine.ts); non-export [`PromptManager`](../../src/lib/prompts/prompt-manager.ts) class; file-private [`VARIABLE_REGISTRY` / `VARIABLE_EXAMPLES`](../../src/lib/variable-utils.ts); [`text-utils.tsx`](../../src/lib/text-utils.tsx) — dropped unused `highlightPlaceholders` / suggestions / `renderStyledPrompt`, trimmed imports.
- **P3-1:** [`.nvmrc`](../../.nvmrc) → `22` (aligns with `engines`).
- **P3-3:** [`eslint.config.mjs`](../../eslint.config.mjs) ignores `chrome-extension-v2.1/**` — lint warnings dropped (e.g. ~48 in `src/` scope vs ~66 before).

**Verification:** `npm run typecheck` passes; `npm run lint` exit 0; `vitest run src/lib/ai/__tests__/circuit-breaker.test.ts` passes.

**Remaining audit:** `npm audit` — **1 high** (`xlsx`, no upstream fix). Long-term: replace SheetJS or vendor patch.

**Still open (larger work):**

- P1-1, P1-2, P2-1, P2-2, P3-2, P3-4 — refactors, knip unused-export triage, admin tests, bundle reviews.
- P2-2 — knip still reports **unused exports** (~17) and **unused exported types** (~79); remaining exports are mostly context/engine barrels, email template helpers, and engine scoring internals.
- P2-3 — **`public/sw.js`** kept; canonicalize / engines-live scripts are **wired** — run `npm run tailwind:canonicalize` / `npm run test:engines-live` as needed (live test needs API keys).

---

## P0 — Do soon (security / supply chain)

| ID | Finding | Evidence | Suggested fix | Effort |
|----|---------|----------|---------------|--------|
| P0-1 | **npm audit** — after `npm audit fix` typically **1 high** (transitive noise cleared) | `npm audit` (2026-04-11+) | Re-run after upgrades; trace any new findings to top-level consumers | Small |
| P0-2 | **xlsx** direct dependency: advisory **no fix available** (ReDoS / prototype pollution) | `npm audit` | Server-only parse in [`file-office.ts`](../../src/lib/context/engine/extract/file-office.ts) with buffer cap, `sheetRows`, `MAX_CHARS`; prefer trusted uploads; long-term replace SheetJS or vendor patch | Medium |
| P0-3 | **Unlisted runtime deps** (`postcss`, `dotenv`) | `npx knip` unlisted dependencies | Add `postcss` and `dotenv` to `package.json` (dev/prod as appropriate) | Small |

---

## P1 — High leverage (reliability / correctness)

| ID | Finding | Evidence | Suggested fix | Effort |
|----|---------|----------|---------------|--------|
| P1-1 | **Large monolithic handlers** — enhance + LemonSqueezy webhook | `src/app/api/enhance/route.ts`, `src/app/api/webhooks/lemonsqueezy/route.ts` | Extract pure functions (validation, mapping, side effects); unit-test extracted pieces | Large |
| P1-2 | **Admin auth two patterns** (`withAdmin` vs `validateAdminSession`) | `src/lib/api-middleware.ts`, `src/app/api/admin/**` | Migrate routes to one wrapper; document pattern in CONVENTIONS | Medium |
| P1-3 | **React hooks exhaustive-deps** in `useContextAttachments.ts` | `npm run lint` warnings | Add missing deps or refactor to stable callbacks | Small |
| P1-4 | **MISTRAL / DeepSeek env docs** | Agent notes; `INTEGRATIONS.md` | Align `.env.example` and docs with models actually wired in `src/lib/ai/models.ts` | Small |

---

## P2 — Maintainability / debt

| ID | Finding | Evidence | Suggested fix | Effort |
|----|---------|----------|---------------|--------|
| P2-1 | **Very large UI/state files** | `src/app/HomeClient.tsx`, `src/hooks/useLibrary.ts`, admin user page | Split by feature hooks and presentational components | Large |
| P2-2 | **Knip unused exports** (~17) and **unused types** (~79) | `npx knip` | Continue triage: `ignoreIssues` for barrels, or unexport engine/context/email helpers used only in-package | Medium |
| P2-3 | **Knip unused files** | `public/sw.js`, `scripts/canonicalize-tailwind-classes.mjs`, `scripts/test-engines-live.ts` | **`sw.js`:** used by `ServiceWorkerRegistration` — keep. **Scripts:** delete if obsolete or wire into build; document if PWA SW is intentional | Small |
| P2-4 | **ESLint warnings in `src/`** | `npm run lint` | Addressed in burn-down session (2026-04-11); keep clean in CI | Medium |
| P2-5 | **Circuit breaker `console` vs logger** | `src/lib/ai/circuit-breaker.ts` | Use `src/lib/logger.ts` | Small |
| P2-6 | **JSON-LD duplication** | Multiple `page.tsx` | **`JsonLd`** component + existing `schema.ts` builders (2026-04-11) | Medium |

---

## P3 — Nice to have

| ID | Finding | Evidence | Suggested fix | Effort |
|----|---------|----------|---------------|--------|
| P3-1 | **Node engine not pinned** | No `engines` in `package.json`, no `.nvmrc` | Add `engines` + `.nvmrc` for team alignment | Small |
| P3-2 | **Admin API route tests** sparse | CONCERNS test gap | Add focused tests for critical admin mutations | Medium |
| P3-3 | **Chrome extension** lint noise | `chrome-extension-v2.1/*.js` warnings | Separate eslint override or `eslintignore` for extension | Small |
| P3-4 | **Bundle analyzer** on schedule | `ANALYZE=true npm run build` in CLAUDE.md | Run after large UI changes | Small |

---

## Upgrade candidates

| Area | Current | Recommendation |
|------|---------|----------------|
| Next / eslint-config-next | **16.2.3** (upgraded) | Stay on patch/minor upgrades together; read Next release notes |
| `@next/bundle-analyzer` | **16.2.3** | Align with `next` version when bumping |
| Transitive security fixes | npm audit | Periodic `npm audit fix` + lockfile commit |
| Vercel CLI (local dev) | Hooks note 50.25.4 → 50.44.0 | `npm i -g vercel@latest` (developer machines) |
| knip | **6.4.0** in devDependencies | Run `npm run knip` in CI or locally |

---

## Suggested execution order

1. P0-1 + P0-3 (audit fix + package.json hygiene)  
2. P0-2 triage (xlsx usage paths)  
3. P1-4 env/docs alignment  
4. P1-2 admin auth consolidation (incremental PRs per route group)  
5. P2-4 lint warning burn-down in `src/`  
6. P2-2 knip triage in focused sessions (avoid big-bang delete)

---

_Backlog: 2026-04-11_
