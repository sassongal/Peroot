# Design: Context Engine v2 — Smarter Injection

**Date:** 2026-04-28
**Status:** Approved

---

## Problem

The context injection pipeline processes attachments correctly but injects them naively:
1. The same content is injected regardless of what the user's prompt asks — a 12k-token contract is injected wholesale even for a 10-word email request.
2. Compression is type-blind — code loses function bodies in the middle, data files may lose header rows, contract penalty clauses (at the end) get cut by the head-70% default.
3. Images contribute only a Gemini-generated text description — the prompt improvement AI never sees the actual image pixels.

---

## Goals

- **A: Prompt-aware relevance** — inject the most relevant chunks from each document relative to the user's specific prompt. No extra AI calls.
- **B: Type-aware compression** — different truncation strategies per document type so the highest-signal content is always preserved.
- **C: Image visual passthrough** — send image data directly to the prompt improvement AI (Gemini Flash) when the attachment is an image under the size limit.

---

## Out of Scope

- Re-processing cached blocks — improvements apply at inject time (A) and at compress time during initial processing (B). Cached blocks get A applied at render time; B applies on re-upload.
- Non-Gemini models for image passthrough — only `gemini-2.5-flash` supports multimodal; other fallback models receive text-only.
- Changing the enrichment step — Gemini still generates summaries/entities as before.

---

## Improvement A: Prompt-Aware Relevance

### Change

`renderInjection(blocks, tokenBudget?, userPrompt?)` gains an optional third parameter.

When `userPrompt` is provided, rawText for each block is processed by `selectRelevantChunks(rawText, userPrompt, charBudget)` before the proportional budget compression:

1. Split rawText into paragraphs on `\n\n`
2. Tokenize userPrompt: lowercase, split on non-alphanumeric, remove Hebrew/English stop words
3. Score each paragraph: count unique query token matches / paragraph token count (TF-like)
4. Sort paragraphs by score descending, fill charBudget greedily (highest-score first)
5. Re-sort selected paragraphs by original position (preserve reading order)
6. If chunks are non-contiguous, insert `\n[...סעיפים רלוונטיים נבחרו מתוך המסמך...]\n` between gaps

If `userPrompt` is empty or rawText has ≤3 paragraphs, skip scoring and use original text (no-op path).

`base-engine.ts` passes `input.prompt` to `renderInjection` as the third argument.

### Files

| File | Change |
|------|--------|
| `src/lib/context/engine/inject.ts` | Add `selectRelevantChunks`, update `renderInjection` signature |
| `src/lib/engines/base-engine.ts` | Pass `input.prompt` to `renderInjection` |

---

## Improvement B: Type-Aware Compression

### Change

`compressToLimit(text, maxTokens, strategy?)` gains a `strategy` parameter.

Strategy enum: `"code" | "data" | "contract" | "academic" | "default"`

`engine/index.ts` maps `detectedType → strategy` before calling `compressToLimit`.

### Strategy definitions

| Strategy | Logic |
|----------|-------|
| `code` | Regex-extract all function/class/interface signatures (lines matching `function`, `class`, `const.*=>`, `interface`, `def `, `public `, etc.) → always include in head; fill remaining budget with body from head |
| `data` | Find header row (first line / first row of CSV); always include it; fill rest with first N rows + last N rows proportionally |
| `contract` | head 50% / tail 50% (signatories + recitals in head; penalty/termination in tail) |
| `academic` | head 30% (abstract+intro) + tail 30% (conclusion+refs) + middle 40% |
| `default` | Current head 70% / tail 30% (unchanged) |

### Type → strategy mapping

| DocumentType | Strategy |
|---|---|
| `קוד מקור` | `code` |
| `טבלת נתונים` | `data` |
| `חוזה משפטי`, `מסמך משפטי` | `contract` |
| `מאמר אקדמי` | `academic` |
| All others | `default` |

### Files

| File | Change |
|------|--------|
| `src/lib/context/engine/compress.ts` | Add `CompressionStrategy` type; strategy-specific logic in `compressToLimit` |
| `src/lib/context/engine/index.ts` | Derive strategy from `detectedType`, pass to `compressToLimit` |

---

## Improvement C: Image Visual Passthrough

### Change

Three-layer modification: store base64 in block → thread to gateway → send as multimodal message.

**Layer 1 — ContextBlock carries image data (not cached)**

Add to `ContextBlock`:
```ts
imageBase64?: string;    // present only on fresh (non-cached) image blocks; ≤ ~1MB
imageMimeType?: string;
```

In `engine/index.ts`, after enrichment succeeds for an image, populate these fields only if `imageBase64.length ≤ 1_400_000` (≈1MB base64, original ≤750KB). Not written to Redis cache.

**Layer 2 — ModelConfig knows vision capability**

Add `supportsVision: boolean` to `ModelConfig` in `models.ts`:
- `gemini-2.5-flash`: `true`
- `gemini-2.5-flash-lite`: `true`
- `llama-4-scout`, `gpt-oss-20b`, `mistral-small`: `false`

**Layer 3 — Gateway accepts image attachments**

Add to `GatewayParams`:
```ts
imageAttachments?: Array<{ base64: string; mimeType: string }>;
```

In `gateway.ts`:
- When `imageAttachments` is present and non-empty, filter fallback chain to only `supportsVision` models
- Build user `messages` array instead of using `prompt` string:
  ```ts
  [{ role: 'user', content: [
    { type: 'text', text: params.prompt },
    ...imageAttachments.map(img => ({ type: 'image', image: `data:${img.mimeType};base64,${img.base64}` }))
  ]}]
  ```
- Pass to `streamText`/`generateText` as `messages` (AI SDK supports this)

**Layer 4 — BaseEngine extracts image attachments**

In `base-engine.ts`, before calling the gateway:
- Filter `input.context` for blocks with `imageBase64`
- Pass as `imageAttachments` to gateway params

### Files

| File | Change |
|------|--------|
| `src/lib/context/engine/types.ts` | Add `imageBase64?`, `imageMimeType?` to `ContextBlock` |
| `src/lib/context/engine/index.ts` | Populate image fields when size ≤ limit |
| `src/lib/ai/models.ts` | Add `supportsVision` to `ModelConfig` and all entries |
| `src/lib/ai/gateway.ts` | Accept `imageAttachments`, filter chain, build messages |
| `src/lib/engines/base-engine.ts` | Extract image blocks, pass to gateway |

---

## Data Flow Summary

```
User uploads image
  → processAttachment() → imageBase64 stored on block (if ≤750KB)
  → Block returned to client via SSE (with base64)
  → Client stores block in useContextAttachments

User types prompt + hits improve
  → getContextPayload() returns blocks (including base64 when present)
  → renderInjection(blocks, budget, userPrompt)
      → selectRelevantChunks() scores paragraphs per block (A)
      → compressToLimit(text, budget, strategy) per document type (B)
  → base-engine extracts imageBase64 from blocks → passes to gateway (C)
  → gateway sends multimodal message to gemini-2.5-flash (C)
```

---

## Constraints

- A: userPrompt scoring is pure JS, <1ms, no network call
- B: Strategy derivation is deterministic — same text + type always produces same result
- C: Image base64 travels in the `/api/enhance` request body — Vercel limit is 4.5MB; size guard (≤1MB per image) keeps multi-image requests safe for Pro users (up to 5 images = 5MB). A future improvement could stream images separately.
- All three improvements are independently shippable; C can be skipped if gateway changes prove complex

---

## Files to Change

| File | Improvement |
|------|-------------|
| `src/lib/context/engine/inject.ts` | A |
| `src/lib/engines/base-engine.ts` | A, C |
| `src/lib/context/engine/compress.ts` | B |
| `src/lib/context/engine/index.ts` | B, C |
| `src/lib/context/engine/types.ts` | C |
| `src/lib/ai/models.ts` | C |
| `src/lib/ai/gateway.ts` | C |
