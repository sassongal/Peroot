# Prompt Engine — 14 Bug Fixes & Refinement Upgrade

**Date:** 2026-03-10
**Scope:** Fix all refinement flow bugs, improve streaming reliability, harden JSON parsing

---

## Fixes Implemented

| # | Bug | Severity | File | Status |
|---|-----|----------|------|--------|
| 1 | `onRefine` drops customInstruction | Critical | page.tsx:577 | Fixed |
| 2 | `previousResult` wiped before use by START_STREAM | Critical | page.tsx:298-314 | Fixed |
| 3 | New questions overwritten by stale clear | High | page.tsx:319 | Fixed |
| 4 | Answer keys type mismatch (number vs string) | High | page.tsx:313 | Fixed |
| 5 | Answers not passed to engine via EngineInput | Critical | route.ts, types.ts | Fixed |
| 6 | Engine ignores answers in refinement prompt | Critical | base-engine.ts:150 | Fixed |
| 7 | Streaming error swallowed silently | Medium | useStreamingCompletion.ts | Fixed |
| 8 | processStreamResult ref fragility | Low | page.tsx:240 | Documented |
| 9 | Double-click wastes credits | Medium | page.tsx:259 | Fixed |
| 10 | Question JSON parsing brittle | Medium | page.tsx:243 | Fixed |
| 11 | `useState` misused as initializer | Medium | SmartRefinement.tsx:36 | Fixed |
| 12 | Iteration counter missing on refine | Low | page.tsx:317 | Fixed |
| 13 | Credit charged on failed stream | High | route.ts:173 | Fixed |
| 14 | Stale answers not cleared between generations | Low | page.tsx:267 | Fixed |

## Files Modified

- `src/lib/engines/types.ts` — Added `answers` field to `EngineInput`
- `src/lib/engines/base-engine.ts` — `generateRefinement()` now integrates answers into prompt
- `src/app/api/enhance/route.ts` — Passes answers to engine, credit refund on failure
- `src/app/page.tsx` — All client-side fixes (1-4, 9, 10, 12, 14)
- `src/hooks/usePromptWorkflow.ts` — Added `CLEAR_ANSWERS` action
- `src/hooks/useStreamingCompletion.ts` — Mid-stream error recovery
- `src/components/features/prompt-improver/SmartRefinement.tsx` — `useState` → `useEffect`
