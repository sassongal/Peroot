> STATUS: ✅ DONE — verified against codebase 2026-05-02

# Decouple GENIUS_QUESTIONS from Main Enhance Stream

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move GENIUS_QUESTIONS generation out of the main enhance stream into a dedicated background endpoint so the enhanced prompt appears ~50% faster.

**Architecture:** Strip `[GENIUS_QUESTIONS]` instructions from `base-engine.ts` so the main LLM call only outputs the enhanced prompt + title. A new `POST /api/enhance/questions` endpoint takes the completed enhanced prompt and generates questions separately using `AIGateway.generateFull` with `gemini-2.5-flash-lite`. The frontend fires this endpoint after the main stream ends and shows a skeleton while waiting.

**Tech Stack:** Next.js App Router, Zod, Upstash Ratelimit, `AIGateway.generateFull`, React reducer, Tailwind `animate-pulse`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/engines/base-engine.ts` | Modify | Remove `[GENIUS_QUESTIONS]` block from `generate()` and `generateRefinement()` |
| `src/lib/ratelimit.ts` | Modify | Add `questions` rate limiter |
| `src/app/api/enhance/questions/route.ts` | **Create** | Dedicated questions endpoint (no credits, auth required) |
| `src/hooks/usePromptWorkflow.ts` | Modify | Add `questionsLoading` state + actions |
| `src/hooks/usePromptEnhance.ts` | Modify | Fire questions endpoint after stream; add AbortController |
| `src/components/features/home/HomeResultSection.tsx` | Modify | Show skeleton when `questionsLoading` |

---

## Task 1: Strip GENIUS_QUESTIONS from `base-engine.ts`

**Files:**
- Modify: `src/lib/engines/base-engine.ts`

- [ ] **Step 1: Find the GENIUS_QUESTIONS block in `generate()`**

Open `src/lib/engines/base-engine.ts`. In the `generate()` method's `systemPrompt` return value (around line 380), find the section that starts with:

```
\n\nAfter the enhanced prompt, on a new line add a short descriptive Hebrew title for this prompt using this exact format:\n[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]\n\nThen add [GENIUS_QUESTIONS] followed by contextual clarifying questions in JSON array format.\n\nIMPORTANT — CONTEXTUAL QUESTION GENERATION RULES:
```

Everything from `\n\nThen add [GENIUS_QUESTIONS]` onward (through all the field definitions, format spec, context-aware rules, and the closing `If the prompt is already comprehensive, return [GENIUS_QUESTIONS][]`) must be removed.

**Keep** the `[PROMPT_TITLE]` instruction — it's still needed for history saves:
```
After the enhanced prompt, on a new line add a short descriptive Hebrew title for this prompt using this exact format:\n[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]
```

The system prompt string in `generate()` should end right after the `[/PROMPT_TITLE]` line. Remove ~600 characters of `[GENIUS_QUESTIONS]` instructions.

- [ ] **Step 2: Strip GENIUS_QUESTIONS from `generateRefinement()`**

In the same file, `generateRefinement()` method (around line 470), find the section in the systemPrompt that starts:

```
After the improved prompt, add the delimiter [GENIUS_QUESTIONS] followed by NEW contextual clarifying questions.
```

Remove everything from that line to the end of the system prompt string (the entire `CONTEXTUAL QUESTION RULES FOR REFINEMENT` block, field definitions, and Enhanced Format line).

- [ ] **Step 3: Run typecheck**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run existing tests**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npm test -- --run src/lib/prompt-stream/split-genius-completion.test.ts
```

Expected: all passing (the parser is unchanged; it just won't find `[GENIUS_QUESTIONS]` in new streams, which is the backward-compat path already tested).

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/base-engine.ts
git commit -m "perf(enhance): remove GENIUS_QUESTIONS from main engine system prompt"
```

---

## Task 2: Add `questions` rate limiter to `ratelimit.ts`

**Files:**
- Modify: `src/lib/ratelimit.ts`

- [ ] **Step 1: Add the limiter**

In `src/lib/ratelimit.ts`, add to the `rateLimiters` object (after the existing entries):

```ts
  questions: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "@peroot/ratelimit:questions",
  }),
```

- [ ] **Step 2: Run typecheck**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ratelimit.ts
git commit -m "feat(ratelimit): add questions limiter (60/min)"
```

---

## Task 3: Create `POST /api/enhance/questions` endpoint

**Files:**
- Create: `src/app/api/enhance/questions/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIGateway } from "@/lib/ai/gateway";
import { rateLimiters } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { parseCapabilityMode } from "@/lib/capability-mode";

export const maxDuration = 30;

const Schema = z.object({
  prompt: z.string().min(1).max(10000),
  enhancedPrompt: z.string().min(1).max(50000),
  category: z.string().default("כללי"),
  tone: z.string().default("Professional"),
  capability_mode: z.string().optional(),
  iteration: z.number().int().min(0).optional(),
  previousQuestionIds: z.array(z.number()).max(20).optional(),
  context: z
    .array(
      z.object({
        type: z.enum(["file", "url", "image"]),
        display: z
          .object({
            title: z.string().max(200),
            documentType: z.string().max(50),
            summary: z.string().max(2_000),
            keyFacts: z.array(z.string().max(500)).max(10),
            entities: z.array(z.object({ name: z.string().max(100), type: z.string().max(50) })).max(20),
            rawText: z.string().max(50_000).optional(),
            metadata: z.record(z.string(), z.unknown()),
          })
          .optional(),
      }),
    )
    .max(5)
    .optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { prompt, enhancedPrompt, category, tone, capability_mode, iteration, previousQuestionIds, context } =
    parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Light rate limit — questions are cheap, but guard against abuse
  const rl = await rateLimiters.questions.limit(user.id);
  if (!rl.success) {
    return NextResponse.json({ questions: [] }, { status: 200 }); // silent fallback
  }

  const mode = parseCapabilityMode(capability_mode);
  const isRefinement = (iteration ?? 0) > 0;

  // Build context summary for question generation
  const contextSummary = context
    ?.map((c) => {
      const title = c.display?.title || c.type;
      const summary = c.display?.summary || "";
      return `[${title}] ${summary.slice(0, 500)}`;
    })
    .join("\n\n");

  const hasContext = !!contextSummary;

  const previousIdsNote =
    previousQuestionIds && previousQuestionIds.length > 0
      ? `\n\nDo NOT repeat questions with these IDs that the user already answered: ${previousQuestionIds.join(", ")}.`
      : "";

  const systemPrompt = `אתה מומחה לשאלות הבהרה עבור פרומפטים. קיבלת פרומפט מקורי ופרומפט משודרג. משימתך: לייצר שאלות הבהרה ממוקדות שיעזרו למשתמש לשפר את הפרומפט עוד יותר.

CONTEXTUAL QUESTION GENERATION RULES:
1. ANALYZE the prompt domain first: marketing? code? content? research? education? business?
2. Generate DOMAIN-SPECIFIC questions, not generic ones. For marketing: ask about target audience, USP, funnel stage. For code: ask about language, framework, error handling. For content: ask about tone, audience expertise level, publishing platform.
3. DYNAMIC COUNT (2-5 questions): Simple prompts (clear single task) → 2 questions. Medium complexity (multi-step or ambiguous) → 3 questions. Complex prompts (vague, multi-domain, strategic) → 4-5 questions.
4. Each question must be actionable — answering it should DIRECTLY change the output.
5. Include 2-3 concrete example answers per question that are domain-relevant.
6. Questions in Hebrew. Order by impact — most important first.${hasContext ? "\n7. If context is attached — ask about INTENT with the material, not about what's in it." : ""}${isRefinement ? "\n8. Do NOT repeat questions the user already answered. Ask about REMAINING gaps only." : ""}${previousIdsNote}

Tone: ${tone}. Category: ${category}. Mode: ${mode}.

Return ONLY a JSON array. No markdown, no explanation. Format:
[{"id": 1, "question": "...", "description": "...", "examples": ["ex1", "ex2", "ex3"], "priority": 10, "category": "audience", "impactEstimate": "+10 נקודות", "required": true}]

FIELD DEFINITIONS:
- priority (1-10): 10 = critical gap, 1 = nice-to-have
- category: role | task | audience | format | constraints | context | platform | style | examples
- impactEstimate: e.g. "+10 נקודות"
- required: true if critical for quality

If the prompt is already comprehensive, return [].`;

  const userMessage = `פרומפט מקורי:\n${prompt}\n\nפרומפט משודרג:\n${enhancedPrompt}${contextSummary ? `\n\nContext מצורף:\n${contextSummary}` : ""}`;

  try {
    const { text } = await AIGateway.generateFull({
      system: systemPrompt,
      prompt: userMessage,
      task: "classify",
      preferredModel: "gemini-2.5-flash-lite",
      maxOutputTokens: 2048,
      userTier: "free",
    });

    let questions: unknown[] = [];
    try {
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
      const parsed = JSON.parse(cleaned);
      questions = Array.isArray(parsed) ? parsed : [];
    } catch {
      logger.warn("[enhance/questions] Failed to parse questions JSON", { sample: text.slice(0, 200) });
      questions = [];
    }

    return NextResponse.json({ questions });
  } catch (err) {
    logger.error("[enhance/questions] LLM call failed", err);
    return NextResponse.json({ questions: [] });
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: 0 errors. If you get errors about the `context` field types, ensure the inner schema fields match the imported types exactly.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/enhance/questions/route.ts src/lib/ratelimit.ts
git commit -m "feat(enhance): add /api/enhance/questions background endpoint"
```

---

## Task 4: Add `questionsLoading` state to `usePromptWorkflow.ts`

**Files:**
- Modify: `src/hooks/usePromptWorkflow.ts`

- [ ] **Step 1: Add `questionsLoading` to `PromptState`**

In `src/hooks/usePromptWorkflow.ts`, add to the `PromptState` interface:

```ts
questionsLoading: boolean;
```

- [ ] **Step 2: Add `SET_QUESTIONS_LOADING` to `PromptAction`**

In the `PromptAction` union type, add:

```ts
| { type: 'SET_QUESTIONS_LOADING'; payload: boolean }
```

- [ ] **Step 3: Set default in `initialState`**

In `initialState`, add:

```ts
questionsLoading: false,
```

- [ ] **Step 4: Add reducer cases**

In `promptReducer`, add the new action case:

```ts
case 'SET_QUESTIONS_LOADING':
  return { ...state, questionsLoading: action.payload };
```

Update the existing `START_STREAM` case to also reset `questionsLoading`:

```ts
case 'START_STREAM':
  return {
    ...state,
    isLoading: true,
    completion: '',
    streamPhase: 'sending',
    error: null,
    copied: false,
    questionsLoading: false,      // ← add this line
    originalInput: state.originalInput || state.input,
  };
```

Update the existing `SET_QUESTIONS` case to also clear `questionsLoading`:

```ts
case 'SET_QUESTIONS':
  return {
    ...state,
    questions: action.payload,
    questionAnswers: {},
    questionsLoading: false,      // ← add this line
  };
```

- [ ] **Step 5: Run typecheck**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: TypeScript will now complain everywhere `PromptState` is destructured without `questionsLoading` — that's fine, they'll be fixed in Task 5 and 6.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePromptWorkflow.ts
git commit -m "feat(workflow): add questionsLoading state"
```

---

## Task 5: Fire questions endpoint in `usePromptEnhance.ts`

**Files:**
- Modify: `src/hooks/usePromptEnhance.ts`

- [ ] **Step 1: Add `questionsAbortRef` to the hook**

Near the top of `usePromptEnhance` (after `enhanceCooldownRef`), add:

```ts
const questionsAbortRef = useRef<AbortController | null>(null);
```

- [ ] **Step 2: Extract a `fetchQuestions` helper inside the hook**

Add this helper function inside `usePromptEnhance`, before `processStreamResult`:

```ts
const fetchQuestions = useCallback(
  (body: string, params: {
    prompt: string;
    category: string;
    tone: string;
    capability: string;
    iteration: number;
    contextPayload: unknown[];
    previousQuestionIds?: number[];
  }) => {
    // Cancel any in-flight questions fetch from a previous enhance
    questionsAbortRef.current?.abort();
    const controller = new AbortController();
    questionsAbortRef.current = controller;

    dispatch({ type: 'SET_QUESTIONS_LOADING', payload: true });

    fetch(getApiPath('/api/enhance/questions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        prompt: params.prompt,
        enhancedPrompt: body,
        category: params.category,
        tone: params.tone,
        capability_mode: params.capability,
        iteration: params.iteration,
        ...(params.contextPayload.length > 0 && { context: params.contextPayload }),
        ...(params.previousQuestionIds && params.previousQuestionIds.length > 0 && {
          previousQuestionIds: params.previousQuestionIds,
        }),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'SET_QUESTIONS', payload: data?.questions ?? [] });
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          dispatch({ type: 'SET_QUESTIONS', payload: [] });
        }
      });
  },
  [dispatch],
);
```

Add `fetchQuestions` to the `useCallback` deps array of `processStreamResult` (or keep it stable via `useCallback` — since `fetchQuestions` is already memoized, just add it).

- [ ] **Step 3: Modify `processStreamResult` to call `fetchQuestions` when `questionsPart` is empty**

In `processStreamResult`, find the current `else` branch for empty `questionsPart`:

```ts
// CURRENT:
} else {
  dispatch({ type: "SET_QUESTIONS", payload: [] });
}
```

Replace with:

```ts
} else if (body.length > 20) {
  // New path: no embedded questions → fire dedicated endpoint
  fetchQuestions(body, {
    prompt: ps.input,
    category: ps.selectedCategory,
    tone: ps.selectedTone,
    capability: String(ps.selectedCapability),
    iteration: ps.iterationCount,
    contextPayload: context.getContextPayload(),
  });
} else {
  dispatch({ type: "SET_QUESTIONS", payload: [] });
}
```

Note: `ps` here refers to the `ps` parameter of `usePromptEnhance`. Since `processStreamResult` is a `useCallback` that closes over `ps`, and `ps` is a React state snapshot, this is the correct value at call time.

- [ ] **Step 4: Update `handleRefine` to pass `previousQuestionIds`**

In `handleRefine`, after `processStreamResult("Refine")` returns, the questions path needs to know which question IDs were already answered. Modify the `fetchQuestions` call inside `processStreamResult` for the refine case.

The cleanest approach: `processStreamResult` accepts an optional `opts` parameter. Update its signature:

```ts
const processStreamResult = useCallback(
  (label: string, opts?: { previousQuestionIds?: number[] }) => {
    // ...existing code...
    } else if (body.length > 20) {
      fetchQuestions(body, {
        prompt: ps.input,
        category: ps.selectedCategory,
        tone: ps.selectedTone,
        capability: String(ps.selectedCapability),
        iteration: ps.iterationCount,
        contextPayload: context.getContextPayload(),
        previousQuestionIds: opts?.previousQuestionIds,
      });
    }
    // ...
  },
  [...deps, fetchQuestions],
);
```

Then in `handleRefine`, change:

```ts
const refineResult = processStreamResult("Refine");
```

to:

```ts
const answeredIds = ps.questions
  .filter((q) => ps.questionAnswers[String(q.id)]?.trim())
  .map((q) => q.id);
const refineResult = processStreamResult("Refine", { previousQuestionIds: answeredIds });
```

- [ ] **Step 5: Abort on unmount**

In `usePromptEnhance`, add a cleanup to abort in-flight questions on unmount. Add after the hook body (before the return):

```ts
// Abort any in-flight questions fetch on unmount
// (React does not guarantee cleanup, but this prevents state updates on dead components)
// Note: This is handled by the AbortController abort in fetchQuestions on each new enhance.
// No explicit useEffect needed — questionsAbortRef.current?.abort() in fetchQuestions handles racing.
```

(No code change needed — the `questionsAbortRef.current?.abort()` at the top of `fetchQuestions` already handles this for rapid re-enhances. A `useEffect` cleanup is optional and not required for correctness.)

- [ ] **Step 6: Run typecheck**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePromptEnhance.ts
git commit -m "feat(enhance): fire questions endpoint after main stream completes"
```

---

## Task 6: Add questions skeleton to `HomeResultSection.tsx`

**Files:**
- Modify: `src/components/features/home/HomeResultSection.tsx`

- [ ] **Step 1: Add `questionsLoading` to the component's props**

Find the props interface/type for `HomeResultSection`. Add:

```ts
questionsLoading: boolean;
```

- [ ] **Step 2: Add `QuestionsSkeleton` component**

Add this small component near the top of the file (outside `HomeResultSection`):

```tsx
function QuestionsSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 space-y-3">
      <div className="h-4 w-32 rounded bg-[var(--glass-border)] animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded-xl bg-[var(--glass-border)] animate-pulse opacity-60" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update the questions render condition**

Find this block (around line 153):

```tsx
{(questions.length > 0 || iterationCount > 0) && (
  <ErrorBoundary name="SmartRefinement">
    <SmartRefinement ... />
  </ErrorBoundary>
)}
```

Replace with:

```tsx
{questionsLoading && questions.length === 0 && iterationCount === 0 && (
  <QuestionsSkeleton />
)}
{(questions.length > 0 || iterationCount > 0) && (
  <ErrorBoundary name="SmartRefinement">
    <SmartRefinement ... />
  </ErrorBoundary>
)}
```

- [ ] **Step 4: Thread `questionsLoading` from the parent**

In `src/app/HomeClient.tsx` at line ~1486 (the `<HomeResultSection>` JSX block), add one prop after `questions={ps.questions}`:

```tsx
questions={ps.questions}
questionsLoading={ps.questionsLoading}   // ← add this
questionAnswers={ps.questionAnswers}
```

- [ ] **Step 5: Run typecheck**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/home/HomeResultSection.tsx
git commit -m "feat(ui): show skeleton while questions load after enhance"
```

---

## Task 7: End-to-end verification

- [ ] **Step 1: Start dev server**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npm run dev
```

- [ ] **Step 2: Test main flow**

Navigate to `http://localhost:3000`. Enter a prompt. Click Enhance. Verify:
- Text starts streaming immediately
- Stream completes (no `[GENIUS_QUESTIONS]` JSON visible in the streamed text)
- Questions skeleton appears for ~1-2s
- Questions populate

- [ ] **Step 3: Test cache hit (backward compat)**

Enhance the exact same prompt a second time. Verify:
- Questions appear instantly (parsed from cached text, no skeleton shown)
- No doubled questions, no blank questions section

- [ ] **Step 4: Test rapid re-enhance**

Click Enhance twice quickly. Verify only one questions load cycle completes (second cancels first).

- [ ] **Step 5: Test refinement**

Answer a question and click Refine. Verify questions reload after refinement and don't repeat the answered question.

- [ ] **Step 6: Run full test suite**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npm test -- --run
```

Expected: all passing. Pay attention to `split-genius-completion.test.ts` (parser unchanged) and any engine tests.

- [ ] **Step 7: Run typecheck one final time**

```bash
cd C:/Users/sasso/dev/Peroot/Prut/web && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Push to main**

```bash
git push origin main
```

Vercel auto-deploys. Monitor the deployment for any runtime errors in the Vercel dashboard.
