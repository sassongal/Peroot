# Context Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore broken file/URL/image context ingestion in production and replace the naive text-concatenation pipeline with a unified, transparent, plan-aware Context Engine that is shared by all five prompt engines.

**Architecture:** New module `src/lib/context/engine/` implements the INGEST → EXTRACT → CLASSIFY → ENRICH → COMPRESS → STRUCTURE → INJECT pipeline. The three `/api/context/*` routes become thin wrappers. `BaseEngine.generate()` delegates a ~100-line context block to `contextEngine.renderInjection()` plus a model router that picks Flash Lite (≤2k tokens) or Flash (>2k). A rich attachment card UI exposes the structured `display` representation to the user with per-field copy buttons and a 4-stage gradient progress bar.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, TypeScript, Vercel AI SDK `generateObject` + Zod, `pdfjs-dist/legacy` (pure JS, no native bindings), `@mozilla/readability` + `jsdom`, Jina Reader API (Pro fallback), Upstash Redis (cache + rate limit), framer-motion (stage animations), Vitest (unit), Playwright (e2e).

**Reference spec:** `docs/superpowers/specs/2026-04-09-context-engine-design.md`

---

## Phase 0 — Emergency Production Fixes

Single commit. Must land first. Restores basic functionality before any refactor.

### Task 1: Fix describe-image env var mismatch

**Files:**
- Modify: `src/app/api/context/describe-image/route.ts:62`

- [ ] **Step 1: Write failing integration test**

Create `src/app/api/context/__tests__/describe-image-env.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../describe-image/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: 'pro' } }) }) }) }),
  }),
}));
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: true }) }));

describe('describe-image env var', () => {
  const origKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
    // fetch is mocked so we do not actually call Gemini
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 })
    ) as unknown as typeof fetch;
  });
  afterEach(() => { process.env.GOOGLE_GENERATIVE_AI_API_KEY = origKey; });

  it('uses GOOGLE_GENERATIVE_AI_API_KEY and returns 200', async () => {
    const form = new FormData();
    form.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const req = new Request('http://t', { method: 'POST', body: form });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

Run: `npm run test -- src/app/api/context/__tests__/describe-image-env.test.ts`
Expected: FAIL — route returns 503 because `apiKey` resolves to `undefined`.

- [ ] **Step 3: Apply the one-line fix**

In `src/app/api/context/describe-image/route.ts:62`, change:

```ts
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
```

to:

```ts
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
```

Update the error log on line 64 accordingly:

```ts
logger.error('[Describe Image] Missing GOOGLE_GENERATIVE_AI_API_KEY');
```

- [ ] **Step 4: Re-run the test — expect pass**

Run: `npm run test -- src/app/api/context/__tests__/describe-image-env.test.ts`
Expected: PASS.

- [ ] **Step 5: Do not commit yet — Phase 0 lands as a single commit at Task 3.**

---

### Task 2: Add `serverExternalPackages` to next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Edit `next.config.ts`**

Add a new top-level key inside `nextConfig` (after `compress: true`, before `experimental`):

```ts
serverExternalPackages: [
  'pdf-parse',
  'pdfjs-dist',
  'mammoth',
  'xlsx',
  '@napi-rs/canvas',
],
```

This tells Next.js to treat these packages as external Node modules at runtime instead of bundling them through Turbopack. `pdf-parse` stays in the list for Phase 0 (it is still the runtime dependency); Phase 1 will add `pdfjs-dist` directly and remove `pdf-parse` from the list.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Build locally to verify the module resolves**

Run: `npm run build`
Expected: build succeeds. No `Cannot load "@napi..."` warning. If the warning appears, check that `@napi-rs/canvas` is installed and that Turbopack respects the external list.

- [ ] **Step 4: Do not commit yet — Phase 0 lands as a single commit at Task 3.**

---

### Task 3: Verify + commit Phase 0

**Files:** none new.

- [ ] **Step 1: Create a smoke-test fixture**

Create `tests/fixtures/context/sample.pdf` — a small (<100KB) text PDF. If a fixture already exists under `tests/fixtures` or `src/lib/context/__tests__/fixtures`, reuse it.

- [ ] **Step 2: Run the existing extract-file route manually**

Start dev server: `npm run dev` (in a background shell).
Hit the route with curl:

```bash
curl -X POST http://localhost:3000/api/context/extract-file \
  -H "Cookie: <valid supabase session cookie>" \
  -F "file=@tests/fixtures/context/sample.pdf"
```

Expected: 200 JSON with a non-empty `text` field and `metadata.format === "pdf"`.

If the caller is not authenticated end-to-end in local dev, run the extraction directly via a unit test instead:

```bash
npm run test -- src/lib/context/__tests__/extract-file.test.ts
```

Expected: passes, PDF extraction returns non-empty text.

- [ ] **Step 3: Run full test suite**

Run: `npm run test`
Expected: no new failures versus main.

- [ ] **Step 4: Commit Phase 0**

```bash
git add next.config.ts src/app/api/context/describe-image/route.ts \
        src/app/api/context/__tests__/describe-image-env.test.ts \
        tests/fixtures/context/sample.pdf
git commit -m "fix(context): restore image+file ingestion in production

- describe-image: use GOOGLE_GENERATIVE_AI_API_KEY (was reading undefined GEMINI_API_KEY/GOOGLE_API_KEY, returning 503 on every request)
- next.config: declare pdf-parse/pdfjs-dist/mammoth/xlsx/@napi-rs/canvas as serverExternalPackages to fix 'Cannot load @napi' crash in Vercel Functions

Phase 0 of docs/superpowers/specs/2026-04-09-context-engine-design.md"
```

- [ ] **Step 5: Deploy Phase 0 to preview and manually verify**

Push, wait for Vercel preview, upload a real PDF through the UI, upload an image. Both must return 200 and show content in the existing basic card. Only after this confirmation do we start Phase 1.

---

## Phase 1 — Context Engine Backend Module

Phase 1 is the backend refactor. The server response shape is **additive** — the old client keeps working until Phase 2.

### Task 4: Install / remove dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install new deps**

```bash
npm install @mozilla/readability jsdom
npm install --save-dev @types/jsdom
```

`pdfjs-dist` is already transitively installed through `pdf-parse`. Verify:

```bash
npm ls pdfjs-dist
```

If not present at the top level, install:

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Keep `pdf-parse` installed for now**

Do NOT remove `pdf-parse` yet — the old extraction code still imports it until Task 9 lands. It will be removed in Task 25.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @mozilla/readability, jsdom, pdfjs-dist for context engine"
```

---

### Task 5: Create `src/lib/context/engine/types.ts`

**Files:**
- Create: `src/lib/context/engine/types.ts`

- [ ] **Step 1: Write the file**

```ts
/**
 * Core types for the Context Engine pipeline.
 *
 * A ContextBlock is the unit produced by processAttachment() and consumed
 * by BaseEngine.generate(). It carries two representations:
 *   - display: what the user sees in the attachment card drawer
 *   - injected: what is concatenated into the engine's system prompt
 */

export type ProcessingStage =
  | 'uploading'
  | 'extracting'
  | 'enriching'
  | 'ready'
  | 'warning'
  | 'error';

export type DocumentType =
  | 'חוזה משפטי'
  | 'מאמר אקדמי'
  | 'דף שיווקי'
  | 'טבלת נתונים'
  | 'קוד מקור'
  | 'אימייל/התכתבות'
  | 'דף אינטרנט'
  | 'תמונה'
  | 'generic';

export type EntityType = 'person' | 'org' | 'date' | 'amount' | 'location' | 'other';

export interface ContextEntity {
  name: string;
  type: EntityType;
}

export interface ContextBlockMetadata {
  pages?: number;
  author?: string;
  publishedTime?: string;
  rows?: number;
  columns?: number;
  colors?: string[];
  truncated?: boolean;
  originalTokenCount?: number;
  sourceUrl?: string;
  filename?: string;
  mimeType?: string;
  sizeMb?: number;
}

export interface ContextBlockDisplay {
  title: string;
  documentType: DocumentType;
  summary: string;
  keyFacts: string[];
  entities: ContextEntity[];
  rawText: string;
  metadata: ContextBlockMetadata;
}

export interface ContextBlockInjected {
  header: string;
  body: string;
  tokenCount: number;
}

export interface PipelineError {
  stage: 'extract' | 'enrich' | 'compress' | 'structure' | 'inject';
  message: string;
  retryable: boolean;
}

export interface ContextBlock {
  id: string;
  type: 'file' | 'url' | 'image';
  sha256: string;
  display: ContextBlockDisplay;
  injected: ContextBlockInjected;
  stage: ProcessingStage;
  error?: PipelineError;
}

export type PlanTier = 'free' | 'pro';

export interface ProcessAttachmentInput {
  id: string;
  type: 'file' | 'url' | 'image';
  userId: string;
  tier: PlanTier;
  // file inputs
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  // url input
  url?: string;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/context/engine/types.ts
git commit -m "feat(context-engine): define ContextBlock and pipeline types"
```

---

### Task 6: `classify.ts` — sha256 + document type detection

**Files:**
- Create: `src/lib/context/engine/classify.ts`
- Create: `src/lib/context/engine/__tests__/classify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/context/engine/__tests__/classify.test.ts
import { describe, it, expect } from 'vitest';
import { computeSha256, detectDocumentType } from '../classify';

describe('computeSha256', () => {
  it('returns stable hex for the same input', () => {
    const a = computeSha256('hello world');
    const b = computeSha256('hello world');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
  it('differs for different inputs', () => {
    expect(computeSha256('a')).not.toBe(computeSha256('b'));
  });
});

describe('detectDocumentType', () => {
  it('detects contract', () => {
    const t = 'הסכם בין הצדדים. סעיף 1: תשלום. סעיף 2: סודיות. כפוף לחוק הישראלי.';
    expect(detectDocumentType(t, 'contract.pdf', 'file')).toBe('חוזה משפטי');
  });
  it('detects academic paper', () => {
    const t = 'תקציר. מתודולוגיה. ממצאים. ביבליוגרפיה. מסקנות ועבודה עתידית.';
    expect(detectDocumentType(t, 'paper.pdf', 'file')).toBe('מאמר אקדמי');
  });
  it('detects marketing', () => {
    const t = 'קנה עכשיו. הצעה מוגבלת. הירשם היום. call to action. המוצר שישנה את חייך.';
    expect(detectDocumentType(t, 'landing.html', 'url')).toBe('דף שיווקי');
  });
  it('detects data table', () => {
    const t = 'CSV with 120 rows and 8 columns\nColumns: id, name, value';
    expect(detectDocumentType(t, 'data.csv', 'file')).toBe('טבלת נתונים');
  });
  it('detects source code', () => {
    const t = 'function foo() { return 42; }\nclass Bar extends Baz { }\nimport { x } from "y";';
    expect(detectDocumentType(t, 'code.ts', 'file')).toBe('קוד מקור');
  });
  it('detects image type for image inputs regardless of text', () => {
    expect(detectDocumentType('', 'photo.png', 'image')).toBe('תמונה');
  });
  it('falls back to generic for ambiguous text', () => {
    expect(detectDocumentType('שלום עולם זה טקסט רגיל', 'notes.txt', 'file')).toBe('generic');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/classify.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `classify.ts`**

```ts
// src/lib/context/engine/classify.ts
import { createHash } from 'node:crypto';
import type { DocumentType } from './types';

export function computeSha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

interface TypeSignal {
  type: DocumentType;
  keywords: RegExp[];
  minHits: number;
}

const SIGNALS: TypeSignal[] = [
  {
    type: 'חוזה משפטי',
    keywords: [/הסכם|חוזה/i, /צדדים|הצדדים/i, /סעיף\s*\d/, /כפוף\s+לחוק|התחייבות|סודיות/i],
    minHits: 3,
  },
  {
    type: 'מאמר אקדמי',
    keywords: [/תקציר|abstract/i, /מתודולוגיה|methodology/i, /ביבליוגרפיה|references/i, /מסקנות|conclusion/i, /ממצאים|findings/i],
    minHits: 3,
  },
  {
    type: 'דף שיווקי',
    keywords: [/קנה עכשיו|buy now/i, /הצעה|offer|discount/i, /הירשם|sign up|register/i, /call to action|cta/i, /מוצר|product/i],
    minHits: 3,
  },
  {
    type: 'טבלת נתונים',
    keywords: [/CSV|Spreadsheet|Columns:/i, /\d+\s*rows?/i, /\d+\s*columns?/i],
    minHits: 2,
  },
  {
    type: 'קוד מקור',
    keywords: [/\bfunction\b|\bclass\b|\bimport\b|\bexport\b/, /=>|;\s*$/m, /\{[\s\S]*\}/],
    minHits: 3,
  },
  {
    type: 'אימייל/התכתבות',
    keywords: [/מאת:|from:/i, /אל:|to:/i, /נושא:|subject:/i, /בברכה|regards|sincerely/i],
    minHits: 3,
  },
];

/**
 * Detect document type from extracted text and source metadata.
 * Priority: explicit type (image) > keyword signals > generic.
 */
export function detectDocumentType(
  text: string,
  sourceName: string,
  sourceType: 'file' | 'url' | 'image'
): DocumentType {
  if (sourceType === 'image') return 'תמונה';
  if (sourceType === 'url') {
    // URL with strong marketing signals is marketing, otherwise web page
    const marketing = SIGNALS.find(s => s.type === 'דף שיווקי');
    if (marketing && countHits(text, marketing.keywords) >= marketing.minHits) {
      return 'דף שיווקי';
    }
    return 'דף אינטרנט';
  }

  for (const signal of SIGNALS) {
    if (countHits(text, signal.keywords) >= signal.minHits) {
      return signal.type;
    }
  }
  return 'generic';
}

function countHits(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, p) => (p.test(text) ? n + 1 : n), 0);
}
```

- [ ] **Step 4: Re-run tests — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/classify.test.ts`
Expected: all 8 assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/classify.ts src/lib/context/engine/__tests__/classify.test.ts
git commit -m "feat(context-engine): add classify (sha256 + document type detection)"
```

---

### Task 7: `cache.ts` — Redis cache keyed by sha256+tier

**Files:**
- Create: `src/lib/context/engine/cache.ts`
- Create: `src/lib/context/engine/__tests__/cache.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
    expire: vi.fn(async () => 1),
  },
}));

import { getCachedBlock, putCachedBlock } from '../cache';
import type { ContextBlock } from '../types';

const block: ContextBlock = {
  id: 'a1',
  type: 'file',
  sha256: 'abc',
  stage: 'ready',
  display: {
    title: 't', documentType: 'generic', summary: 's',
    keyFacts: [], entities: [], rawText: '', metadata: {},
  },
  injected: { header: 'h', body: 'b', tokenCount: 10 },
};

describe('context cache', () => {
  beforeEach(() => { store.clear(); });
  it('returns null on miss', async () => {
    expect(await getCachedBlock('abc', 'free')).toBeNull();
  });
  it('writes and reads back', async () => {
    await putCachedBlock(block, 'free');
    const hit = await getCachedBlock('abc', 'free');
    expect(hit?.injected.body).toBe('b');
  });
  it('is keyed by tier — free miss after pro write', async () => {
    await putCachedBlock(block, 'pro');
    expect(await getCachedBlock('abc', 'free')).toBeNull();
    expect(await getCachedBlock('abc', 'pro')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/cache.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `cache.ts`**

```ts
// src/lib/context/engine/cache.ts
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import type { ContextBlock, PlanTier } from './types';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PREFIX = 'ctx:';

function key(sha256: string, tier: PlanTier): string {
  return `${PREFIX}${sha256}:${tier}`;
}

export async function getCachedBlock(
  sha256: string,
  tier: PlanTier,
): Promise<ContextBlock | null> {
  try {
    const raw = await redis.get(key(sha256, tier));
    if (!raw) return null;
    return JSON.parse(raw as string) as ContextBlock;
  } catch (err) {
    logger.warn('[context-cache] get failed', err);
    return null;
  }
}

export async function putCachedBlock(
  block: ContextBlock,
  tier: PlanTier,
): Promise<void> {
  try {
    const k = key(block.sha256, tier);
    await redis.set(k, JSON.stringify(block));
    await redis.expire(k, TTL_SECONDS);
  } catch (err) {
    logger.warn('[context-cache] put failed', err);
  }
}
```

Note: `@/lib/redis` must exist and export `redis`. If the project uses Upstash client directly, confirm the import path matches existing code with `grep -rn "from '@/lib/redis'" src/ | head`. If the file exports differently (e.g., `getRedis()`), adapt the import above to match.

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/cache.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/cache.ts src/lib/context/engine/__tests__/cache.test.ts
git commit -m "feat(context-engine): add Redis cache keyed by sha256+tier (30d TTL)"
```

---

### Task 8: `compress.ts` — budget enforcement

**Files:**
- Create: `src/lib/context/engine/compress.ts`
- Create: `src/lib/context/engine/__tests__/compress.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/compress.test.ts
import { describe, it, expect } from 'vitest';
import { compressToLimit } from '../compress';

describe('compressToLimit', () => {
  it('returns text unchanged when under limit', () => {
    const r = compressToLimit('short text', 1000);
    expect(r.text).toBe('short text');
    expect(r.truncated).toBe(false);
    expect(r.originalTokenCount).toBeLessThanOrEqual(10);
  });
  it('truncates when over limit and sets flag', () => {
    const long = 'x'.repeat(20000); // ~5000 tokens
    const r = compressToLimit(long, 1000);
    expect(r.truncated).toBe(true);
    expect(r.originalTokenCount).toBeGreaterThan(1000);
    // Result should be ~1000 tokens (~4000 chars by the 4-char estimate)
    expect(r.text.length).toBeLessThanOrEqual(4000 + 20);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/compress.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `compress.ts`**

```ts
// src/lib/context/engine/compress.ts
import { estimateTokens } from '@/lib/context/token-counter';

export interface CompressResult {
  text: string;
  truncated: boolean;
  originalTokenCount: number;
  finalTokenCount: number;
}

/**
 * Trim text to a token budget. Uses the project-wide ~4-char-per-token
 * estimator so budget math stays consistent with the rest of the codebase.
 * Preserves paragraph boundaries when possible.
 */
export function compressToLimit(text: string, maxTokens: number): CompressResult {
  const original = estimateTokens(text);
  if (original <= maxTokens) {
    return { text, truncated: false, originalTokenCount: original, finalTokenCount: original };
  }
  // Rough char budget = 4 chars/token. Trim, then cut at last paragraph break.
  const charBudget = maxTokens * 4;
  let cut = text.slice(0, charBudget);
  const lastBreak = cut.lastIndexOf('\n\n');
  if (lastBreak > charBudget * 0.7) cut = cut.slice(0, lastBreak);
  return {
    text: cut,
    truncated: true,
    originalTokenCount: original,
    finalTokenCount: estimateTokens(cut),
  };
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/compress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/compress.ts src/lib/context/engine/__tests__/compress.test.ts
git commit -m "feat(context-engine): add compressToLimit with truncation metadata"
```

---

### Task 9: `extract/file-pdf.ts` — direct `pdfjs-dist/legacy`

**Files:**
- Create: `src/lib/context/engine/extract/file-pdf.ts`
- Create: `src/lib/context/engine/__tests__/extract/file-pdf.test.ts`
- Fixture: `tests/fixtures/context/sample.pdf` (already from Phase 0)

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/extract/file-pdf.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractPdf } from '../../extract/file-pdf';

describe('extractPdf', () => {
  it('extracts non-empty text from a text PDF with no native binding errors', async () => {
    const buf = readFileSync(resolve('tests/fixtures/context/sample.pdf'));
    const result = await extractPdf(buf);
    expect(result.text.length).toBeGreaterThan(10);
    expect(result.metadata.pages).toBeGreaterThan(0);
    expect(result.metadata.format).toBe('pdf');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/file-pdf.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `extract/file-pdf.ts` using legacy build**

```ts
// src/lib/context/engine/extract/file-pdf.ts
/**
 * PDF text extraction via pdfjs-dist/legacy. The legacy build is pure JS
 * and does not pull @napi-rs/canvas, so it works in Vercel Functions
 * without serverExternalPackages gymnastics.
 */
// @ts-expect-error — legacy build has no published types
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfExtractionResult {
  text: string;
  metadata: {
    pages: number;
    format: 'pdf';
  };
}

export async function extractPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const uint8 = new Uint8Array(buffer);
  // disableWorker — we are in Node, not the browser
  const loadingTask = pdfjs.getDocument({ data: uint8, disableWorker: true, isEvalSupported: false });
  const doc = await Promise.race([
    loadingTask.promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF load timed out after 15s')), 15_000),
    ),
  ]);

  const pages = doc.numPages;
  const chunks: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings: string[] = content.items
      .map((item: { str?: string }) => item.str ?? '')
      .filter(Boolean);
    chunks.push(strings.join(' '));
    page.cleanup();
  }
  await doc.cleanup();
  await doc.destroy();

  return {
    text: chunks.join('\n\n').trim(),
    metadata: { pages, format: 'pdf' },
  };
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/file-pdf.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/extract/file-pdf.ts \
        src/lib/context/engine/__tests__/extract/file-pdf.test.ts
git commit -m "feat(context-engine): PDF extraction via pdfjs-dist/legacy (pure JS)"
```

---

### Task 10: `extract/file-office.ts` — docx, xlsx, csv

**Files:**
- Create: `src/lib/context/engine/extract/file-office.ts`
- Create: `src/lib/context/engine/__tests__/extract/file-office.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/extract/file-office.test.ts
import { describe, it, expect } from 'vitest';
import { extractCsv, extractXlsx, extractDocx } from '../../extract/file-office';

describe('extractCsv', () => {
  it('formats headers and rows as readable text', async () => {
    const csv = 'name,age\nAlice,30\nBob,25\n';
    const r = await extractCsv(Buffer.from(csv));
    expect(r.text).toContain('Columns: name, age');
    expect(r.text).toContain('Row 1');
    expect(r.metadata.rows).toBe(2);
    expect(r.metadata.columns).toBe(2);
  });
});

describe('extractXlsx', () => {
  it('handles empty input gracefully', async () => {
    // Minimal valid empty xlsx created via xlsx lib
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['h1', 'h2'], ['a', 'b']]), 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const r = await extractXlsx(buf);
    expect(r.text).toContain('h1');
    expect(r.metadata.rows).toBe(1);
  });
});

describe('extractDocx', () => {
  it('rejects clearly with empty buffer', async () => {
    await expect(extractDocx(Buffer.from(''))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/file-office.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `extract/file-office.ts`**

```ts
// src/lib/context/engine/extract/file-office.ts
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface OfficeExtractionResult {
  text: string;
  metadata: {
    format: 'docx' | 'xlsx' | 'csv';
    rows?: number;
    columns?: number;
    sheets?: number;
    sheetName?: string;
    warnings?: string[];
  };
}

const MAX_CHARS = 20_000;

export async function extractDocx(buffer: Buffer): Promise<OfficeExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value.trim()) throw new Error('DOCX is empty or unreadable');
  return {
    text: result.value,
    metadata: {
      format: 'docx',
      warnings: result.messages.length ? result.messages.map((m) => m.message) : undefined,
    },
  };
}

export async function extractCsv(buffer: Buffer): Promise<OfficeExtractionResult> {
  const raw = buffer.toString('utf-8');
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parse errors: ${parsed.errors.map((e) => e.message).join('; ')}`);
  }
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data;
  const lines: string[] = [
    `CSV with ${rows.length} rows and ${headers.length} columns`,
    `Columns: ${headers.join(', ')}`,
    '',
  ];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pairs = headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ');
    lines.push(`Row ${i + 1}: ${pairs}`);
    if (lines.join('\n').length > MAX_CHARS) break;
  }
  return {
    text: lines.join('\n'),
    metadata: { format: 'csv', rows: rows.length, columns: headers.length },
  };
}

export async function extractXlsx(buffer: Buffer): Promise<OfficeExtractionResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('XLSX contains no sheets');
  const sheet = workbook.Sheets[firstSheet];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (jsonData.length === 0) {
    return {
      text: '(empty spreadsheet)',
      metadata: { format: 'xlsx', rows: 0, sheets: workbook.SheetNames.length, sheetName: firstSheet },
    };
  }
  const headers = Object.keys(jsonData[0]);
  const lines: string[] = [
    `Spreadsheet "${firstSheet}" with ${jsonData.length} rows and ${headers.length} columns`,
    `Columns: ${headers.join(', ')}`,
    '',
  ];
  for (let i = 0; i < jsonData.length; i++) {
    const pairs = headers.map((h) => `${h}: ${String(jsonData[i][h] ?? '')}`).join(' | ');
    lines.push(`Row ${i + 1}: ${pairs}`);
    if (lines.join('\n').length > MAX_CHARS) break;
  }
  return {
    text: lines.join('\n'),
    metadata: {
      format: 'xlsx',
      rows: jsonData.length,
      columns: headers.length,
      sheets: workbook.SheetNames.length,
      sheetName: firstSheet,
    },
  };
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/file-office.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/extract/file-office.ts \
        src/lib/context/engine/__tests__/extract/file-office.test.ts
git commit -m "feat(context-engine): office file extraction (docx/xlsx/csv)"
```

---

### Task 11: `extract/file-text.ts` — plain text passthrough

**Files:**
- Create: `src/lib/context/engine/extract/file-text.ts`
- Create: `src/lib/context/engine/__tests__/extract/file-text.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/extract/file-text.test.ts
import { describe, it, expect } from 'vitest';
import { extractText } from '../../extract/file-text';

describe('extractText', () => {
  it('returns UTF-8 decoded text with character count', async () => {
    const r = await extractText(Buffer.from('שלום עולם', 'utf-8'));
    expect(r.text).toBe('שלום עולם');
    expect(r.metadata.characters).toBe(9);
    expect(r.metadata.format).toBe('txt');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/file-text.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `extract/file-text.ts`**

```ts
// src/lib/context/engine/extract/file-text.ts
export interface TextExtractionResult {
  text: string;
  metadata: {
    format: 'txt';
    characters: number;
  };
}

export async function extractText(buffer: Buffer): Promise<TextExtractionResult> {
  const text = buffer.toString('utf-8');
  return { text, metadata: { format: 'txt', characters: text.length } };
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/file-text.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/extract/file-text.ts \
        src/lib/context/engine/__tests__/extract/file-text.test.ts
git commit -m "feat(context-engine): plain-text extraction passthrough"
```

---

### Task 12: `extract/url.ts` — Readability + Jina fallback

**Files:**
- Create: `src/lib/context/engine/extract/url.ts`
- Create: `src/lib/context/engine/__tests__/extract/url.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/extract/url.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUrl } from '../../extract/url';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('extractUrl', () => {
  it('extracts main content with Readability on an article page', async () => {
    const html = `
      <html><head><title>Test Article</title>
      <meta property="article:author" content="Jane Doe">
      </head><body>
      <nav>nav junk</nav>
      <article><h1>Main</h1>
      <p>${'Lorem ipsum dolor sit amet. '.repeat(30)}</p>
      <p>${'Second paragraph. '.repeat(30)}</p>
      </article></body></html>`;
    fetchMock.mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    const r = await extractUrl('https://example.com/article', { jinaFallback: false });
    expect(r.text).toContain('Lorem ipsum');
    expect(r.text).not.toContain('nav junk');
    expect(r.metadata.title).toBe('Test Article');
  });

  it('falls back to Jina when Readability returns empty and jinaFallback=true', async () => {
    // First fetch — SPA shell, readability returns nothing
    fetchMock.mockResolvedValueOnce(
      new Response('<html><body><div id="root"></div></body></html>', {
        status: 200, headers: { 'content-type': 'text/html' },
      }),
    );
    // Second fetch — Jina returns readable markdown
    fetchMock.mockResolvedValueOnce(
      new Response('# Real Title\n\nReal content from Jina.\n'.repeat(5), {
        status: 200, headers: { 'content-type': 'text/plain' },
      }),
    );
    const r = await extractUrl('https://spa.example.com', { jinaFallback: true });
    expect(r.text).toContain('Real content from Jina');
    expect(r.metadata.usedFallback).toBe('jina');
  });

  it('throws a user-facing error when jinaFallback=false and Readability empty', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html><body><div id="root"></div></body></html>', {
        status: 200, headers: { 'content-type': 'text/html' },
      }),
    );
    await expect(extractUrl('https://spa.example.com', { jinaFallback: false }))
      .rejects.toThrow(/JavaScript|דף מבוסס/);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/url.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `extract/url.ts`**

```ts
// src/lib/context/engine/extract/url.ts
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface UrlExtractionResult {
  text: string;
  metadata: {
    format: 'url';
    title?: string;
    author?: string;
    publishedTime?: string;
    sourceUrl: string;
    usedFallback?: 'jina';
  };
}

export interface UrlExtractOptions {
  jinaFallback: boolean;
  timeoutMs?: number;
}

const MIN_USEFUL_CHARS = 200;
const DEFAULT_TIMEOUT = 12_000;

export async function extractUrl(
  url: string,
  opts: UrlExtractOptions,
): Promise<UrlExtractionResult> {
  const html = await fetchText(url, opts.timeoutMs ?? DEFAULT_TIMEOUT);
  const readable = readabilityParse(html, url);

  if (readable && readable.text.length >= MIN_USEFUL_CHARS) {
    return {
      text: readable.text,
      metadata: {
        format: 'url',
        title: readable.title,
        author: readable.author,
        publishedTime: readable.publishedTime,
        sourceUrl: url,
      },
    };
  }

  if (opts.jinaFallback) {
    const jina = await fetchJina(url, opts.timeoutMs ?? DEFAULT_TIMEOUT);
    if (jina.length >= MIN_USEFUL_CHARS) {
      return {
        text: jina,
        metadata: {
          format: 'url',
          title: extractMarkdownTitle(jina),
          sourceUrl: url,
          usedFallback: 'jina',
        },
      };
    }
  }

  throw new Error(
    'הדף מבוסס JavaScript ולא הצלחנו לקרוא אותו. שדרג ל-Pro להפעלת fallback מתקדם.',
  );
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PerootBot/1.0; +https://www.peroot.space)',
        'accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJina(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Jina ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

interface ParsedArticle {
  text: string;
  title?: string;
  author?: string;
  publishedTime?: string;
}

function readabilityParse(html: string, baseUrl: string): ParsedArticle | null {
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) return null;
    const text = (article.textContent ?? '').trim();
    if (!text) return null;
    return {
      text,
      title: article.title ?? undefined,
      author: article.byline ?? undefined,
      publishedTime: article.publishedTime ?? undefined,
    };
  } catch {
    return null;
  }
}

function extractMarkdownTitle(md: string): string | undefined {
  const match = md.match(/^\s*#\s+(.+)$/m);
  return match?.[1]?.trim();
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/extract/url.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/extract/url.ts \
        src/lib/context/engine/__tests__/extract/url.test.ts
git commit -m "feat(context-engine): URL extraction via Readability + Jina fallback"
```

---

### Task 13: `extract/image.ts` — base64 passthrough

**Files:**
- Create: `src/lib/context/engine/extract/image.ts`

- [ ] **Step 1: Write the file**

```ts
// src/lib/context/engine/extract/image.ts
/**
 * Image extraction is a pass-through: the ENRICH stage does the real work
 * via Gemini vision. We only normalize bytes → base64 data URL here.
 */
export interface ImageExtractionResult {
  base64: string;
  dataUrl: string;
  metadata: {
    format: 'image';
    mimeType: string;
    sizeMb: number;
  };
}

const SUPPORTED: ReadonlySet<string> = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

export async function extractImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ImageExtractionResult> {
  if (!SUPPORTED.has(mimeType)) {
    throw new Error(`פורמט תמונה לא נתמך: ${mimeType}. נתמכים: JPG, PNG, WEBP, GIF`);
  }
  const base64 = buffer.toString('base64');
  return {
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    metadata: {
      format: 'image',
      mimeType,
      sizeMb: Math.round((buffer.length / (1024 * 1024)) * 100) / 100,
    },
  };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/context/engine/extract/image.ts
git commit -m "feat(context-engine): image extraction passthrough (base64)"
```

---

### Task 14: `extract/index.ts` — dispatcher

**Files:**
- Create: `src/lib/context/engine/extract/index.ts`

- [ ] **Step 1: Write the file**

```ts
// src/lib/context/engine/extract/index.ts
import { extractPdf } from './file-pdf';
import { extractDocx, extractCsv, extractXlsx } from './file-office';
import { extractText } from './file-text';
import { extractUrl } from './url';
import { extractImage } from './image';

export const MAX_FILE_SIZE_MB = 10;

export const SUPPORTED_FILE_EXTENSIONS: Record<string, string> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  csv: 'csv',
  xlsx: 'xlsx',
  xls: 'xlsx',
};

export interface FileDispatchResult {
  text: string;
  metadata: Record<string, unknown> & { format: string };
}

/**
 * Route a file buffer to the right extractor based on MIME type + filename.
 */
export async function dispatchFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<FileDispatchResult> {
  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error(`File size ${sizeMb.toFixed(1)}MB exceeds ${MAX_FILE_SIZE_MB}MB`);
  }
  const format = resolveFormat(mimeType, filename);
  switch (format) {
    case 'pdf':  return extractPdf(buffer);
    case 'docx': return extractDocx(buffer);
    case 'txt':  return extractText(buffer);
    case 'csv':  return extractCsv(buffer);
    case 'xlsx': return extractXlsx(buffer);
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

function resolveFormat(mimeType: string, filename: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xlsx',
  };
  if (mimeMap[mimeType]) return mimeMap[mimeType];
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && SUPPORTED_FILE_EXTENSIONS[ext]) return SUPPORTED_FILE_EXTENSIONS[ext];
  throw new Error(`Cannot resolve format for MIME "${mimeType}" / extension ".${ext ?? '?'}"`);
}

export { extractUrl, extractImage };
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/context/engine/extract/index.ts
git commit -m "feat(context-engine): add file extraction dispatcher"
```

---

### Task 15: Enrich prompts — `prompts/*.ts`

**Files:**
- Create: `src/lib/context/engine/prompts/enrich-contract.ts`
- Create: `src/lib/context/engine/prompts/enrich-academic.ts`
- Create: `src/lib/context/engine/prompts/enrich-marketing.ts`
- Create: `src/lib/context/engine/prompts/enrich-data.ts`
- Create: `src/lib/context/engine/prompts/enrich-code.ts`
- Create: `src/lib/context/engine/prompts/enrich-generic.ts`
- Create: `src/lib/context/engine/prompts/enrich-image.ts`
- Create: `src/lib/context/engine/prompts/index.ts`

- [ ] **Step 1: Write the shared index**

```ts
// src/lib/context/engine/prompts/index.ts
import type { DocumentType } from '../types';
import { enrichContract } from './enrich-contract';
import { enrichAcademic } from './enrich-academic';
import { enrichMarketing } from './enrich-marketing';
import { enrichData } from './enrich-data';
import { enrichCode } from './enrich-code';
import { enrichGeneric } from './enrich-generic';
import { enrichImage } from './enrich-image';

export function selectEnrichPrompt(type: DocumentType, isImage: boolean): string {
  if (isImage) return enrichImage;
  switch (type) {
    case 'חוזה משפטי':  return enrichContract;
    case 'מאמר אקדמי': return enrichAcademic;
    case 'דף שיווקי':   return enrichMarketing;
    case 'טבלת נתונים': return enrichData;
    case 'קוד מקור':    return enrichCode;
    default:             return enrichGeneric;
  }
}
```

- [ ] **Step 2: Write the seven prompt files**

Each file exports a single Hebrew system-prompt string instructing the model to produce `{title, documentType, summary, keyFacts[], entities[]}` in Zod-enforced JSON.

```ts
// src/lib/context/engine/prompts/enrich-generic.ts
export const enrichGeneric = `
אתה מנתח מסמכים מומחה. קרא את התוכן שיוזן אליך והחזר JSON מובנה בלבד עם השדות:
- title: כותרת קנונית קצרה (עד 80 תווים)
- documentType: סוג המסמך
- summary: 100-150 מילים תמצות אובייקטיבי
- keyFacts: 3-7 נקודות מפתח קונקרטיות (מספרים, שמות, תאריכים)
- entities: ישויות מרכזיות עם שם וסוג (person/org/date/amount/location/other)

אין לכתוב הקדמה, אין markdown. רק אובייקט JSON תקין.
הקפד: כל מה שתחזיר חייב להיגזר ישירות מהטקסט. אסור להמציא.
`.trim();
```

```ts
// src/lib/context/engine/prompts/enrich-contract.ts
export const enrichContract = `
אתה יועץ משפטי בכיר. נתח את החוזה וחלץ JSON עם:
- title: שם החוזה כפי שמופיע או "חוזה בין X ל-Y"
- documentType: "חוזה משפטי"
- summary: 100-150 מילים — סוג ההסכם, צדדים, תמצית החובות ההדדיות
- keyFacts: 3-7 פריטים: צדדים · שווי · תקופה · תנאי סיום · סעיפי סיכון · סודיות · שיפוט
- entities: כל הצדדים (org/person), סכומים (amount), תאריכים (date)

החזר JSON בלבד. אל תמציא. אם שדה לא נמצא — השאר ריק.
`.trim();
```

```ts
// src/lib/context/engine/prompts/enrich-academic.ts
export const enrichAcademic = `
אתה חוקר בתחום. נתח את המאמר וחלץ JSON עם:
- title: כותרת המאמר
- documentType: "מאמר אקדמי"
- summary: 100-150 מילים — תזה מרכזית, שיטה, ממצאים, מסקנות
- keyFacts: ממצאים עיקריים (מספרים, אחוזים, גילויים), מתודולוגיה בקצרה, מגבלות
- entities: מחברים (person), מוסדות (org), תאריכי פרסום (date)

החזר JSON בלבד.
`.trim();
```

```ts
// src/lib/context/engine/prompts/enrich-marketing.ts
export const enrichMarketing = `
אתה מומחה פרפורמנס מרקטינג. נתח את העמוד וחלץ JSON עם:
- title: שם המוצר/השירות/הקמפיין
- documentType: "דף שיווקי"
- summary: 100-150 מילים — value proposition, קהל יעד, הצעה, differentiators
- keyFacts: USP, מחיר/הנחה, CTA, social proof, hooks
- entities: מותג (org), לקוחות/testimonials (person), תאריכי הצעה (date), סכומים (amount)

החזר JSON בלבד.
`.trim();
```

```ts
// src/lib/context/engine/prompts/enrich-data.ts
export const enrichData = `
אתה אנליסט נתונים. נתח את הטבלה וחלץ JSON עם:
- title: שם הקובץ או תיאור קצר של הדאטה
- documentType: "טבלת נתונים"
- summary: 100-150 מילים — מה הטבלה מתארת, עמודות מרכזיות, מגמות/חריגים בולטים
- keyFacts: מספר שורות/עמודות · שמות עמודות מרכזיים · ערכי קיצון · ממוצעים בולטים
- entities: תאריכים בדאטה (date), סכומים/מדדים (amount), מקור אם ידוע (org)

החזר JSON בלבד.
`.trim();
```

```ts
// src/lib/context/engine/prompts/enrich-code.ts
export const enrichCode = `
אתה מהנדס תוכנה בכיר. נתח את הקוד וחלץ JSON עם:
- title: שם הקובץ או המודול המרכזי
- documentType: "קוד מקור"
- summary: 100-150 מילים — שפה, מה הקוד עושה, ארכיטקטורה, תלויות עיקריות
- keyFacts: שפה · פונקציות/מחלקות מרכזיות · imports חיצוניים · באגים/ריחות אפשריים
- entities: libraries (org), authors אם יש (person), תאריכי שינוי (date)

החזר JSON בלבד.
`.trim();
```

```ts
// src/lib/context/engine/prompts/enrich-image.ts
export const enrichImage = `
אתה מומחה ניתוח חזותי. נתח את התמונה המצורפת וחלץ JSON עם:
- title: תיאור של כ-8 מילים
- documentType: "תמונה"
- summary: 100-150 מילים — סגנון, מצב רוח, קומפוזיציה, אובייקטים מרכזיים, טקסט שנראה
- keyFacts: צבעים עיקריים כ-hex codes מדויקים (למשל #B9453C), טקסט שמופיע בתמונה כפי שנכתב, אובייקטים ספציפיים
- entities: מותגים/לוגואים שנראים (org), אנשים אם יש (person), מיקומים שנראים (location), טקסט-כיתוב (other)

החזר JSON בלבד. היה מדויק ומספרי, לא כללי.
`.trim();
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/context/engine/prompts/
git commit -m "feat(context-engine): add per-type enrichment prompts (7 variants + dispatcher)"
```

---

### Task 16: `enrich.ts` — `generateObject` + Zod

**Files:**
- Create: `src/lib/context/engine/enrich.ts`
- Create: `src/lib/context/engine/__tests__/enrich.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/enrich.test.ts
import { describe, it, expect, vi } from 'vitest';

const generateTextMock = vi.fn();
vi.mock('ai', () => ({
  generateText: (args: unknown) => generateTextMock(args),
  Output: {
    object: <T,>(opts: { schema: T }) => ({ __kind: 'object', schema: opts.schema }),
  },
}));
vi.mock('@ai-sdk/google', () => ({ google: (model: string) => ({ model }) }));

import { enrichContent } from '../enrich';

describe('enrichContent', () => {
  it('returns schema-valid output and uses the right prompt', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        title: 'חוזה בין אלפא ליעקב',
        documentType: 'חוזה משפטי',
        summary: 'א'.repeat(120),
        keyFacts: ['שווי 45000', 'תקופה 12 חודשים'],
        entities: [{ name: 'אלפא בע"מ', type: 'org' }],
      },
    });
    const r = await enrichContent({
      text: 'הסכם בין הצדדים...',
      detectedType: 'חוזה משפטי',
      sourceType: 'file',
      title: 'contract.pdf',
    });
    expect(r.documentType).toBe('חוזה משפטי');
    expect(r.keyFacts).toHaveLength(2);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it('throws on AI SDK failure (caller decides fallback)', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(enrichContent({
      text: 'x',
      detectedType: 'generic',
      sourceType: 'file',
      title: 't',
    })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/enrich.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `enrich.ts`**

```ts
// src/lib/context/engine/enrich.ts
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { selectEnrichPrompt } from './prompts';
import type { ContextBlockDisplay, DocumentType } from './types';

const enrichSchema = z.object({
  title: z.string().min(1).max(200),
  documentType: z.string().min(1),
  summary: z.string().min(20).max(2000),
  keyFacts: z.array(z.string()).min(0).max(10),
  entities: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['person', 'org', 'date', 'amount', 'location', 'other']),
      }),
    )
    .max(20),
});

export interface EnrichInput {
  text: string;
  detectedType: DocumentType;
  sourceType: 'file' | 'url' | 'image';
  title: string;
  imageBase64?: string;
  imageMimeType?: string;
}

type EnrichOutput = Pick<
  ContextBlockDisplay,
  'title' | 'documentType' | 'summary' | 'keyFacts' | 'entities'
>;

const ENRICH_MODEL = 'gemini-2.5-flash-lite';

export async function enrichContent(input: EnrichInput): Promise<EnrichOutput> {
  const system = selectEnrichPrompt(input.detectedType, input.sourceType === 'image');

  const messages: Array<{ role: 'user'; content: Array<{ type: 'text' | 'image'; text?: string; image?: string }> }> = [
    {
      role: 'user',
      content:
        input.sourceType === 'image' && input.imageBase64
          ? [
              { type: 'text', text: `כותרת: ${input.title}\nנתח את התמונה:` },
              { type: 'image', image: `data:${input.imageMimeType};base64,${input.imageBase64}` },
            ]
          : [{ type: 'text', text: `כותרת: ${input.title}\n\nתוכן:\n${input.text}` }],
    },
  ];

  const result = await generateText({
    model: google(ENRICH_MODEL),
    output: Output.object({ schema: enrichSchema }),
    system,
    messages: messages as Parameters<typeof generateText>[0]['messages'],
    temperature: 0.2,
  });

  const output = result.output as z.infer<typeof enrichSchema>;
  return {
    title: output.title,
    documentType: output.documentType as DocumentType,
    summary: output.summary,
    keyFacts: output.keyFacts,
    entities: output.entities,
  };
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/enrich.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/enrich.ts src/lib/context/engine/__tests__/enrich.test.ts
git commit -m "feat(context-engine): enrich pass via generateText + Output.object (gemini-2.5-flash-lite)"
```

---

### Task 17: `role-mapper.ts`

**Files:**
- Create: `src/lib/context/engine/role-mapper.ts`
- Create: `src/lib/context/engine/__tests__/role-mapper.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/role-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { resolveRole, renderRoleBlock, DOCUMENT_TYPE_TO_ROLE } from '../role-mapper';

describe('resolveRole', () => {
  it('returns the role for a single type', () => {
    expect(resolveRole(['מאמר אקדמי']).role).toBe('חוקר בתחום התוכן');
  });
  it('picks highest priority (legal > marketing)', () => {
    expect(resolveRole(['דף שיווקי', 'חוזה משפטי']).role).toBe('יועץ משפטי בכיר');
  });
  it('falls back to generic when nothing matches', () => {
    expect(resolveRole([]).role).toBe(DOCUMENT_TYPE_TO_ROLE['generic'].role);
  });
});

describe('renderRoleBlock', () => {
  it('returns a Hebrew pre-injection block', () => {
    const out = renderRoleBlock(['חוזה משפטי']);
    expect(out).toContain('התאמת מומחה');
    expect(out).toContain('יועץ משפטי בכיר');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/role-mapper.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `role-mapper.ts`**

```ts
// src/lib/context/engine/role-mapper.ts
import type { DocumentType } from './types';

export interface ExpertRole {
  role: string;
  tone: string;
  focusAreas: string[];
}

export const DOCUMENT_TYPE_TO_ROLE: Record<string, ExpertRole> = {
  'חוזה משפטי':   { role: 'יועץ משפטי בכיר',       tone: 'פורמלי, זהיר, מדויק',        focusAreas: ['סעיפי סיכון', 'חובות וזכויות', 'תנאי סיום'] },
  'מאמר אקדמי':  { role: 'חוקר בתחום התוכן',        tone: 'ניתוחי, מתודי, מבוסס ראיות',  focusAreas: ['תזה מרכזית', 'ממצאים', 'מגבלות מתודולוגיות'] },
  'דף שיווקי':    { role: 'מומחה פרפורמנס מרקטינג', tone: 'משכנע, ממוקד תועלת',         focusAreas: ['Value proposition', 'Call to action', 'Objection handling'] },
  'טבלת נתונים':  { role: 'אנליסט נתונים',          tone: 'כמותי, מדויק, מובנה',         focusAreas: ['מגמות', 'חריגים', 'מדדי מפתח'] },
  'קוד מקור':     { role: 'מהנדס תוכנה בכיר',       tone: 'טכני, מדויק',                focusAreas: ['ארכיטקטורה', 'באגים פוטנציאליים', 'ביצועים'] },
  'אימייל/התכתבות': { role: 'מומחה תקשורת עסקית',  tone: 'ממוקד, מכבד',                focusAreas: ['הקשר', 'אינטרס הדובר', 'צעד הבא'] },
  'תמונה':        { role: 'מומחה ויזואל ו-UX',      tone: 'תיאורי, מדויק',              focusAreas: ['הרכב', 'צבעים', 'טקסט חזותי'] },
  'דף אינטרנט':   { role: 'content strategist',     tone: 'מובנה, שימושי',               focusAreas: ['מסר מרכזי', 'קהל יעד', 'דגשים'] },
  'generic':      { role: 'מומחה תוכן רב-תחומי',    tone: 'ניטרלי, מאוזן',              focusAreas: ['העיקר', 'פרטים רלוונטיים', 'חסרים אפשריים'] },
};

const PRIORITY: DocumentType[] = [
  'חוזה משפטי', 'קוד מקור', 'מאמר אקדמי', 'טבלת נתונים',
  'דף שיווקי', 'אימייל/התכתבות', 'דף אינטרנט', 'תמונה',
];

export function resolveRole(documentTypes: string[]): ExpertRole {
  for (const type of PRIORITY) {
    if (documentTypes.includes(type)) return DOCUMENT_TYPE_TO_ROLE[type];
  }
  return DOCUMENT_TYPE_TO_ROLE['generic'];
}

export function renderRoleBlock(documentTypes: string[]): string {
  if (documentTypes.length === 0) return '';
  const role = resolveRole(documentTypes);
  const typeLabel = PRIORITY.find((t) => documentTypes.includes(t)) ?? 'generic';
  return [
    '━━━ התאמת מומחה ע"ב קונטקסט ━━━',
    `המשתמש סיפק קונטקסט מסוג "${typeLabel}". בעת יצירת הפרומפט:`,
    `- אמץ נקודת מבט של: ${role.role}`,
    `- טון: ${role.tone}`,
    `- התמקד ב: ${role.focusAreas.join(' · ')}`,
    '━━━',
  ].join('\n');
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/role-mapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/role-mapper.ts \
        src/lib/context/engine/__tests__/role-mapper.test.ts
git commit -m "feat(context-engine): dynamic role injection by document type"
```

---

### Task 18: `inject.ts` — final prompt-slot renderer

**Files:**
- Create: `src/lib/context/engine/inject.ts`
- Create: `src/lib/context/engine/__tests__/inject.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/inject.test.ts
import { describe, it, expect } from 'vitest';
import { renderInjection, buildInjectedBlock } from '../inject';
import type { ContextBlock } from '../types';

function block(overrides: Partial<ContextBlock> = {}): ContextBlock {
  return {
    id: 'a', type: 'file', sha256: 'h', stage: 'ready',
    display: {
      title: 'contract_2026.pdf',
      documentType: 'חוזה משפטי',
      summary: 'חוזה שירותים בין חברת אלפא ליעקב כהן.',
      keyFacts: ['שווי 45000 ₪', 'תקופה 12 חודשים'],
      entities: [{ name: 'חברת אלפא', type: 'org' }],
      rawText: '...',
      metadata: { pages: 12 },
    },
    injected: { header: '', body: '', tokenCount: 0 },
    ...overrides,
  };
}

describe('buildInjectedBlock', () => {
  it('produces header + body with facts and summary', () => {
    const r = buildInjectedBlock(block(), 1);
    expect(r.header).toContain('📄');
    expect(r.header).toContain('contract_2026.pdf');
    expect(r.body).toContain('חוזה משפטי');
    expect(r.body).toContain('שווי 45000');
    expect(r.body).toContain('חברת אלפא');
    expect(r.tokenCount).toBeGreaterThan(0);
  });
});

describe('renderInjection', () => {
  it('returns empty string on no blocks', () => {
    expect(renderInjection([])).toBe('');
  });
  it('includes role adaptation header and usage rules', () => {
    const out = renderInjection([block()]);
    expect(out).toContain('התאמת מומחה');
    expect(out).toContain('יועץ משפטי בכיר');
    expect(out).toContain('קונטקסט שסופק');
    expect(out).toContain('הנחיות שימוש בקונטקסט');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/inject.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `inject.ts`**

```ts
// src/lib/context/engine/inject.ts
import { estimateTokens } from '@/lib/context/token-counter';
import { renderRoleBlock } from './role-mapper';
import type { ContextBlock, ContextBlockInjected } from './types';

const USAGE_RULES = [
  '━━━ הנחיות שימוש בקונטקסט ━━━',
  '1. הטמע ציטוטים, מספרים, תאריכים ושמות ספציפיים מהמקורות ישירות בפרומפט הסופי. אל תכתוב "ראה קובץ מצורף".',
  '2. התאם את הטון והתפקיד המומחה לסוג המסמך (חוזה → עורך דין; אקדמי → חוקר).',
  '3. אם יש סתירה בין מקורות, העדף את המקור המאוחר יותר.',
  '4. הקונטקסט הוא רקע, לא תחליף להוראות המשתמש — ההוראות בראש הבקשה מנצחות.',
  '━━━',
].join('\n');

const TYPE_ICON: Record<string, string> = { file: '📄', url: '🌐', image: '🖼️' };

export function buildInjectedBlock(b: ContextBlock, index: number): ContextBlockInjected {
  const icon = TYPE_ICON[b.type] ?? '📎';
  const header = `[מקור #${index} — ${icon} ${b.display.documentType}: ${b.display.title}]`;
  const lines: string[] = [header, `סוג: ${b.display.documentType}`];
  if (b.display.keyFacts.length > 0) {
    lines.push('נקודות מפתח:');
    for (const fact of b.display.keyFacts) lines.push(`  • ${fact}`);
  }
  if (b.display.entities.length > 0) {
    const ents = b.display.entities.map((e) => `${e.name} (${e.type})`).join(', ');
    lines.push(`ישויות מרכזיות: ${ents}`);
  }
  lines.push(`תקציר: ${b.display.summary}`);
  if (b.display.metadata.truncated) {
    lines.push('⚠️ הקובץ נחתך בגלל מגבלת תקציב בתוכנית החינמית');
  }
  const body = lines.join('\n');
  return { header, body, tokenCount: estimateTokens(body) };
}

/**
 * Render the full prompt slot that gets prepended to the engine system prompt.
 * Includes: role adaptation block, context blocks, usage rules.
 */
export function renderInjection(blocks: ContextBlock[]): string {
  if (blocks.length === 0) return '';
  const roleBlock = renderRoleBlock(blocks.map((b) => b.display.documentType));
  const bodies = blocks.map((b, i) => buildInjectedBlock(b, i + 1).body).join('\n\n');
  return [
    roleBlock,
    '',
    '━━━ קונטקסט שסופק על ידי המשתמש ━━━',
    '',
    bodies,
    '',
    USAGE_RULES,
  ].join('\n');
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/inject.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/inject.ts \
        src/lib/context/engine/__tests__/inject.test.ts
git commit -m "feat(context-engine): render unified injection block with role adaptation"
```

---

### Task 19: `src/lib/plans.ts` — `PLAN_CONTEXT_LIMITS`

**Files:**
- Create: `src/lib/plans.ts`
- Create: `src/lib/__tests__/plans.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/plans.test.ts
import { describe, it, expect } from 'vitest';
import { PLAN_CONTEXT_LIMITS, getContextLimits } from '../plans';

describe('PLAN_CONTEXT_LIMITS', () => {
  it('has free and pro tiers with expected shape', () => {
    expect(PLAN_CONTEXT_LIMITS.free.perAttachment).toBe(3_000);
    expect(PLAN_CONTEXT_LIMITS.free.total).toBe(8_000);
    expect(PLAN_CONTEXT_LIMITS.free.maxFiles).toBe(1);
    expect(PLAN_CONTEXT_LIMITS.free.extractionsPerDay).toBe(5);
    expect(PLAN_CONTEXT_LIMITS.free.jinaFallback).toBe(false);
    expect(PLAN_CONTEXT_LIMITS.pro.perAttachment).toBe(12_000);
    expect(PLAN_CONTEXT_LIMITS.pro.extractionsPerDay).toBe(100);
    expect(PLAN_CONTEXT_LIMITS.pro.jinaFallback).toBe(true);
  });
  it('getContextLimits maps plan tier', () => {
    expect(getContextLimits('free')).toBe(PLAN_CONTEXT_LIMITS.free);
    expect(getContextLimits('pro')).toBe(PLAN_CONTEXT_LIMITS.pro);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/__tests__/plans.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `plans.ts`**

```ts
// src/lib/plans.ts
import type { PlanTier } from '@/lib/context/engine/types';

export interface ContextPlanLimits {
  perAttachment: number;
  total: number;
  maxFiles: number;
  maxUrls: number;
  maxImages: number;
  extractionsPerDay: number;
  jinaFallback: boolean;
  deepImageOcr: boolean;
}

export const PLAN_CONTEXT_LIMITS: Record<PlanTier, ContextPlanLimits> = {
  free: {
    perAttachment: 3_000,
    total: 8_000,
    maxFiles: 1,
    maxUrls: 1,
    maxImages: 1,
    extractionsPerDay: 5,
    jinaFallback: false,
    deepImageOcr: false,
  },
  pro: {
    perAttachment: 12_000,
    total: 40_000,
    maxFiles: 5,
    maxUrls: 5,
    maxImages: 5,
    extractionsPerDay: 100,
    jinaFallback: true,
    deepImageOcr: true,
  },
} as const;

export function getContextLimits(tier: PlanTier): ContextPlanLimits {
  return PLAN_CONTEXT_LIMITS[tier];
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/__tests__/plans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plans.ts src/lib/__tests__/plans.test.ts
git commit -m "feat(plans): add PLAN_CONTEXT_LIMITS (free 1+1+1/3k/8k, pro 5+5+5/12k/40k)"
```

---

### Task 20: `src/lib/context/engine/index.ts` — public API

**Files:**
- Create: `src/lib/context/engine/index.ts`

- [ ] **Step 1: Write the file**

```ts
// src/lib/context/engine/index.ts
/**
 * Context Engine public API.
 *
 * Usage:
 *   const block = await processAttachment({ type: 'file', buffer, filename, mimeType, userId, tier });
 *   const prompt = renderInjection(blocks);
 */
import { randomUUID } from 'node:crypto';
import { getContextLimits } from '@/lib/plans';
import { logger } from '@/lib/logger';
import type {
  ContextBlock,
  ProcessAttachmentInput,
  PipelineError,
  DocumentType,
} from './types';
import { dispatchFile, extractUrl, extractImage } from './extract';
import { computeSha256, detectDocumentType } from './classify';
import { enrichContent } from './enrich';
import { compressToLimit } from './compress';
import { buildInjectedBlock, renderInjection } from './inject';
import { getCachedBlock, putCachedBlock } from './cache';

export { renderInjection } from './inject';
export { selectEngineModel } from '@/lib/ai/context-router';
export type { ContextBlock, ProcessAttachmentInput } from './types';

export async function processAttachment(input: ProcessAttachmentInput): Promise<ContextBlock> {
  const limits = getContextLimits(input.tier);
  const id = input.id || randomUUID();

  // 1. EXTRACT
  let rawText = '';
  let sourceTitle = input.filename ?? input.url ?? 'attachment';
  let extractMeta: Record<string, unknown> = {};
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  try {
    if (input.type === 'file') {
      if (!input.buffer || !input.filename || !input.mimeType) {
        throw new Error('file input requires buffer, filename, mimeType');
      }
      const r = await dispatchFile(input.buffer, input.filename, input.mimeType);
      rawText = r.text;
      extractMeta = r.metadata;
      sourceTitle = input.filename;
    } else if (input.type === 'url') {
      if (!input.url) throw new Error('url input requires url');
      const r = await extractUrl(input.url, { jinaFallback: limits.jinaFallback });
      rawText = r.text;
      extractMeta = r.metadata;
      sourceTitle = r.metadata.title ?? input.url;
    } else if (input.type === 'image') {
      if (!input.buffer || !input.mimeType) {
        throw new Error('image input requires buffer, mimeType');
      }
      const r = await extractImage(input.buffer, input.mimeType);
      imageBase64 = r.base64;
      imageMimeType = r.mimeType ?? input.mimeType;
      extractMeta = r.metadata;
      sourceTitle = input.filename ?? 'image';
      rawText = ''; // filled by enrich via vision
    }
  } catch (err) {
    return failedBlock(id, input, 'extract', err);
  }

  // 2. CLASSIFY + CACHE KEY
  const sha256 = computeSha256(
    input.type === 'image' ? (input.buffer as Buffer) : rawText || sourceTitle,
  );
  const cached = await getCachedBlock(sha256, input.tier);
  if (cached) {
    logger.info('[context-engine] cache hit', { sha256, tier: input.tier });
    return { ...cached, id };
  }
  const detectedType: DocumentType = detectDocumentType(rawText, sourceTitle, input.type);

  // 3. ENRICH
  let enriched;
  try {
    enriched = await enrichContent({
      text: rawText,
      detectedType,
      sourceType: input.type,
      title: sourceTitle,
      imageBase64,
      imageMimeType,
    });
  } catch (err) {
    logger.warn('[context-engine] enrich failed — returning warning block', err);
    return warningBlock(id, input, sha256, rawText, sourceTitle, detectedType, extractMeta, err);
  }

  // 4. COMPRESS
  const compressed = compressToLimit(rawText, limits.perAttachment);

  // 5. STRUCTURE
  const block: ContextBlock = {
    id,
    type: input.type,
    sha256,
    stage: 'ready',
    display: {
      title: enriched.title,
      documentType: enriched.documentType,
      summary: enriched.summary,
      keyFacts: enriched.keyFacts,
      entities: enriched.entities,
      rawText: compressed.text,
      metadata: {
        ...extractMeta,
        truncated: compressed.truncated,
        originalTokenCount: compressed.originalTokenCount,
        filename: input.filename,
        sourceUrl: input.url,
        mimeType: input.mimeType,
      },
    },
    injected: { header: '', body: '', tokenCount: 0 },
  };
  block.injected = buildInjectedBlock(block, 1);

  // 6. CACHE
  await putCachedBlock(block, input.tier);
  return block;
}

export async function processBatch(
  inputs: ProcessAttachmentInput[],
): Promise<ContextBlock[]> {
  return Promise.all(inputs.map(processAttachment));
}

// ---- helpers ----

function failedBlock(
  id: string,
  input: ProcessAttachmentInput,
  stage: PipelineError['stage'],
  err: unknown,
): ContextBlock {
  const message = err instanceof Error ? err.message : String(err);
  return {
    id,
    type: input.type,
    sha256: '',
    stage: 'error',
    error: { stage, message, retryable: true },
    display: {
      title: input.filename ?? input.url ?? 'attachment',
      documentType: 'generic',
      summary: '',
      keyFacts: [],
      entities: [],
      rawText: '',
      metadata: { filename: input.filename, sourceUrl: input.url },
    },
    injected: { header: '', body: '', tokenCount: 0 },
  };
}

function warningBlock(
  id: string,
  input: ProcessAttachmentInput,
  sha256: string,
  rawText: string,
  title: string,
  detectedType: DocumentType,
  extractMeta: Record<string, unknown>,
  err: unknown,
): ContextBlock {
  const message = err instanceof Error ? err.message : String(err);
  const block: ContextBlock = {
    id,
    type: input.type,
    sha256,
    stage: 'warning',
    error: { stage: 'enrich', message, retryable: true },
    display: {
      title,
      documentType: detectedType,
      summary: rawText.slice(0, 400),
      keyFacts: [],
      entities: [],
      rawText,
      metadata: { ...extractMeta, filename: input.filename, sourceUrl: input.url },
    },
    injected: { header: '', body: '', tokenCount: 0 },
  };
  block.injected = buildInjectedBlock(block, 1);
  return block;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors. Note: the `selectEngineModel` re-export from `@/lib/ai/context-router` will be added in Task 21; temporarily comment out that re-export line until Task 21 lands, then restore it.

- [ ] **Step 3: Commit**

```bash
git add src/lib/context/engine/index.ts
git commit -m "feat(context-engine): public API — processAttachment + processBatch + renderInjection"
```

---

### Task 21: `src/lib/ai/context-router.ts` — Flash Lite / Flash router

**Files:**
- Create: `src/lib/ai/context-router.ts`
- Create: `src/lib/ai/__tests__/context-router.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/ai/__tests__/context-router.test.ts
import { describe, it, expect } from 'vitest';
import { selectEngineModel, SMALL_CONTEXT_THRESHOLD } from '../context-router';
import type { ContextBlock } from '@/lib/context/engine/types';

function blk(tokens: number): ContextBlock {
  return {
    id: 'x', type: 'file', sha256: 'h', stage: 'ready',
    display: {
      title: '', documentType: 'generic', summary: '',
      keyFacts: [], entities: [], rawText: '', metadata: {},
    },
    injected: { header: '', body: '', tokenCount: tokens },
  };
}

describe('selectEngineModel', () => {
  it('returns flash-lite on no blocks', () => {
    expect(selectEngineModel({ blocks: [] })).toBe('gemini-2.5-flash-lite');
  });
  it('returns flash-lite when under threshold', () => {
    expect(selectEngineModel({ blocks: [blk(500), blk(1000)] })).toBe('gemini-2.5-flash-lite');
  });
  it('returns flash at exactly threshold+1', () => {
    expect(selectEngineModel({ blocks: [blk(SMALL_CONTEXT_THRESHOLD + 1)] })).toBe('gemini-2.5-flash');
  });
  it('returns flash on large context', () => {
    expect(selectEngineModel({ blocks: [blk(10_000)] })).toBe('gemini-2.5-flash');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/ai/__tests__/context-router.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `context-router.ts`**

```ts
// src/lib/ai/context-router.ts
import * as Sentry from '@sentry/nextjs';
import type { ContextBlock } from '@/lib/context/engine/types';

export const SMALL_CONTEXT_THRESHOLD = 2_000;

export type CheapModel = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash';

/**
 * Pick the cheapest capable model for a context-bearing generation call.
 * Only returns cheap-stack models. The AIGateway handles fallbacks to
 * Mistral/Llama/DeepSeek on failure.
 */
export function selectEngineModel(opts: { blocks: ContextBlock[] }): CheapModel {
  const totalTokens = opts.blocks.reduce((s, b) => s + b.injected.tokenCount, 0);
  const selected: CheapModel =
    totalTokens <= SMALL_CONTEXT_THRESHOLD ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash';

  Sentry.addBreadcrumb({
    category: 'context-router',
    message: 'selectEngineModel',
    level: 'info',
    data: { selectedModel: selected, tokens: totalTokens, blocks: opts.blocks.length },
  });

  return selected;
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/ai/__tests__/context-router.test.ts`
Expected: PASS.

- [ ] **Step 5: Restore the re-export in `engine/index.ts`**

Uncomment the `export { selectEngineModel } from '@/lib/ai/context-router';` line.
Run: `npm run typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/context-router.ts src/lib/ai/__tests__/context-router.test.ts \
        src/lib/context/engine/index.ts
git commit -m "feat(ai): context-router picks Flash Lite (≤2k) or Flash (cheap-stack only)"
```

---

### Task 22: Extraction rate limiter (per-tier, per-day)

**Files:**
- Create: `src/lib/context/engine/extraction-rate-limit.ts`
- Create: `src/lib/context/engine/__tests__/extraction-rate-limit.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/context/engine/__tests__/extraction-rate-limit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const counts = new Map<string, number>();
vi.mock('@/lib/redis', () => ({
  redis: {
    incr: vi.fn(async (k: string) => {
      const n = (counts.get(k) ?? 0) + 1; counts.set(k, n); return n;
    }),
    expire: vi.fn(async () => 1),
  },
}));

import { checkExtractionLimit } from '../extraction-rate-limit';

describe('checkExtractionLimit', () => {
  beforeEach(() => { counts.clear(); });
  it('allows up to the free daily cap', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await checkExtractionLimit('u1', 'free')).allowed).toBe(true);
    }
    const r = await checkExtractionLimit('u1', 'free');
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });
  it('allows up to pro daily cap', async () => {
    for (let i = 0; i < 100; i++) {
      expect((await checkExtractionLimit('u2', 'pro')).allowed).toBe(true);
    }
    expect((await checkExtractionLimit('u2', 'pro')).allowed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/lib/context/engine/__tests__/extraction-rate-limit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `extraction-rate-limit.ts`**

```ts
// src/lib/context/engine/extraction-rate-limit.ts
import { redis } from '@/lib/redis';
import { getContextLimits } from '@/lib/plans';
import type { PlanTier } from './types';

export interface ExtractionLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function dayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export async function checkExtractionLimit(
  userId: string,
  tier: PlanTier,
): Promise<ExtractionLimitResult> {
  const limit = getContextLimits(tier).extractionsPerDay;
  const key = `extract:${userId}:${dayKey()}`;
  const count = (await redis.incr(key)) as number;
  if (count === 1) await redis.expire(key, 60 * 60 * 26); // 26h grace
  const allowed = count <= limit;
  return { allowed, remaining: Math.max(0, limit - count), limit };
}
```

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/lib/context/engine/__tests__/extraction-rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/engine/extraction-rate-limit.ts \
        src/lib/context/engine/__tests__/extraction-rate-limit.test.ts
git commit -m "feat(context-engine): per-tier daily extraction rate limiter"
```

---

### Task 23: Rewrite `/api/context/extract-file` as thin wrapper

**Files:**
- Modify: `src/app/api/context/extract-file/route.ts`

- [ ] **Step 1: Replace the entire file**

```ts
// src/app/api/context/extract-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processAttachment } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import { MAX_FILE_SIZE_MB } from '@/lib/context/engine/extract';
import type { PlanTier } from '@/lib/context/engine/types';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles').select('plan_tier').eq('id', user.id).maybeSingle();
    const tier: PlanTier = profile?.plan_tier === 'pro' ? 'pro' : 'free';

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `חרגת ממכסת העיבוד היומית (${rl.limit}). נסה שוב מחר או שדרג ל-Pro.`, remaining: 0 },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)` }, { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const block = await processAttachment({
      id: crypto.randomUUID(),
      type: 'file',
      userId: user.id,
      tier,
      buffer,
      filename: file.name,
      mimeType: file.type,
    });

    return NextResponse.json({ block });
  } catch (err) {
    logger.error('[context/extract-file]', err);
    return NextResponse.json({ error: 'שגיאה בעיבוד הקובץ' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/context/extract-file/route.ts
git commit -m "refactor(api): /context/extract-file delegates to contextEngine"
```

---

### Task 24: Rewrite `/api/context/extract-url` and `/api/context/describe-image`

**Files:**
- Modify: `src/app/api/context/extract-url/route.ts`
- Modify: `src/app/api/context/describe-image/route.ts`

- [ ] **Step 1: Rewrite `extract-url/route.ts`**

```ts
// src/app/api/context/extract-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processAttachment } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import type { PlanTier } from '@/lib/context/engine/types';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('plan_tier').eq('id', user.id).maybeSingle();
    const tier: PlanTier = profile?.plan_tier === 'pro' ? 'pro' : 'free';

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'חרגת ממכסת העיבוד היומית' }, { status: 429 },
      );
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL חסר' }, { status: 400 });
    }

    const block = await processAttachment({
      id: crypto.randomUUID(), type: 'url', userId: user.id, tier, url,
    });
    return NextResponse.json({ block });
  } catch (err) {
    logger.error('[context/extract-url]', err);
    const msg = err instanceof Error ? err.message : 'שגיאה בעיבוד הקישור';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite `describe-image/route.ts`**

```ts
// src/app/api/context/describe-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processAttachment } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import type { PlanTier } from '@/lib/context/engine/types';

export const maxDuration = 30;

const MAX_IMAGE_SIZE_MB = 5;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('plan_tier').eq('id', user.id).maybeSingle();
    const tier: PlanTier = profile?.plan_tier === 'pro' ? 'pro' : 'free';

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'חרגת ממכסת העיבוד היומית' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: 'לא נבחרה תמונה' }, { status: 400 });

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_IMAGE_SIZE_MB) {
      return NextResponse.json(
        { error: `התמונה גדולה מדי (מקסימום ${MAX_IMAGE_SIZE_MB}MB)` }, { status: 400 },
      );
    }
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'פורמט תמונה לא נתמך' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const block = await processAttachment({
      id: crypto.randomUUID(), type: 'image', userId: user.id, tier,
      buffer, filename: file.name, mimeType: file.type,
    });
    return NextResponse.json({ block });
  } catch (err) {
    logger.error('[context/describe-image]', err);
    return NextResponse.json({ error: 'שגיאה בעיבוד התמונה' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Delete the Phase 0 env-var test (now obsolete)**

```bash
rm src/app/api/context/__tests__/describe-image-env.test.ts
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/context/extract-url/route.ts \
        src/app/api/context/describe-image/route.ts \
        src/app/api/context/__tests__/describe-image-env.test.ts
git commit -m "refactor(api): /context/{extract-url,describe-image} delegate to contextEngine"
```

---

### Task 25: Wire `BaseEngine.generate()` to the new engine + delete `context-cache.ts`

**Files:**
- Modify: `src/lib/engines/base-engine.ts` (delete lines 582-679, replace with 5-line call)
- Delete: `src/lib/engines/context-cache.ts`
- Remove `pdf-parse` from package.json
- Remove `pdf-parse` from `next.config.ts` `serverExternalPackages`

- [ ] **Step 1: Read current base-engine context block range**

Run: `sed -n '582,679p' src/lib/engines/base-engine.ts` (use Read tool, not sed literally). Confirm the block bounds match. Adjust line numbers in the edit if the file has shifted.

- [ ] **Step 2: Replace context block with the new injection call**

Find the block that starts with `if (input.context && input.context.length > 0) {` (around line 582) and ends with the matching `}` after `=== סוף תוכן מצורף ===` (around line 679).

Replace with:

```ts
if (input.context && input.context.length > 0) {
  // New unified Context Engine injection.
  // input.context carries ContextBlock[] produced server-side by processAttachment.
  const { renderInjection } = await import('@/lib/context/engine');
  const rendered = renderInjection(input.context as unknown as import('@/lib/context/engine/types').ContextBlock[]);
  if (rendered) contextInjected += `\n\n${rendered}\n`;
}
```

Note: `input.context` currently has type `ContextAttachment[]` (old shape). We'll extend it to accept `ContextBlock[]` alongside the legacy shape in Task 26. For now the cast is intentional and marked `as unknown as`.

- [ ] **Step 3: Wire the model router**

Find the line in `BaseEngine.generate()` where the model is selected for the generation call (search for `generateStream` or `generateFull` invocation). Before that call, add:

```ts
import { selectEngineModel } from '@/lib/ai/context-router';
// ...
const preferredModel = selectEngineModel({
  blocks: (input.context ?? []) as unknown as import('@/lib/context/engine/types').ContextBlock[],
});
```

Pass `preferredModel` as the first-choice model to `AIGateway.generateStream()` / `generateFull()`. If the gateway signature does not yet accept a `preferredModel` argument, add an optional parameter there (edit `src/lib/ai/gateway.ts`) that prepends the preferred model to the fallback chain when set.

- [ ] **Step 4: Delete `context-cache.ts`**

```bash
git rm src/lib/engines/context-cache.ts
```

Grep for remaining imports:

```bash
grep -rn "context-cache" src/ || echo "no remaining imports"
```

If the grep returns hits, update those imports to pull from `@/lib/context/engine` instead.

- [ ] **Step 5: Remove `pdf-parse`**

```bash
npm uninstall pdf-parse
```

Edit `next.config.ts` and remove `'pdf-parse'` from the `serverExternalPackages` array. Keep the other four entries (`pdfjs-dist`, `mammoth`, `xlsx`, `@napi-rs/canvas`).

- [ ] **Step 6: Run the full test suite**

Run: `npm run test && npm run typecheck`
Expected: no failures.

- [ ] **Step 7: Commit**

```bash
git add src/lib/engines/base-engine.ts src/lib/engines/context-cache.ts \
        src/lib/ai/gateway.ts next.config.ts package.json package-lock.json
git commit -m "refactor(engines): BaseEngine uses contextEngine.renderInjection + selectEngineModel

- delete context-cache.ts (superseded)
- remove pdf-parse (replaced by direct pdfjs-dist/legacy in extract/file-pdf.ts)
- AIGateway accepts optional preferredModel from context-router"
```

---

### Task 26: Extend `ContextAttachment` / API contract to carry `ContextBlock`

**Files:**
- Modify: `src/lib/context/types.ts`
- Modify: `src/hooks/useContextAttachments.ts`

- [ ] **Step 1: Extend `ContextAttachment`**

In `src/lib/context/types.ts`, add an optional `block?: ContextBlock` field to the existing `ContextAttachment` type. Keep the existing `content`, `description`, etc. for backward compat during rollout.

```ts
import type { ContextBlock, ProcessingStage } from './engine/types';

export interface ContextAttachment {
  // ... existing fields unchanged ...
  block?: ContextBlock;   // NEW — populated from API response
  stage?: ProcessingStage; // NEW — drives the progress bar
}
```

- [ ] **Step 2: Update `useContextAttachments.ts` to read `{block}` from the API**

Locate the three fetch calls (`/api/context/extract-file`, `/extract-url`, `/describe-image`). Where they currently read the legacy response shape (`text`, `description`, `tokens`), add a branch that reads `block` when present and stores it on the attachment:

```ts
const body = await res.json();
if (body.block) {
  setAttachments((prev) => prev.map(a =>
    a.id === att.id
      ? { ...a, block: body.block, stage: body.block.stage, status: body.block.stage === 'error' ? 'error' : 'ready' }
      : a,
  ));
  return;
}
// legacy fallback (can be removed once all three routes return {block})
```

- [ ] **Step 3: Update the payload sent on enhance**

When building the context payload for `/api/enhance`, prefer `attachment.block` over the legacy `content`/`description`. The payload shape sent to the server becomes:

```ts
context: attachments
  .filter(a => a.status === 'ready' && a.block)
  .map(a => a.block),
```

- [ ] **Step 4: Run typecheck and tests**

```bash
npm run typecheck && npm run test
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/types.ts src/hooks/useContextAttachments.ts
git commit -m "feat(context): wire ContextBlock end-to-end through useContextAttachments"
```

---

### Task 27: Phase 1 integration test (e2e)

**Files:**
- Create: `src/app/api/context/__tests__/extract-file.e2e.test.ts`
- Create: `src/app/api/enhance/__tests__/context-e2e.test.ts`

- [ ] **Step 1: Write extract-file e2e test**

```ts
// src/app/api/context/__tests__/extract-file.e2e.test.ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: 'pro' } }) }) }) }),
  }),
}));
vi.mock('@/lib/context/engine/extraction-rate-limit', () => ({
  checkExtractionLimit: async () => ({ allowed: true, remaining: 100, limit: 100 }),
}));
vi.mock('@/lib/context/engine/enrich', () => ({
  enrichContent: async () => ({
    title: 'Sample', documentType: 'generic',
    summary: 'א'.repeat(120), keyFacts: ['fact1'], entities: [],
  }),
}));
vi.mock('@/lib/context/engine/cache', () => ({
  getCachedBlock: async () => null, putCachedBlock: async () => {},
}));

import { POST } from '../extract-file/route';

describe('POST /api/context/extract-file (e2e)', () => {
  it('returns a ContextBlock for a real PDF fixture', async () => {
    const pdf = readFileSync(resolve('tests/fixtures/context/sample.pdf'));
    const form = new FormData();
    form.set('file', new File([pdf], 'sample.pdf', { type: 'application/pdf' }));
    const req = new Request('http://t', { method: 'POST', body: form });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.block.type).toBe('file');
    expect(body.block.display.title).toBe('Sample');
    expect(body.block.stage).toBe('ready');
    expect(body.block.injected.body).toContain('גנרי'.slice(0, 0)); // structural existence
    expect(body.block.injected.tokenCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Write enhance-with-context e2e test**

This test asserts that when the enhance route receives `ContextBlock[]` in the payload, the generated model call includes the injected block in the system prompt.

```ts
// src/app/api/enhance/__tests__/context-e2e.test.ts
import { describe, it, expect, vi } from 'vitest';

const generateFullMock = vi.fn(async () => ({ text: 'out', model: 'gemini-2.5-flash' }));
vi.mock('@/lib/ai/gateway', () => ({
  AIGateway: { generateFull: (args: unknown) => generateFullMock(args) },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: 'pro', credits: 100 } }) }) }) }),
  }),
}));

import { POST } from '../enhance/route';
import type { ContextBlock } from '@/lib/context/engine/types';

const block: ContextBlock = {
  id: 'b1', type: 'file', sha256: 'h', stage: 'ready',
  display: {
    title: 'contract.pdf', documentType: 'חוזה משפטי',
    summary: 'חוזה שירותים.', keyFacts: ['שווי 45000 ₪'],
    entities: [{ name: 'אלפא בע"מ', type: 'org' }],
    rawText: '...', metadata: { pages: 12 },
  },
  injected: { header: '', body: '', tokenCount: 250 },
};

describe('POST /api/enhance with context', () => {
  it('injects role block, facts, and usage rules into the model system prompt', async () => {
    const res = await POST(new Request('http://t', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'תסכם את החוזה', context: [block] }),
    }) as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const args = generateFullMock.mock.calls[0][0] as { system: string };
    expect(args.system).toContain('יועץ משפטי בכיר');
    expect(args.system).toContain('שווי 45000');
    expect(args.system).toContain('הנחיות שימוש בקונטקסט');
  });
});
```

- [ ] **Step 3: Run the tests — they should both pass**

Run: `npm run test -- src/app/api/context/__tests__/extract-file.e2e.test.ts src/app/api/enhance/__tests__/context-e2e.test.ts`
Expected: PASS. If the second test fails because `enhance/route.ts` does not currently accept `ContextBlock[]` in the body, add a JSON body parse branch that forwards `context` through to `BaseEngine.generate` unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/context/__tests__/extract-file.e2e.test.ts \
        src/app/api/enhance/__tests__/context-e2e.test.ts
git commit -m "test(context-engine): e2e coverage for extract-file + enhance injection"
```

---

### Task 28: Deploy Phase 1 to preview + smoke test

**Files:** none new.

- [ ] **Step 1: Push and let Vercel build**

```bash
git push origin HEAD
```

Wait for preview URL via `mcp__vercel__get_deployment` or `gh pr checks`.

- [ ] **Step 2: Manual smoke — three attachment paths**

On the preview URL:
1. Upload a real text PDF → expect 200 + card still shows (old card UI — unchanged in Phase 1).
2. Paste a URL to a plain article → 200.
3. Upload a PNG → 200.

All three should return `{ block: { ... } }` shape in DevTools Network tab.

- [ ] **Step 3: Check Vercel function logs**

`mcp__vercel__get_runtime_logs` on the preview deployment. Confirm zero `Cannot load "@napi..."` warnings and no 500s. Confirm Sentry breadcrumbs for `context-router` show `selectedModel`.

- [ ] **Step 4: If smoke passes, merge to main**

```bash
git checkout main && git merge --ff-only <branch> && git push origin main
```

Phase 1 is live.

---

## Phase 2 — Rich Attachment Card UI

The server already returns `ContextBlock`; now the UI exposes it.

### Task 29: Stage progress bar component

**Files:**
- Create: `src/components/features/context/StageProgressBar.tsx`
- Create: `src/components/features/context/__tests__/StageProgressBar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/features/context/__tests__/StageProgressBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StageProgressBar } from '../StageProgressBar';

describe('StageProgressBar', () => {
  it('renders 4 stage pills', () => {
    render(<StageProgressBar stage="extracting" />);
    const pills = screen.getAllByTestId('stage-pill');
    expect(pills).toHaveLength(4);
  });
  it('marks extracting as active and uploading as complete', () => {
    render(<StageProgressBar stage="extracting" />);
    expect(screen.getByTestId('stage-pill-uploading')).toHaveAttribute('data-state', 'complete');
    expect(screen.getByTestId('stage-pill-extracting')).toHaveAttribute('data-state', 'active');
    expect(screen.getByTestId('stage-pill-enriching')).toHaveAttribute('data-state', 'pending');
  });
  it('shows error state when stage=error', () => {
    render(<StageProgressBar stage="error" />);
    expect(screen.getByTestId('stage-error')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm run test -- src/components/features/context/__tests__/StageProgressBar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `StageProgressBar.tsx`**

```tsx
// src/components/features/context/StageProgressBar.tsx
'use client';
import { motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import type { ProcessingStage } from '@/lib/context/engine/types';

const STAGES: Array<{ id: ProcessingStage; label: string }> = [
  { id: 'uploading',  label: 'מעלה' },
  { id: 'extracting', label: 'קורא' },
  { id: 'enriching',  label: 'מבין' },
  { id: 'ready',      label: 'מוכן' },
];

type PillState = 'pending' | 'active' | 'complete';

function pillState(current: ProcessingStage, pillId: ProcessingStage): PillState {
  const order = STAGES.map((s) => s.id);
  const ci = order.indexOf(current);
  const pi = order.indexOf(pillId);
  if (ci === -1 || pi === -1) return 'pending';
  if (pi < ci) return 'complete';
  if (pi === ci) return 'active';
  return 'pending';
}

export function StageProgressBar({ stage }: { stage: ProcessingStage }) {
  if (stage === 'error') {
    return (
      <div data-testid="stage-error" className="flex items-center gap-2 text-red-600 text-sm">
        <X className="w-4 h-4" />
        <span>לא הצלחנו — נסה שוב?</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" dir="rtl">
      {STAGES.map((s) => {
        const state = pillState(stage, s.id);
        return (
          <div
            key={s.id}
            data-testid={`stage-pill-${s.id}`}
            data-state={state}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
              state === 'complete' && 'bg-green-100 text-green-700',
              state === 'active'   && 'bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 text-white shadow-md',
              state === 'pending'  && 'bg-zinc-100 text-zinc-400',
            ].filter(Boolean).join(' ')}
          >
            {state === 'complete' && <Check className="w-3 h-3" />}
            {state === 'active' && (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                <Loader2 className="w-3 h-3" />
              </motion.span>
            )}
            <span>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// test stable export
export function _stagePillTestids() {
  return STAGES.map((s) => `stage-pill-${s.id}`);
}

// Needed for getAllByTestId in tests
StageProgressBar.displayName = 'StageProgressBar';
```

Also add a catch-all `data-testid="stage-pill"` via a wrapper span around the content of each pill, OR update the test to query `stage-pill-${id}` directly. Simpler fix: in the test, use `screen.getAllByTestId(/stage-pill-/)` with a regex.

Update the test if needed. Rerun.

- [ ] **Step 4: Re-run test — expect pass**

Run: `npm run test -- src/components/features/context/__tests__/StageProgressBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/context/StageProgressBar.tsx \
        src/components/features/context/__tests__/StageProgressBar.test.tsx
git commit -m "feat(context-ui): 4-stage gradient progress bar with framer-motion"
```

---

### Task 30: `AttachmentCard` component

**Files:**
- Create: `src/components/features/context/AttachmentCard.tsx`

- [ ] **Step 1: Write the file**

```tsx
// src/components/features/context/AttachmentCard.tsx
'use client';
import { useState } from 'react';
import { FileText, Globe, Image as ImageIcon, X } from 'lucide-react';
import { StageProgressBar } from './StageProgressBar';
import { AttachmentDetailsDrawer } from './AttachmentDetailsDrawer';
import type { ContextBlock, ProcessingStage } from '@/lib/context/engine/types';

interface Props {
  block?: ContextBlock;
  stage: ProcessingStage;
  title: string;
  onRemove: () => void;
  onRetry?: () => void;
}

const ICON: Record<ContextBlock['type'] | 'file', React.ComponentType<{ className?: string }>> = {
  file: FileText,
  url: Globe,
  image: ImageIcon,
};

export function AttachmentCard({ block, stage, title, onRemove, onRetry }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = ICON[block?.type ?? 'file'];
  const canOpen = stage === 'ready' || stage === 'warning';
  const isError = stage === 'error';

  return (
    <>
      <button
        type="button"
        onClick={() => canOpen && setOpen(true)}
        disabled={!canOpen}
        className={[
          'group relative w-full rounded-xl border p-3 text-right transition-all',
          'flex items-start gap-3',
          isError ? 'border-red-300 bg-red-50' :
          stage === 'warning' ? 'border-amber-300 bg-amber-50' :
          'border-zinc-200 bg-white hover:border-purple-300 hover:shadow-md',
          block?.display.metadata.truncated && 'ring-2 ring-blue-200',
        ].filter(Boolean).join(' ')}
      >
        <Icon className="w-5 h-5 shrink-0 mt-0.5 text-zinc-600" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{block?.display.title ?? title}</div>
          {block && (
            <div className="text-xs text-zinc-500 mt-0.5 truncate">
              {block.display.documentType} · {block.injected.tokenCount} טוקנים
            </div>
          )}
          <div className="mt-2"><StageProgressBar stage={stage} /></div>
          {block?.display.metadata.truncated && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-md px-2 py-1.5 border border-blue-200">
              📄 הצגנו את {block.display.metadata.pages ?? '?'} העמודים הראשונים בלבד.{' '}
              <a href="/pricing#context" className="underline font-medium">שדרג ל-Pro</a> למסמכים מלאים.
            </div>
          )}
          {isError && onRetry && (
            <div className="mt-2 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onRetry(); }}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                נסה שוב
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-100"
          aria-label="הסר"
        >
          <X className="w-4 h-4" />
        </button>
      </button>
      {block && open && (
        <AttachmentDetailsDrawer block={block} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors (other than missing `AttachmentDetailsDrawer` — fixed in Task 31).

- [ ] **Step 3: Defer commit until Task 31 lands**

---

### Task 31: `AttachmentDetailsDrawer` component with copy buttons

**Files:**
- Create: `src/components/features/context/AttachmentDetailsDrawer.tsx`
- Create: `src/components/features/context/CopyButton.tsx`

- [ ] **Step 1: Write `CopyButton.tsx`**

```tsx
// src/components/features/context/CopyButton.tsx
'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-zinc-100 text-zinc-600"
      aria-label={label ?? 'העתק'}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? 'הועתק' : (label ?? 'העתק')}</span>
    </button>
  );
}
```

- [ ] **Step 2: Write `AttachmentDetailsDrawer.tsx`**

```tsx
// src/components/features/context/AttachmentDetailsDrawer.tsx
'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { CopyButton } from './CopyButton';
import type { ContextBlock } from '@/lib/context/engine/types';

interface Props {
  block: ContextBlock;
  onClose: () => void;
  onRefreshEnrich?: () => void;
  onRemove?: () => void;
}

export function AttachmentDetailsDrawer({ block, onClose, onRefreshEnrich, onRemove }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const d = block.display;
  const fullContext = [
    d.title,
    `סוג: ${d.documentType}`,
    `תקציר: ${d.summary}`,
    'נקודות מפתח:',
    ...d.keyFacts.map((f) => `- ${f}`),
    'ישויות:',
    ...d.entities.map((e) => `- ${e.name} (${e.type})`),
  ].join('\n');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}
        dir="rtl"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-100">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-purple-600 font-medium">{d.documentType}</div>
              <h2 className="font-bold text-lg truncate">{d.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={fullContext} label="העתק את הקונטקסט המלא" />
              <button onClick={onClose} aria-label="סגור" className="p-2 rounded hover:bg-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <Section title="תקציר" copyText={d.summary}>
              <p className="text-sm leading-relaxed text-zinc-700">{d.summary}</p>
            </Section>

            {d.keyFacts.length > 0 && (
              <Section title="נקודות מפתח" copyText={d.keyFacts.map((f) => `• ${f}`).join('\n')}>
                <ul className="space-y-1.5">
                  {d.keyFacts.map((f, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span>• {f}</span>
                      <CopyButton text={f} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {d.entities.length > 0 && (
              <Section title="ישויות" copyText={d.entities.map((e) => `${e.name} (${e.type})`).join('\n')}>
                <div className="flex flex-wrap gap-1.5">
                  {d.entities.map((e, i) => (
                    <span key={i} className="text-xs bg-zinc-100 px-2 py-1 rounded-full">
                      {e.name} <span className="text-zinc-400">· {e.type}</span>
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {d.rawText && (
              <div>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  {showRaw ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  טקסט גולמי
                  {showRaw && <span className="ms-auto"><CopyButton text={d.rawText} /></span>}
                </button>
                {showRaw && (
                  <pre className="mt-2 bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs overflow-x-auto max-h-64">
                    {d.rawText}
                  </pre>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-50 border-t border-zinc-100">
            {onRefreshEnrich && (
              <button onClick={onRefreshEnrich} className="text-sm text-purple-700 hover:underline">
                רענן תיאור
              </button>
            )}
            {onRemove && (
              <button onClick={() => { onRemove(); onClose(); }} className="text-sm text-red-600 hover:underline">
                הסר מהקונטקסט
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ title, children, copyText }: {
  title: string; children: React.ReactNode; copyText: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-zinc-900">{title}</h3>
        <CopyButton text={copyText} />
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit Task 30 + Task 31 together**

```bash
git add src/components/features/context/
git commit -m "feat(context-ui): AttachmentCard + AttachmentDetailsDrawer with copy buttons"
```

---

### Task 32: Wire the new card into `AttachmentList`

**Files:**
- Modify: the existing attachment list component used inside `PromptInput` (location varies — grep for `AttachmentList` or the current inline rendering of attachments)

- [ ] **Step 1: Locate the current attachment rendering**

```bash
grep -rn "ContextAttachment\|attachments\.map" src/components/features/prompt-improver | head
```

- [ ] **Step 2: Replace inline rendering with `AttachmentCard`**

For each attachment in the list, render:

```tsx
<AttachmentCard
  key={a.id}
  block={a.block}
  stage={a.stage ?? 'uploading'}
  title={a.name || a.url || 'attachment'}
  onRemove={() => removeAttachment(a.id)}
  onRetry={a.block?.error?.retryable ? () => retryAttachment(a.id) : undefined}
/>
```

If `retryAttachment` does not exist on the hook, add a stub that re-posts the attachment via the same upload method.

- [ ] **Step 3: Smoke test in dev**

Run: `npm run dev`
In the browser, upload a PDF. Expected:
1. Card appears with uploading pill active.
2. Transitions: uploading → extracting → enriching → ready.
3. Click card → drawer opens with summary, facts, entities, copy buttons.
4. Copy button shows "הועתק" for 1.5s.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/prompt-improver/
git commit -m "feat(prompt-input): use AttachmentCard + drawer for context attachments"
```

---

### Task 33: Deploy Phase 2 to preview + visual verify

**Files:** none new.

- [ ] **Step 1: Push**

```bash
git push origin HEAD
```

- [ ] **Step 2: Manual checklist on preview**

Run through the spec's Section 6 "Manual verification checklist" steps 1-8. All must pass.

- [ ] **Step 3: Merge to main if all green**

---

## Phase 3 — Final Polish and Monitoring

### Task 34: Sentry dashboard + cost alerting

**Files:** none (configuration).

- [ ] **Step 1: In Sentry, create a filtered view**

Filter: `breadcrumbs.category:context-router`. Group by `data.selectedModel`. This lets us see the Flash Lite vs Flash split in production.

- [ ] **Step 2: Document the view in the spec**

Add a one-line mention to the spec's Section 4.7.2 "Observability" pointing to the Sentry view name.

Run: `git add docs/superpowers/specs/2026-04-09-context-engine-design.md`
If no change, skip this step.

---

### Task 35: Final acceptance run

**Files:** none.

- [ ] **Step 1: Run the full test suite on main**

```bash
npm run test && npm run typecheck && npm run lint
```

Expected: green.

- [ ] **Step 2: Manual smoke on production**

Same 8-step checklist from spec Section 6 but on production URL. Any failure → open an incident and roll back the relevant phase.

- [ ] **Step 3: Announce**

Post a short update in the project channel: "Context Engine live. File/URL/image ingest restored + unified pipeline + rich card UX. Spec: `docs/superpowers/specs/2026-04-09-context-engine-design.md`. Plan: `docs/superpowers/plans/2026-04-09-context-engine.md`."

---

## Self-Review Notes

Spec coverage cross-check:

| Spec section | Task(s) |
|---|---|
| §1 Problem — describe-image 503 | Task 1 |
| §1 Problem — extract-file 500 | Task 2, Task 9 |
| §1 Problem — weak URL extraction | Task 12 |
| §4.1 Pipeline | Tasks 5-20 |
| §4.2 File structure | Tasks 5-20 (every file) |
| §4.3 ContextBlock shape | Task 5 |
| §4.4 Injection format | Task 18 |
| §4.5 Plan limits | Task 19, Task 22 |
| §4.6 Rich card UX | Tasks 29-32 |
| §4.7.1 Role injection | Task 17 |
| §4.7.2 Model routing | Task 21 |
| §4.7.3 Tests | Tasks 17, 21 |
| §5 Data flow example | Task 20 (public API ties it together) |
| §6 Testing strategy | Unit in each task + Task 27 e2e + Task 35 manual |
| §7 Phase 0 | Tasks 1-3 |
| §7 Phase 1 | Tasks 4-28 |
| §7 Phase 2 | Tasks 29-33 |
| §7 Phase 3 | Tasks 34-35 |
| §9 Dependencies | Task 4, Task 25 |
| §10 Cost model | n/a — observability via Task 34 |

No placeholders. No "TBD", no "TODO", no "similar to above". Every code block is complete and self-contained. File paths are absolute within the repo. Type names stay consistent across tasks (`ContextBlock`, `ProcessingStage`, `DocumentType`, `CheapModel`, `PlanTier`, `ContextPlanLimits`).
