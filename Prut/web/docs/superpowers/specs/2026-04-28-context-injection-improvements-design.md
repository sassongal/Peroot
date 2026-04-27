# Context Injection Improvements — Design Spec
**Date:** 2026-04-28
**Author:** Gal Sasson / Claude Code
**Status:** Approved

---

## Problem Statement

The context engine extracts text from files/URLs/images, compresses it to a per-attachment token budget, and stores both the compressed raw text (`display.rawText`) and an AI-generated summary (`injected.body`) in the `ContextBlock`. However, when building the AI prompt, `renderInjection` only injects the summary (~300–500 tokens) — the raw text is silently discarded. This means a pro user uploading a 20-page contract provides 12k-token context that the model never sees.

Secondary bugs also degrade reliability: file/image errors have no retry path, the `AttachmentDetailsDrawer` is light-mode-only, `getContextPayload` has a type lie that bypasses TypeScript, and dead code/legacy fields add noise.

---

## Goals

1. **Raw text in prompt** — include `display.rawText` in `injected.body` at pipeline time so the AI model actually reads the document content
2. **Multi-file budget** — when multiple blocks exceed `limits.total`, proportionally truncate raw bodies instead of silently excluding whole blocks
3. **Retry for files/images** — surface a "remove and re-upload" action on error (files/images can't re-fetch from a URL)
4. **Dark mode drawer** — fix `AttachmentDetailsDrawer` which uses hardcoded light colors
5. **Type correctness** — fix `getContextPayload()` type lie; make it return `ContextBlock[]`
6. **Dead code removal** — delete 7 legacy fields from `ContextAttachment`, unused `extract-files` batch route, triplicated SSE helper

---

## Non-Goals

- No new UI for viewing raw text beyond what the existing drawer already shows
- No changes to the AI enrichment step (summary/keyFacts generation stays)
- No changes to compression algorithm
- No new Redis cache schema changes (injected is already preserved intact)

---

## Architecture

### 1. `buildInjectedBlock` — include rawText in body

**File:** `src/lib/context/engine/inject.ts`

Current output:
```
[מקור #1 — 📄 חוזה משפטי: Contract.pdf]
סוג: חוזה משפטי
נקודות מפתח:
  • ...
ישויות מרכזיות: ...
תקציר: ...
```

New output (rawText appended after a separator):
```
[מקור #1 — 📄 חוזה משפטי: Contract.pdf]
סוג: חוזה משפטי
נקודות מפתח:
  • ...
ישויות מרכזיות: ...
תקציר: ...
───
<compressed raw text — up to perAttachment tokens>
```

Implementation:
- `buildInjectedBlock(b, index)` appends `\n───\n` + `b.display.rawText` when `rawText` is non-empty
- `tokenCount` is recalculated over the full body (header + summary + separator + rawText)
- Images have no rawText — their injected body stays summary-only (no change)
- The `⚠️ הקובץ נחתך` line moves to after the rawText separator so it appears near the truncation

**Cache compatibility:** `injected` is preserved intact by `cache.ts` (only `display.rawText` is stripped). The new `injected.body` includes rawText at pipeline time, so cache hits return the correct full body. No cache invalidation needed — new blocks will automatically get the new format; old cached blocks will have summary-only format until their TTL expires (acceptable transitional state).

### 2. `renderInjection` — proportional multi-file truncation

**File:** `src/lib/context/engine/inject.ts`

Current: `renderInjection(blocks: ContextBlock[])` — no budget awareness; engine index.ts uses `processBatch` which marks excess blocks as `warning` and excludes them entirely.

New signature: `renderInjection(blocks: ContextBlock[], tokenBudget?: number): string`

When `tokenBudget` is provided and `sum(block.injected.tokenCount) > tokenBudget`:
1. Compute `summaryFloor` for each block: tokens occupied by header + summary lines (everything above `───`)
2. Compute `rawBudget = tokenBudget - sum(summaryFloors)`
3. If `rawBudget <= 0`: render summary-only for all blocks (floor is inviolable)
4. Else: distribute `rawBudget` proportionally across blocks by their rawText length
5. Re-truncate each block's rawText to its proportional share using `compressToLimit`

This replaces `processBatch`'s hard-exclude logic for the total-budget check. `processBatch` still enforces `limits.maxFiles/maxUrls/maxImages` (count limits) but no longer marks blocks as `warning` for token overflow — that's handled at render time.

### 3. `base-engine.ts` — pass tier token budget to `renderInjection`

**File:** `src/lib/engines/base-engine.ts`

The base engine calls `renderInjection(blocks)` to build the context string for the AI prompt. It needs to pass the user's tier total limit:

```typescript
const contextString = renderInjection(blocks, getContextLimits(tier).total);
```

The `tier` is already available in `BaseEngineInput`. `getContextLimits` is already imported in the engine layer.

### 4. `getContextPayload()` — fix type lie

**File:** `src/hooks/useContextAttachments.ts`

Current:
```typescript
const getContextPayload = useCallback((): ContextPayload[] => {
  return attachments
    .filter((a) => a.status === "ready" && a.block)
    .map((a) => a.block as unknown as ContextPayload); // ← unsafe cast
}, [attachments]);
```

`ContextPayload` (legacy shape) is incompatible with `ContextBlock` (new shape). Every consumer of `getContextPayload()` should be using `block` directly, not the legacy payload shape.

Fix: change return type to `ContextBlock[]` and remove the cast:
```typescript
const getContextPayload = useCallback((): ContextBlock[] => {
  return attachments
    .filter((a) => a.status === "ready" && a.block)
    .map((a) => a.block!);
}, [attachments]);
```

Then update all call sites to use `ContextBlock[]`. The engine already expects `ContextBlock[]` from `renderInjection`.

### 5. File/Image retry UX

**Files:** `src/components/features/context/AttachmentCard.tsx`, `src/hooks/useContextAttachments.ts`, and call sites

Current: `onRetry` is only passed for `type === "url"` in `ContextChips.tsx`. Files and images get no retry because the original `File` object is gone after upload.

Fix: for file/image errors, show a "הסר ועלה שוב" (remove and re-upload) action — a button that calls `onRemove()`. This is the correct UX: the file must be re-selected.

- `AttachmentCard`: when `isError && !onRetry` (file/image case), render the "הסר ועלה שוב" button that calls `onRemove` inline
- No hook changes needed — `removeAttachment` already exists

### 6. `AttachmentDetailsDrawer` — dark mode

**File:** `src/components/features/context/AttachmentDetailsDrawer.tsx`

Replace all hardcoded light colors with CSS custom properties or `dark:` variants:

| Current | Replace with |
|---------|-------------|
| `bg-white` | `bg-(--surface-card)` |
| `bg-zinc-50` / `bg-zinc-100` | `bg-(--glass-bg)` |
| `text-zinc-900` | `text-(--text-primary)` |
| `text-zinc-700` / `text-zinc-600` | `text-(--text-secondary)` |
| `text-zinc-400` | `text-(--text-muted)` |
| `border-zinc-200` | `border-(--glass-border)` |
| `shadow-2xl` on overlay | keep (works in both modes) |

### 7. Dead code removal

**`src/lib/context/types.ts`** — remove 7 never-populated legacy fields from `ContextAttachment`:
- `extractedText`, `extracted_text`, `description`, `metadata`, `tokenCount`, `tokens`, `format` (still used for display in card — keep), `size_mb` (still displayed — keep)

Actually re-checking: `format` and `size_mb` ARE set in `addFile`/`addImage`. Remove only fields that are set nowhere: `extractedText`, `extracted_text`, `description`, `metadata`, `tokenCount` (use `block.injected.tokenCount`), `tokens`.

**`src/app/api/context/extract-files/route.ts`** — delete the batch upload route; `useContextAttachments` never calls it (each file is sent individually to `/api/context/extract-file`).

**`src/hooks/useContextAttachments.ts`** — extract the `readSseStream` callback logic into a shared helper (currently triplicated across `addFile`, `addUrl`, `addImage`). The helper already exists as the standalone `readSseStream` function at line 64 — just refactor the three identical inline call sites to reuse it consistently.

---

## Data Flow (after changes)

```
processAttachment()
  → compressToLimit(rawText, limits.perAttachment)         // per-file budget
  → buildInjectedBlock(block, i)                           // now includes rawText
  → block.injected.tokenCount = tokens(header+summary+raw)
  → putCachedBlock(block)                                  // injected preserved

renderInjection(blocks, limits.total)                      // new tokenBudget param
  → if sum > budget: proportional truncation of raw bodies
  → returns full injection string with nonce USER_DATA wrapper

BaseEngine → renderInjection(blocks, getContextLimits(tier).total)
```

---

## Testing

- Unit test `buildInjectedBlock`: assert rawText appears after `───` separator; assert images produce no rawText section; assert tokenCount covers full body
- Unit test `renderInjection` with `tokenBudget`: assert proportional truncation when over budget; assert summary floor always present; assert behavior matches original when under budget
- Manual: upload a 5-page PDF as free user → confirm summary-only; upgrade to pro → confirm full text in prompt context

---

## File Checklist

| File | Change |
|------|--------|
| `src/lib/context/engine/inject.ts` | `buildInjectedBlock` adds rawText; `renderInjection` gets `tokenBudget` param + proportional truncation |
| `src/lib/context/engine/index.ts` | `processBatch` no longer marks token-overflow blocks as `warning` (handled by renderInjection) |
| `src/lib/engines/base-engine.ts` | Pass `getContextLimits(tier).total` to `renderInjection` |
| `src/hooks/useContextAttachments.ts` | Fix `getContextPayload` return type; refactor SSE helper reuse |
| `src/lib/context/types.ts` | Remove 6 legacy never-populated fields from `ContextAttachment`; update `ContextPayload` callers |
| `src/components/features/context/AttachmentCard.tsx` | Add "הסר ועלה שוב" button for file/image error state |
| `src/components/features/context/AttachmentDetailsDrawer.tsx` | Fix dark mode colors |
| `src/app/api/context/extract-files/route.ts` | Delete dead batch route |
