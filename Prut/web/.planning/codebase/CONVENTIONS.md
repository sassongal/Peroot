# Coding Conventions

**Analysis Date:** 2026-04-11

## Naming Patterns

**Files:**

- React components: **PascalCase** predominant; some **kebab-case** in `components/layout/` and `components/auth/`
- Tests: `*.test.ts`, `*.test.tsx` co-located or under `__tests__/`
- App Router: framework conventions (`page.tsx`, `layout.tsx`, dynamic `[param]/`)

**Functions:**

- **camelCase** for functions and methods
- Handlers often prefixed `handle*` or named by action

**Variables:**

- **camelCase** for locals and parameters
- Constants: **UPPER_SNAKE** or exported const objects (see `src/lib/constants.ts`)

**Types:**

- **PascalCase** for interfaces and types; no `I` prefix observed
- Zod schemas colocated with route handlers or in `src/lib/schema.ts`

## Code Style

**Formatting:**

- Prettier — `.prettierrc`: `semi: true`, **double quotes**, `tabWidth: 2`, `trailingComma: "all"`, `printWidth: 100`
- Scripts: `npm run format`, `npm run format:check` (targets `src/**/*.{ts,tsx}` only)

**Linting:**

- ESLint flat config — `eslint.config.mjs`
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `tools/`, `.worktrees/`, `repomix-output.*`, `src/app/globals.css`
- Run: `npm run lint` (exit **0** with warnings as of audit date)

## Import Organization

**Path aliases:**

- `@/*` → `./src/*` — `tsconfig.json`
- Vitest mirrors `@` → `./src` in `vitest.config.ts`

**Typical order (informal):**

- External packages first, then `@/…` internal imports; type-only imports with `import type` where used

## Error Handling

**API routes:**

- Return `NextResponse.json({ error: string }, { status })` for errors (project convention in CLAUDE.md)
- Zod `.safeParse` / `.parse` at boundaries

**Async:**

- `try/catch` in route handlers and gateway loops; credit refunds on AI failure paths where implemented

## Logging

**Framework:**

- `src/lib/logger.ts` for structured logging in app code

**Note:**

- Some low-level modules (e.g. `src/lib/ai/circuit-breaker.ts`) may still use `console` — prefer logger for consistency (see CONCERNS)

## Comments

**Style:**

- Inline comments explain **why** and non-obvious constraints (especially AI gateway defaults in `src/lib/ai/gateway.ts`)

**TODOs:**

- Very few `TODO`/`FIXME` markers in production `src/`; avoid adding noise — use issues or IMPROVEMENT_BACKLOG

## Git Hooks

**Husky:**

- `package.json` — `"prepare": "husky"`
- `.husky/pre-commit` — `npx lint-staged`

**lint-staged (`.lintstagedrc`):**

- `*.{ts,tsx}` → `eslint --fix`, then `prettier --write`
- `*.{json,yml}` → `prettier --write`

---

_Conventions analysis: 2026-04-11_
