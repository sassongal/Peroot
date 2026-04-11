# Testing Patterns

**Analysis Date:** 2026-04-11

## Test Framework

**Runner:**

- Vitest **4.0.18** — `vitest.config.ts`

**Assertion library:**

- Vitest built-in `expect` + `@testing-library/jest-dom` for DOM matchers where needed

**Run commands:**

```bash
npm run test              # vitest run — all unit/integration tests
npm run test:watch        # vitest — watch mode
npm run test:coverage     # vitest run --coverage
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright test --ui
```

## Test File Organization

**Location:**

- Co-located `**/__tests__/**` under features and API routes
- Adjacent `*.test.ts` / `*.test.tsx` next to modules (e.g. `src/lib/ai/gateway.test.ts`)
- Top-level `src/__tests__/` for cross-cutting tests (`middleware.test.ts`, `engines.test.ts`)

**Naming:**

- Unit/integration: `*.test.ts`, `*.test.tsx`
- Heavy HTTP route flows in Vitest: `*.e2e.test.ts` (still Vitest, not Playwright) — e.g. `src/app/api/context/__tests__/extract-file.e2e.test.ts`, `src/app/api/enhance/__tests__/context-e2e.test.ts`

**E2E (Playwright):**

- Directory: `e2e/`
- Pattern: `*.spec.ts` (e.g. `smoke.spec.ts`, `site-search.spec.ts`)
- Config: `playwright.config.ts` — base URL `http://localhost:3000`, projects `chromium` and `mobile`, webServer `npm run dev`, `reuseExistingServer` locally

## Test Structure

**Typical pattern:**

- `describe` / `it` blocks; mocks via `vi.mock` for external I/O
- API route tests may mock Supabase, env, or use full handler invocation

**Coverage (`vitest.config.ts`):**

- Provider: `v8`
- Coverage `include` limited to `src/lib/**`, `src/hooks/**` (see config for exclusions)

## Mocking

**Framework:**

- Vitest `vi.mock`, `vi.fn`, `vi.spyOn`

**External systems:**

- Supabase clients, AI gateway, and fetch are mocked in unit tests under `src/lib/**/__tests__/`

## Integration and E2E

**Vitest “e2e” naming:**

- Denotes multi-step route or full handler tests, distinct from Playwright browser E2E

**Playwright:**

- Smokes and site flows against real dev server; CI retries and single worker on CI per config

## Quality Gates

**As of audit date:**

- `npm run typecheck` — **passes** (`tsc --noEmit`)
- `npm run lint` — **passes** with warnings (66 warnings, 0 errors) — see CONCERNS for cleanup opportunities

---

_Testing analysis: 2026-04-11_
