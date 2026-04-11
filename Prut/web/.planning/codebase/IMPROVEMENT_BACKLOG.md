# Improvement Backlog

**Analysis Date:** 2026-04-11  
**Last progress update:** 2026-04-11 (implementation session)

**Sources:** Explore agents, `npm audit`, `npx knip`, `npm run typecheck`, `npm run lint`, manual review of `next.config.ts` and middleware.

Priorities are **technical** (stability, security hygiene, maintainability). Product priorities may reorder this list.

---

## Progress snapshot (2026-04-11)

**Completed in implementation session:**

- **P0-1 / P0-3:** `package.json` — `engines.node >=20`, `"knip": "knip"` script; **`postcss`**, **`dotenv`**, **`knip`** in **devDependencies** (not production deps); `npm install` refreshed lockfile.
- **P0-2:** Comment above `xlsx` import in [`src/lib/context/engine/extract/file-office.ts`](../../src/lib/context/engine/extract/file-office.ts) (server-only, audit caveat).
- **P1-3:** [`useContextAttachments.ts`](../../src/hooks/useContextAttachments.ts) — dependency arrays include `limits.maxFiles` / `maxUrls` / `maxImages`.
- **P1-4:** [`.env.example`](../../.env.example) — `MISTRAL_API_KEY` documented; `DEEPSEEK` commented as optional/legacy.
- **P2-4 (partial):** Removed redundant eslint-disable lines in [`ContentFactoryTab.tsx`](../../src/components/admin/tabs/content-factory/ContentFactoryTab.tsx); [`BlogTab.tsx`](../../src/components/admin/tabs/BlogTab.tsx) uses `useCallback` + `useEffect` deps (no disable).
- **P2-5:** [`circuit-breaker.ts`](../../src/lib/ai/circuit-breaker.ts) uses `logger.info` instead of `console.log`.
- **P3-1:** [`.nvmrc`](../../.nvmrc) → `22` (aligns with `engines`).
- **P3-3:** [`eslint.config.mjs`](../../eslint.config.mjs) ignores `chrome-extension-v2.1/**` — lint warnings dropped (e.g. ~48 in `src/` scope vs ~66 before).

**Verification:** `npm run typecheck` passes; `npm run lint` exit 0; `vitest run src/lib/ai/__tests__/circuit-breaker.test.ts` passes.

**Remaining audit:** `npm audit` — **1 high** (`xlsx`, no upstream fix). Long-term: replace SheetJS or vendor patch.

**Still open (larger work):**

- P1-1, P1-2, P2-1, P2-2, P2-6, P3-2, P3-4 — refactors, knip triage, admin tests, bundle reviews.
- P2-4 — ~48 ESLint warnings remain in `src/` (unused vars, etc.).
- P2-3 — scripts `canonicalize-tailwind-classes.mjs` / `test-engines-live.ts` still need triage; **`public/sw.js`** kept (service worker registration).

---

## P0 — Do soon (security / supply chain)

| ID | Finding | Evidence | Suggested fix | Effort |
|----|---------|----------|---------------|--------|
| P0-1 | **npm audit** reports **16** vulnerabilities (incl. high transitive) | `npm audit` (2026-04-11) | Run `npm audit fix`; re-run audit; for remaining, trace top-level consumers and upgrade or replace | Small–medium |
| P0-2 | **xlsx** direct dependency: advisory **no fix available** (ReDoS) | `npm audit` tail output | Ensure parsing only runs on trusted/admin uploads; consider `sheetjs-style` alternatives or server-only isolation | Medium |
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
| P2-2 | **Knip unused exports** (77+) and **unused types** (85+) | `npx knip` | Triage: remove dead code, or mark intentional API with knip ignore rules; trim `PlatformIcons.tsx` exports if unused | Medium |
| P2-3 | **Knip unused files** | `public/sw.js`, `scripts/canonicalize-tailwind-classes.mjs`, `scripts/test-engines-live.ts` | **`sw.js`:** used by `ServiceWorkerRegistration` — keep. **Scripts:** delete if obsolete or wire into build; document if PWA SW is intentional | Small |
| P2-4 | **ESLint 66 warnings** (mostly unused vars) | `npm run lint` | Fix or prefix `_` consistently; remove unused eslint-disable in `ContentFactoryTab.tsx`, `BlogTab.tsx` | Medium |
| P2-5 | **Circuit breaker `console` vs logger** | `src/lib/ai/circuit-breaker.ts` | Use `src/lib/logger.ts` | Small |
| P2-6 | **JSON-LD duplication** | Multiple `page.tsx` | Shared SEO helpers (see CONCERNS) | Medium |

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
