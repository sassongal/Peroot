# Context Engine — World-Class File/URL/Image Context for Prompt Generation

**Date:** 2026-04-09
**Status:** Approved design, ready for implementation planning
**Scope:** `src/lib/context/`, `src/lib/engines/base-engine.ts`, `src/components/features/prompt-improver/`, `next.config.ts`, 3 API routes under `src/app/api/context/`
**Rough size:** Medium-large refactor — ~15 new files, ~8 edits, all 5 engines benefit (file touches one shared `BaseEngine` injection point).

---

## 1. Problem Statement

The current file/URL/image context system is **broken in production and weak in quality**. Users cannot get context from uploaded files to influence the AI-generated prompts.

### Verified failures (from Vercel production logs, last 7 days)

| Route | Status | Root cause |
|---|---|---|
| `/api/context/describe-image` | `503` | **Env var mismatch**: route reads `GEMINI_API_KEY \|\| GOOGLE_API_KEY`, but project uses `GOOGLE_GENERATIVE_AI_API_KEY` everywhere else. `apiKey` is always `undefined`. One-file bug, one-file fix. Reference: `src/app/api/context/describe-image/route.ts:62`. |
| `/api/context/extract-file` | `500` | **Native binding fails to load**: `pdf-parse@2.4.5` wraps `pdfjs-dist` which requires `@napi-rs/canvas`. Turbopack bundles it into the Function instead of treating it as Node external. Log: `Warning: Cannot load "@napi..."`. Root cause: missing `serverExternalPackages` in `next.config.ts`. |
| `/api/context/extract-url` | `200` but weak | **Zero crashes in 14 days, but content is low-quality**: cheerio + manual `REMOVE_SELECTORS` removes `<header>`/`<nav>`/`<footer>` even on sites where the content lives there; SPAs (React/Vue-rendered) return empty `<div id="root"/>`; JSON-LD and OpenGraph structured data never read. |

### Quality gaps beyond the crashes

Even when extraction works, the downstream pipeline has problems:

1. **Naive text concatenation.** Extracted text is appended to the system prompt as a raw block (`base-engine.ts:666-677`). No structure, no ranking, no enrichment.
2. **No user transparency.** Uploader sees only a toast `"הקובץ נוסף — מחלץ תוכן..."`. No preview, no way to see what the system understood, no way to catch extraction errors before sending.
3. **Generic image description.** The Gemini vision prompt is a catch-all (`describe-image/route.ts:79-94`) — asks for colors, text, data, layout, objects, style, brand, technical all at once. Not purpose-aware.
4. **Duplicated extraction logic across 5 engines.** The 5 engines (Standard, Image, Video, Research, Agent) inherit `BaseEngine.generate()` which has ~100 lines of context-handling logic mixed into it — hard to test, hard to extend, hard to evolve.
5. **Single summarization strategy.** `context-cache.ts` runs a 300-word summary for every attachment over 2000 chars. No document-type awareness, no structured output, no per-type prompts.
6. **No plan-aware budget.** Current limits (5k/attachment, 15k total, 3 of each type) apply equally to Free and Pro users. Wasted differentiation opportunity and uncontrolled cost exposure for Free.
7. **Abuse vector.** The three `/api/context/*` routes can be called without consuming credits. A Free user (or bot) could call `describe-image` hundreds of times per day and run up Gemini bill, only rate-limited by the generic rate limiter.

---

## 2. Goals & Non-Goals

### Goals

1. **Restore all three ingest paths to 100% working state** in production.
2. **Build a single unified Context Engine pipeline** that is shared by all 5 prompt engines (StandardEngine, ImageEngine, VideoEngine, ResearchEngine, AgentEngine). One place to change, one place to test, one place to extend.
3. **Give users full transparency** over what the system extracted from their attachments via a rich expandable card with structured fields and per-field copy buttons.
4. **Differentiate Free vs Pro** via a clear "taste of world-class" on Free that creates psychological pull to upgrade, backed by real cost controls.
5. **Cut per-attachment cost ~70%** compared to a naive 5k/15k Free design by shrinking Free budgets, strengthening caching, and using the cheapest model (gemini-2.5-flash-lite) for the enrichment pass.
6. **Upgrade URL extraction** to Readability.js + Jina Reader fallback so SPAs work and main-content detection is accurate.
7. **Maintain backward compatibility** with the existing `ContextAttachment` / `ContextPayload` types on the client side where practical — the client hook should need minimal changes.

### Non-goals (explicitly deferred)

- **LLMLingua prompt compression.** Deferred to a future phase; current token budgets are small enough that compression is not yet needed.
- **Hierarchical / RAPTOR-style summarization** for very long documents (>50k tokens). Deferred.
- **Intent-aware extraction** (where the user's prompt text informs which sections of a document to extract). Deferred.
- **Edit-in-place of the extracted description.** Read-only for now; "Copy" button covers power-user needs.
- **Embedding-based relevance ranking** across multiple attachments. Deferred.
- **OCR for image-heavy PDFs.** Current `pdfjs-dist` extraction covers text PDFs only. Image PDFs will extract no text (expected behavior), with a warning to the user.
- **Video/audio file extraction.** Out of scope.
- **Context-aware Genius Questions.** Considered for this phase; deferred to a future iteration because it requires calibration on real user behavior data before it can be done well.
- **Variable extraction from CSV/XLSX** (`{{columnName}}` substitution into the generated prompt). Deferred — same reason as above, needs real usage data to know which column-detection heuristics are reliable.
- **Reasoning transparency UI** (showing the user the system's chain of thought for why it picked a particular role/framework). Deferred.

**Included in this phase (deep engine integration, section 4.7):**

- **Dynamic role injection** based on detected document type.
- **Context-weight model routing** for large, high-stakes contexts on Pro plan only (tightly gated to protect margins).

---

## 3. Approach Selection

Three approaches were considered with the user:

**A — Minimal Recovery (1-2 days).** Fix bugs only. Keep naive concatenation. Rejected: leaves the "world-class" goal unaddressed.

**B — Strong Middle Ground (3-5 days). ← SELECTED.** Fix bugs + unified Context Engine pipeline + Rich attachment card + plan-aware budget + cache by content hash + Readability/Jina for URLs. Does not include intent-aware extraction, LLMLingua, hierarchical summarization, or edit-in-place.

**C — Full World-Class (1.5-2 weeks).** B plus intent-aware extraction, LLMLingua, RAPTOR, JSON-LD structured data extraction, edit-in-place. Rejected: those features only matter after there is evidence of high-volume long-document uploads; premature for current product state.

**Code organization: Option C (Hybrid).** New module `src/lib/context/engine/` for the pipeline; `base-engine.ts` imports and delegates; 3 API routes become thin wrappers around the engine. This matches the existing convention of `src/lib/context/` (extractors) vs `src/lib/engines/` (generation engines).

---

## 4. Architecture

### 4.1 Context Engine Pipeline

Every attachment — file, URL, or image — flows through the same 7-step pipeline:

```
INGEST → EXTRACT → CLASSIFY → ENRICH → COMPRESS → STRUCTURE → INJECT
  ↓        ↓          ↓          ↓         ↓           ↓         ↓
raw    markdown   sha256+    Zod JSON   budget    ContextBlock  prompt
bytes             doc type   summary    enforce                 slot
```

1. **INGEST** — the API route receives raw bytes (`File`) or URL string and passes them to the engine.
2. **EXTRACT** — type-specific extraction:
   - **Files:** PDF via `pdfjs-dist/legacy` (pure JS, no native bindings), DOCX via `mammoth`, XLSX/CSV via existing logic. All output **Markdown** (uniform representation).
   - **URLs:** `@mozilla/readability` → if result has < 100 chars meaningful content, fallback to `https://r.jina.ai/<url>` (free, handles SPAs).
   - **Images:** pass through to ENRICH (no text extraction; Gemini vision does it all).
3. **CLASSIFY** — compute `sha256(rawContent)` as cache key; auto-detect document type via heuristics (header patterns, keyword density). Cache hit → skip ENRICH and return stored `ContextBlock`.
4. **ENRICH** — single AI pass calling `gemini-2.5-flash-lite` via `generateObject` (AI SDK) with a Zod schema that forces structured output: `{title, documentType, summary, keyFacts[], entities[]}`. System prompt is parameterized by detected type (contract → extract parties/amounts; academic → extract thesis/findings; marketing → extract value prop/CTA; etc.).
5. **COMPRESS** — trim `rawText` to `PLAN_CONTEXT_LIMITS[tier].perAttachment`. Marks `truncated: true` in metadata for Free-user banner.
6. **STRUCTURE** — assemble the final `ContextBlock` with both `display` (for user) and `injected` (for prompt) representations.
7. **INJECT** — `BaseEngine` calls `contextEngine.renderInjection(blocks)` which returns the structured prompt slot (section 4.4 below).

### 4.2 Files

**New module: `src/lib/context/engine/`**

```
src/lib/context/engine/
├── index.ts              # Public API: processAttachment(), processBatch(), renderInjection()
├── types.ts              # ContextBlock, EnrichedContext, ProcessingStage, PipelineError
├── extract/
│   ├── index.ts          # dispatcher
│   ├── file-pdf.ts       # pdfjs-dist/legacy
│   ├── file-office.ts    # mammoth (docx), xlsx, papaparse (csv)
│   ├── file-text.ts      # txt passthrough
│   ├── url.ts            # readability + jina fallback
│   └── image.ts          # passthrough (image stays as buffer for enrich)
├── classify.ts           # sha256 + heuristic document type detection
├── enrich.ts             # generateObject() with Zod schema + per-type prompts
├── compress.ts           # trimToTokenLimit + truncation metadata
├── inject.ts             # ContextBlock[] → final prompt slot string
├── cache.ts              # Redis by sha256(content+planTier), 30-day TTL
└── prompts/
    ├── enrich-contract.ts
    ├── enrich-academic.ts
    ├── enrich-marketing.ts
    ├── enrich-data.ts
    ├── enrich-code.ts
    ├── enrich-generic.ts
    └── enrich-image.ts
```

**Edits:**

- `next.config.ts` — add `serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'mammoth', 'xlsx', '@napi-rs/canvas']` (includes `pdf-parse` for Phase 0 compatibility; can be removed from the list in Phase 1 once we swap to direct `pdfjs-dist` usage)
- `src/app/api/context/extract-file/route.ts` — thin wrapper: auth → rate limit → `contextEngine.processAttachment({type:'file', ...})`
- `src/app/api/context/extract-url/route.ts` — same thin wrapper
- `src/app/api/context/describe-image/route.ts` — same thin wrapper + env var fix
- `src/lib/engines/base-engine.ts` — replace lines 582-679 (the ~100 lines of context injection) with 5 lines: call `contextEngine.renderInjection(ctx.contextBlocks)` and append
- `src/lib/engines/context-cache.ts` — **delete** (superseded by `engine/cache.ts`)
- `src/lib/context/types.ts` — extend `ContextAttachment` with `display?: ContextBlockDisplay` field
- `src/hooks/useContextAttachments.ts` — add `stage: ProcessingStage` field, expose `display` on ready attachments
- `src/lib/plans.ts` — add `PLAN_CONTEXT_LIMITS` constant
- `package.json` — add `@mozilla/readability` and `jsdom` (readability requires DOM-like env); verify `pdfjs-dist` legacy build available; remove `pdf-parse`

### 4.3 `ContextBlock` shape

```ts
type ProcessingStage =
  | 'uploading'    // client-side upload in progress
  | 'extracting'   // server extracting raw text/markdown
  | 'enriching'    // Gemini enrich pass running
  | 'ready'        // done, ready to inject
  | 'warning'      // partial success (extract ok, enrich failed, raw text available)
  | 'error';       // hard failure, no content

type ContextBlockDisplay = {
  title: string;              // canonical title (filename, page title, or "Image: foo.png")
  documentType: string;       // Hebrew: "חוזה משפטי" / "מאמר אקדמי" / "דף שיווקי" / "טבלת נתונים" / ...
  summary: string;            // 100-150 words Hebrew
  keyFacts: string[];         // 3-7 bullets
  entities: Array<{           // people, dates, amounts, organizations
    name: string;
    type: 'person' | 'org' | 'date' | 'amount' | 'location' | 'other';
  }>;
  rawText: string;            // the full extracted text (for "show raw" accordion)
  metadata: {
    pages?: number;           // PDFs
    author?: string;          // URL articles, DOCX
    publishedTime?: string;   // URL articles
    rows?: number;            // spreadsheets
    columns?: number;
    colors?: string[];        // image hex codes
    truncated?: boolean;      // Free-user truncation flag
    originalTokenCount?: number; // before trim
  };
};

type ContextBlockInjected = {
  header: string;             // "━━━ 📄 חוזה: contract_2026.pdf ━━━"
  body: string;               // structured block: facts then summary
  tokenCount: number;
};

type ContextBlock = {
  id: string;                 // attachment id (client-generated uuid)
  type: 'file' | 'url' | 'image';
  sha256: string;             // cache key (hash of raw extracted content)
  display: ContextBlockDisplay;
  injected: ContextBlockInjected;
  stage: ProcessingStage;
  error?: { stage: string; message: string; retryable: boolean };
};
```

### 4.4 Injection format

The injected prompt slot has a fixed structure that is deterministic for all 5 engines:

```
━━━ קונטקסט שסופק על ידי המשתמש ━━━

[מקור #1 — 📄 חוזה: contract_2026.pdf (12 עמודים)]
סוג: חוזה משפטי
נקודות מפתח:
  • צדדים: חברת אלפא בע"מ ⟷ יעקב כהן
  • שווי: 45,000 ₪
  • תקופה: 12 חודשים החל מ-15.5.2026
  • סעיף סודיות: 3 שנים
ישויות מרכזיות: חברת אלפא בע"מ (ארגון), יעקב כהן (אדם), 15.5.2026 (תאריך)
תקציר: [100-150 מילים]

[מקור #2 — 🌐 מאמר: techblog.com/article-x]
מחבר: Jane Doe · פורסם: 2026-03-15
סוג: מאמר טכני
...

━━━ הנחיות שימוש בקונטקסט ━━━
1. הטמע ציטוטים, מספרים, תאריכים ושמות ספציפיים מהמקורות ישירות בפרומפט הסופי. אל תכתוב "ראה קובץ מצורף".
2. התאם את הטון והתפקיד המומחה לסוג המסמך (חוזה → עורך דין; אקדמי → חוקר).
3. אם יש סתירה בין מקורות, העדף את המקור המאוחר יותר.
4. הקונטקסט הוא רקע, לא תחליף להוראות המשתמש — ההוראות בראש הבקשה מנצחות.
━━━
```

This structure is **identical across all 5 engines**. It lives in `inject.ts` and is called once from `BaseEngine.generate()`.

### 4.5 Plan limits

New constant `src/lib/plans.ts`:

```ts
export const PLAN_CONTEXT_LIMITS = {
  free: {
    perAttachment: 3_000,        // ~6 PDF pages
    total: 8_000,
    maxFiles: 1,
    maxUrls: 1,
    maxImages: 1,
    extractionsPerDay: 5,        // new rate limit on /api/context/* routes
    jinaFallback: false,         // Free gets Readability only
    deepImageOcr: false,         // Free gets short image description (3-5 sentences)
  },
  pro: {
    perAttachment: 12_000,       // ~25 PDF pages
    total: 40_000,
    maxFiles: 5,
    maxUrls: 5,
    maxImages: 5,
    extractionsPerDay: 100,
    jinaFallback: true,          // Pro gets SPA fallback
    deepImageOcr: true,          // Pro gets full color extraction, OCR, entities
  },
} as const;
```

**Extraction rate limit** (new, distinct from the existing prompt rate limit): enforced in each `/api/context/*` route via Upstash Redis sliding window keyed by `extract:<userId>`. This closes the abuse vector.

**Free-user truncation banner.** When `metadata.truncated === true`, the attachment card displays an upgrade prompt **inline in the card** (not a modal, not blocking):

> 📄 מסמך זה חורג מהתקציב החינמי. הצגנו את 6 העמודים הראשונים בלבד.
> ✨ משתמשי Pro מעבדים מסמכים מלאים עד 25 עמודים. [למד עוד →](/pricing#context)

Design: soft blue/purple gradient border on the card, info icon, no guilt-trip language.

### 4.6 Rich Attachment Card UX

**Component tree:**

```
PromptInput.tsx
  └─ AttachmentList.tsx              (existing, restyled)
       └─ AttachmentCard.tsx         (NEW — replaces current inline card)
            ├─ StageProgressBar      (NEW — 4-stage gradient)
            ├─ AttachmentSummary     (NEW — icon, title, token count, stage label)
            └─ [click] → AttachmentDetailsDrawer.tsx  (NEW)
                 ├─ TitleAndType
                 ├─ SummarySection (with CopyButton)
                 ├─ KeyFactsList (with CopyButton per fact + CopyAll)
                 ├─ EntitiesList
                 ├─ MetadataGrid
                 ├─ RawTextAccordion (with CopyButton)
                 └─ ActionsFooter ([רענן תיאור] [הסר])
```

**Stage progress bar — the "cool/clear" visual:**
- 4 stages shown as 4 pill-shaped segments connected by a gradient line
- Gradient: `from-blue-500 via-purple-500 to-green-500` fills progressively
- Current stage icon: framer-motion `spinner` with gentle rotation
- Completed stage: green checkmark with a brief scale+bounce transition
- Failed stage: red X with a subtle shake animation
- Pulse glow (CSS `box-shadow` animation) around the card while any non-terminal stage is active
- Hebrew micro-copy per stage, cycled:
  - `uploading`: "מעלה..."
  - `extracting`: "קורא את הקובץ..." / "מושך את הדף..." / "בוחן את התמונה..."
  - `enriching`: "מבין מה יש בפנים..." / "מארגן את העובדות..."
  - `ready`: "מוכן ✓"
  - `warning`: "קלטנו, אבל הניתוח חלקי"
  - `error`: "לא הצלחנו — נסה שוב?"

**Copy buttons.** Every field in the drawer has a copy button. There is also a "העתק את הכל" button at the top of the drawer that copies the full `display` representation formatted as markdown. Specifically:
- `summary` — copy button next to the heading
- `keyFacts[]` — copy button per bullet and a "העתק את כל הנקודות" button
- `rawText` — copy button inside the accordion header
- "העתק את הקונטקסט המלא" — top-right corner of drawer, copies the structured block as it will appear in the prompt

**Error / retry UX.**
- `extract` failed (hard error): red card. Title: "לא הצלחנו לקרוא את הקובץ". Body: specific reason in Hebrew (e.g., "הקובץ מוגן בסיסמה" / "הדף לא זמין"). Buttons: `[נסה שוב]` `[הסר]`.
- `enrich` failed (partial success): orange/warning card. Title: "קלטנו את הקובץ, אבל ניתוח חכם נכשל". Body: "נשתמש בטקסט הגולמי. איכות הפרומפט עלולה להיות מעט פחות מדויקת". Buttons: `[נסה לנתח שוב]` `[השתמש כמו שהוא]`. The user can still send the prompt; the `injected.body` falls back to raw text with a minimal header.

**"רענן תיאור" button.** In the drawer footer. Re-runs the `enrich` pass only (does not re-extract). Cost: ~$0.0005 per click. Same Redis cache key (so if you hit it twice identically, cached). Useful if the enrichment was wonky the first time.

### 4.7 Deep Engine Integration

The injection format in section 4.4 ensures context is *present* in the prompt, but two additional mechanisms make the context actually influence how the engine **thinks** about the user's request. Both are tightly cost-controlled.

#### 4.7.1 Dynamic Role Injection (`src/lib/context/engine/role-mapper.ts`)

Each `documentType` detected in `classify.ts` maps to a Hebrew expert persona that is injected into the engine's own system prompt (the one that drives the prompt-generation LLM, not the generated prompt itself). This changes the expert "voice" the engine adopts when crafting the user-facing prompt.

**Mapping:**

```ts
// src/lib/context/engine/role-mapper.ts
export type ExpertRole = {
  role: string;        // Hebrew role label
  tone: string;        // tone descriptors
  focusAreas: string[];// what this expert prioritizes
};

export const DOCUMENT_TYPE_TO_ROLE: Record<string, ExpertRole> = {
  'חוזה משפטי':   { role: 'יועץ משפטי בכיר',        tone: 'פורמלי, זהיר, מדויק',       focusAreas: ['סעיפי סיכון', 'חובות וזכויות', 'תנאי סיום'] },
  'מאמר אקדמי':  { role: 'חוקר בתחום התוכן',         tone: 'ניתוחי, מתודי, מבוסס ראיות', focusAreas: ['תזה מרכזית', 'ממצאים', 'מגבלות מתודולוגיות'] },
  'דף שיווקי':    { role: 'מומחה פרפורמנס מרקטינג',  tone: 'משכנע, ממוקד תועלת',        focusAreas: ['Value proposition', 'Call to action', 'Objection handling'] },
  'טבלת נתונים':  { role: 'אנליסט נתונים',           tone: 'כמותי, מדויק, מובנה',        focusAreas: ['מגמות', 'חריגים', 'מדדי מפתח'] },
  'קוד מקור':     { role: 'מהנדס תוכנה בכיר',        tone: 'טכני, מדויק',               focusAreas: ['ארכיטקטורה', 'באגים פוטנציאליים', 'ביצועים'] },
  'אימייל/התכתבות':{ role: 'מומחה תקשורת עסקית',     tone: 'ממוקד, מכבד',               focusAreas: ['הקשר', 'אינטרס הדובר', 'צעד הבא'] },
  'תמונה':        { role: 'מומחה ויזואל ו-UX',       tone: 'תיאורי, מדויק',             focusAreas: ['הרכב', 'צבעים', 'טקסט חזותי'] },
  'דף אינטרנט':   { role: 'content strategist',    tone: 'מובנה, שימושי',              focusAreas: ['מסר מרכזי', 'קהל יעד', 'דגשים'] },
  'generic':      { role: 'מומחה תוכן רב-תחומי',     tone: 'ניטרלי, מאוזן',              focusAreas: ['העיקר', 'פרטים רלוונטיים', 'חסרים אפשריים'] },
};

export function resolveRole(documentTypes: string[]): ExpertRole {
  // If multiple attachments, pick the highest-priority role.
  // Priority order: legal > code > academic > data > marketing > email > web > image > generic
  const PRIORITY = ['חוזה משפטי', 'קוד מקור', 'מאמר אקדמי', 'טבלת נתונים', 'דף שיווקי', 'אימייל/התכתבות', 'דף אינטרנט', 'תמונה'];
  for (const type of PRIORITY) {
    if (documentTypes.includes(type)) return DOCUMENT_TYPE_TO_ROLE[type];
  }
  return DOCUMENT_TYPE_TO_ROLE['generic'];
}
```

**Integration point.** `inject.ts` calls `resolveRole(blocks.map(b => b.display.documentType))` and returns a small **pre-injection block** that is prepended to the engine's main system prompt (before the existing CO-STAR/RISEN structure):

```
━━━ התאמת מומחה ע"ב קונטקסט ━━━
המשתמש סיפק קונטקסט מסוג "חוזה משפטי". בעת יצירת הפרומפט:
- אמץ נקודת מבט של: יועץ משפטי בכיר
- טון: פורמלי, זהיר, מדויק
- התמקד ב: סעיפי סיכון · חובות וזכויות · תנאי סיום
━━━
```

This is **separate from section 4.4** (the context injection itself). The order in the final engine prompt is:

1. Base engine system prompt (existing)
2. **Role adaptation block** (new — section 4.7.1)
3. Context injection block (section 4.4)
4. CO-STAR/RISEN framework (existing)
5. User request

**Cost:** zero. This is a static map; no extra LLM calls.

**Why this matters:** today, the engine's system prompt treats all user requests identically. With role injection, the engine generating the prompt **actually thinks differently** about a contract vs a marketing page. The CO-STAR `Role` and `Audience` fields in the output prompt come out materially different — a contract produces "אתה עורך דין עם 15 שנות ניסיון..." where today it would produce "אתה מומחה כללי...".

#### 4.7.2 Lightweight Model Routing — Flash Lite / Flash (`src/lib/ai/context-router.ts`)

**Strict constraint:** routing stays entirely within the existing cheap provider stack. **No Gemini 2.5 Pro, no paid tier upgrades, ever.** The existing `AIGateway` already handles fallbacks across Flash → Mistral → Llama → DeepSeek via circuit breaker; this router only decides the **primary** model for the generation call, and the gateway continues to handle fallbacks on failure.

**Decision logic:**

```ts
// src/lib/ai/context-router.ts
import type { ContextBlock } from '@/lib/context/engine/types';

const SMALL_CONTEXT_THRESHOLD = 2_000; // tokens across all attachments

export type CheapModel =
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash';

/**
 * Pick the cheapest capable model for a context-bearing generation call.
 * Only returns models from the cheap stack. Paid tier models are never used.
 */
export function selectEngineModel(opts: {
  blocks: ContextBlock[];
}): CheapModel {
  const totalTokens = opts.blocks.reduce((s, b) => s + b.injected.tokenCount, 0);

  // No context OR very small context → Flash Lite (~50% cheaper, nearly identical Hebrew quality)
  if (totalTokens <= SMALL_CONTEXT_THRESHOLD) {
    return 'gemini-2.5-flash-lite';
  }

  // Everything else → Flash (handles 1M context natively, excellent Hebrew)
  return 'gemini-2.5-flash';
}
```

**Integration point.** `BaseEngine.generate()` calls `selectEngineModel({blocks})` right before the generation LLM call and passes the chosen model id to `AIGateway.generateStream()` as the **preferred primary**. The gateway's existing fallback chain (Mistral → Llama → DeepSeek) still runs on failure — this router only swaps the first pick.

**Why this logic (and not more):**

After evaluating DictaLM (Hebrew-native, 7B), Gemma 2 9B (weak on Hebrew), Llama 3.3 (sub-par Hebrew), Aya (non-commercial license), Command R+ (paid), and Qwen 2.5 (weak on Hebrew), **Gemini 2.5 Flash is the strongest cheap Hebrew model available**. Google has the largest Hebrew training corpus of any major provider, and Flash benchmarks on Hebrew tasks (HeQ, MERIDIAN) score ~85% of Gemini Pro at ~6% of the cost.

- **Flash Lite for tiny context:** ~50% cheaper than Flash, near-identical Hebrew quality on short inputs. Saves real money for Free users who often send context-free requests.
- **Flash for everything with meaningful context:** 1M token window, strong Hebrew reasoning, `generateObject` + Zod native via AI SDK, $0.075/1M input. No reason to switch.
- **No upgrade tier:** the existing AI SDK / circuit-breaker stack already provides redundancy. Adding a "premium" branch would only burn margin without meaningful quality gain for the document types we support.

**Free users never get downgraded quality.** Both tiers get the same primary model selection logic; only the budget limits differ.

**Observability.** `context-router.ts` logs each routing decision to Sentry breadcrumbs (`{selectedModel, tokens, blocks: count}`) for monitoring, but there are no cost spikes to watch for since both models are cheap.

**Future consideration (non-goal for this phase).** DictaLM 2.0 (Hebrew-native, Bar-Ilan + AI21, open weights on HuggingFace) becomes interesting if monthly enrichment volume exceeds ~10k calls and Hebrew-specific legal/rabbinical content becomes a core use case. At that scale, self-hosting on a $50-200/month GPU beats Gemini API cost and DictaLM's Hebrew mastery can exceed Flash on niche domains. Today, the engineering overhead (HuggingFace SDK integration, no Zod schema support, slower inference) outweighs the benefit.

#### 4.7.3 Testing

- `role-mapper.test.ts` — assert all document types resolve to a role; assert priority ordering with mixed-type inputs; snapshot the pre-injection block output.
- `context-router.test.ts` — 10 cases covering free/pro × low/high tokens × stakes/non-stakes. Assert correct model and that upgrade only happens when all three conditions are met.

---

## 5. Data Flow (End-to-End Example)

User uploads `contract.pdf` (8 pages, 2.3 MB) while on Free plan.

1. **Client** — `useContextAttachments.addFile(file)` creates attachment with `stage: 'uploading'`, starts the gradient progress bar at 0%.
2. **Client → Server** — POST `/api/context/extract-file` with FormData.
3. **Server: route handler** — auth, check extraction rate limit (5/day for Free), read file bytes.
4. **Server: `contextEngine.processAttachment({type:'file', buffer, filename, mimeType, userId, tier:'free'})`**
   - **extract/file-pdf.ts** — `pdfjs-dist/legacy` extracts text → markdown. Result: 4200 words.
   - **classify.ts** — sha256 = `abc123...`; keyword heuristic detects `contract` type (matches "הסכם", "צדדים", "סעיף", "כפוף לחוק").
   - **cache.ts** — Redis lookup `ctx:abc123:free`. **Miss.**
   - **enrich.ts** — calls `gemini-2.5-flash-lite` with `generateObject` + Zod schema + `enrich-contract.ts` prompt. Returns structured `{title, documentType, summary, keyFacts: [4 bullets], entities: [6 items]}`. Cost: $0.0005.
   - **compress.ts** — raw text = 4200 words ≈ 6300 tokens. Free budget: 3000/attachment. **Truncate** to first 3000 tokens. Set `metadata.truncated = true`, `metadata.originalTokenCount = 6300`.
   - **inject.ts** — builds `ContextBlock` with both `display` (full enriched data) and `injected` (header + structured body = ~3200 tokens).
   - **cache.ts** — write `ctx:abc123:free` → ContextBlock, TTL 30 days.
5. **Server → Client** — HTTP 200 with `{contextBlock: {...}}`.
6. **Client** — updates attachment: `stage: 'ready'`, `display: {...}`, `tokenCount: 3200`. Progress bar fills to 100% with a green check. Card is now clickable.
7. **User clicks card** → `AttachmentDetailsDrawer` opens, shows all fields, including the Free-user truncation banner.
8. **User sends prompt** → `useContextAttachments.getContextPayload()` returns the `ContextBlock[]` → posted to `/api/enhance` with the rest of the request.
9. **Server: `/api/enhance`** → `BaseEngine.generate()` → calls `contextEngine.renderInjection(blocks)` → appends to system prompt → calls Gemini Flash for the actual prompt generation. The model sees the structured block and produces a prompt that quotes specific facts ("משתמש הגיע עם חוזה עם חברת אלפא בע"מ בשווי 45,000 ₪ ל-12 חודשים. צריך לנסח מכתב..." — not "ראה קובץ מצורף").

---

## 6. Testing Strategy

### Unit tests (`src/lib/context/engine/__tests__/`)

- `extract/file-pdf.test.ts` — fixture: `fixtures/sample.pdf`, assert word count, no native binding errors.
- `extract/url.test.ts` — fixture: mocked fetch returning a known HTML; assert readability output. Separate test for the SPA fallback mocking Jina Reader.
- `classify.test.ts` — 6 fixtures, one per document type, assert correct detection.
- `enrich.test.ts` — mock the AI SDK; assert Zod schema compliance on output.
- `compress.test.ts` — assert budget enforcement and `truncated` flag.
- `inject.test.ts` — snapshot test of the final injection string for a 3-block input.
- `cache.test.ts` — Redis mock; assert hit/miss behavior and TTL.

### Integration tests

- `src/app/api/context/__tests__/extract-file.e2e.test.ts` — full POST flow with a real fixture file, assert 200 and correct `ContextBlock`.
- `src/app/api/enhance/__tests__/context-e2e.test.ts` — enhance request with 3 context attachments, assert the model prompt includes the injected block.

### Manual verification checklist (before deploy)

1. Upload a real PDF → card expands → drawer shows summary, facts, entities → raw text accordion works → all copy buttons work.
2. Paste a URL to a normal article (e.g., Wikipedia page) → Readability extracts it correctly.
3. Paste a URL to a SPA (e.g., an Angular site) → as Pro, Jina fallback kicks in; as Free, shows warning "הדף מבוסס JavaScript ולא נטען בגרסה החינמית — שדרג ל-Pro".
4. Upload an image → Gemini vision produces description → card drawer shows hex colors (Pro) or summary (Free).
5. Upload a 50-page PDF as Free → see truncation banner in drawer.
6. Upload corrupted PDF → see red error card with retry button → click retry → behavior is idempotent.
7. Upload same file twice → second upload is near-instant (cache hit).
8. Attempt 6 extractions in a day as Free → 6th blocked with `429` + Hebrew message.

---

## 7. Rollout

### Prerequisite fixes (Phase 0 — deploy immediately before anything else)

These are blockers. They must land first, on main, as a single commit:

1. `describe-image/route.ts`: env var fix (one line).
2. `next.config.ts`: `serverExternalPackages`.
3. Verify both routes return 200 in preview deployment with real file uploads.

This phase **alone** restores basic functionality. Everything below is the upgrade.

### Phase 1 — Context Engine module (backend only, no UI changes)

- Create `src/lib/context/engine/` with all extractors and the pipeline.
- Update the 3 API routes to use `contextEngine.processAttachment`.
- Replace `base-engine.ts` lines 582-679 with the new injection call.
- Delete `src/lib/engines/context-cache.ts`.
- **Deep engine integration (section 4.7):**
  - Add `src/lib/context/engine/role-mapper.ts` and wire into `inject.ts`.
  - Add `src/lib/ai/context-router.ts` and wire into `BaseEngine.generate()`.
  - Sentry breadcrumbs for routing decisions.
- All unit tests green.
- **Deploy and verify** — existing card UI still works because the server response shape is extended (not breaking).

### Phase 2 — Rich attachment card UI

- New `AttachmentCard` + `AttachmentDetailsDrawer` components.
- Hook update (`useContextAttachments`) to pipe through `display` and `stage`.
- Stage progress bar with framer-motion.
- Copy buttons wired up.
- Free-user truncation banner.

### Phase 3 — Plan-aware rate limiting and Free UX polish

- `PLAN_CONTEXT_LIMITS` wired through every budget/count check.
- Extraction rate limit (5/day Free, 100/day Pro).
- Free vs Pro differentiation landed (Jina fallback gated, deep image OCR gated).

### Rollback plan

Every phase is independently revertible. If Phase 2 ships with a bad UI bug, revert only the component changes; Phase 1 backend stays. The `ContextBlock` type extension is additive — old client code that reads only `extractedText` still works.

---

## 8. Open Questions

None at this stage. All seven design questions were resolved with the user on 2026-04-09:

1. Root cause scope: all three paths (file + URL + image) → confirmed via Vercel logs.
2. Feature depth: B — Strong Middle Ground.
3. Code organization: C — Hybrid module.
4. Token budgets: trial-oriented, Option A (1+1+1, 3k/8k Free, 5+5+5, 12k/40k Pro).
5. Card UX: A — read-only + copy buttons per field.
6. Processing stages: B — 4 stages with cool framer-motion transitions.
7. Deep engine integration: Z — role injection + cheap-stack-only routing (Flash Lite for ≤2k tokens, Flash otherwise). No Pro model. Section 4.7.

---

## 9. Third-party dependencies to add

| Package | License | Purpose | Replaces |
|---|---|---|---|
| `@mozilla/readability` | Apache 2.0 | Main content extraction from HTML (Firefox Reader Mode) | Manual `REMOVE_SELECTORS` + `CONTENT_SELECTORS` in `extract-url.ts` |
| `jsdom` | MIT | DOM implementation required by `@mozilla/readability` | (new) |
| `pdfjs-dist` (legacy build) | Apache 2.0 | Pure-JS PDF text extraction — no native bindings | `pdf-parse@2.4.5` (to be removed) |

**Dependencies to remove:** `pdf-parse` (replaced by direct `pdfjs-dist` usage).

**External free services used:**
- **Jina Reader** (`https://r.jina.ai/<url>`) — 500k requests/month free tier. Used only on Pro plan for SPA fallback. No API key required. If Jina is down or rate-limited, fall back gracefully to Readability result (or warning if empty).

---

## 10. Cost Model

Assumptions (cheap-stack only — no Pro model):
- **Gemini 2.5 Flash Lite**: $0.075/1M input, $0.30/1M output — used for enrichment (all tiers) and generation when total context ≤2k tokens.
- **Gemini 2.5 Flash**: $0.30/1M input, $2.50/1M output — used for generation when total context >2k tokens.
- 30-day sha256 cache at ~60% hit rate in steady state.

**Enrich pass (all tiers, Flash Lite):**
- 3000 input + 500 output = $0.000225 + $0.00015 = **$0.000375/attachment**

**Generation pass delta (extra context tokens on the main engine call):**
- Free (3k context, ≤2k total → Flash Lite): 3000 × $0.075/1M = **$0.000225/request**
- Pro small (≤2k total → Flash Lite): 2000 × $0.075/1M = **$0.00015/request**
- Pro large (12k avg context → Flash): 12000 × $0.30/1M = **$0.0036/request**

**Heavy Free user** (60 enhances/month, 1 attachment each, 40% cache miss):
- Enrich: 60 × 0.4 × $0.000375 = **$0.009/month**
- Generation extra: 60 × $0.000225 = **$0.0135/month**
- **Total: ~$0.023/month/user** — negligible at scale.

**Heavy Pro user** (150 enhances/month, 3 attachments avg, 40% cache miss). Assume 20% of requests are small-context (≤2k → Flash Lite) and 80% are large (Flash):
- Enrich: 150 × 3 × 0.4 × $0.000375 = **$0.0675/month**
- Generation extra (small, Flash Lite): 150 × 0.2 × $0.00015 = **$0.0045/month**
- Generation extra (large, Flash): 150 × 0.8 × $0.0036 = **$0.432/month**
- **Total: ~$0.50/month/user**

Pro plan is ₪9.99 (~$2.70) → context feature costs ~19% of Pro revenue per heavy user. This is well within margin and leaves headroom for generation output costs (counted separately against the existing credit budget). If steady-state data shows heavy Pro users running hotter than this model, we tighten `SMALL_CONTEXT_THRESHOLD` upward so more requests route to Flash Lite.

**Abuse ceiling (Free user who maxes extraction rate limit):**
- 5 extractions/day × 30 days = 150 extractions/month cap
- 150 × $0.000375 = **$0.056/month max** per abusive Free user. Bounded.
