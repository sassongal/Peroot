# Output Language from Voice Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the voice-language picker (HE/EN/AR/RU) so the enhanced prompt output is written in the user's chosen language.

**Architecture:** Add `outputLang` to `VOICE_LANGUAGES` as the single source of truth. Lift `voiceLang` state from `PromptInput` to `HomeClient`, derive `outputLanguage` there, pass it to `usePromptEnhance` which injects it into both enhance and refine payloads. `BaseEngine` uses a shared private `buildLanguageOverride()` method in both `generate()` and `generateRefinement()`.

**Tech Stack:** TypeScript, Next.js App Router, Zod, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/hooks/useVoiceRecorder.ts` | Add `outputLang` field to VOICE_LANGUAGES; export `voiceLangToOutputLang` helper |
| `src/lib/engines/types.ts` | Expand `outputLanguage` union to 4 values; export named `OutputLanguage` type |
| `src/lib/engines/base-engine.ts` | Extract private `buildLanguageOverride()`; fix `generateRefinement()` hardcoded Hebrew rule |
| `src/app/api/enhance/route.ts` | Expand Zod enum to 4 values |
| `src/hooks/usePromptEnhance.ts` | Add `outputLanguage: OutputLanguage` prop; inject into both payloads |
| `src/components/features/prompt-improver/PromptInput.tsx` | Lift `voiceLang` from internal state to props |
| `src/app/HomeClient.tsx` | Hold `voiceLang` state; derive `outputLanguage`; pass to PromptInput and usePromptEnhance |

---

### Task 1: Add `outputLang` to VOICE_LANGUAGES and export helper

**Files:**
- Modify: `src/hooks/useVoiceRecorder.ts:6-11`
- Create: `src/hooks/__tests__/useVoiceRecorder.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useVoiceRecorder.test.ts
import { describe, it, expect } from "vitest";
import { voiceLangToOutputLang, VOICE_LANGUAGES } from "@/hooks/useVoiceRecorder";

describe("voiceLangToOutputLang", () => {
  it("maps he-IL to hebrew", () => {
    expect(voiceLangToOutputLang("he-IL")).toBe("hebrew");
  });
  it("maps en-US to english", () => {
    expect(voiceLangToOutputLang("en-US")).toBe("english");
  });
  it("maps ar-SA to arabic", () => {
    expect(voiceLangToOutputLang("ar-SA")).toBe("arabic");
  });
  it("maps ru-RU to russian", () => {
    expect(voiceLangToOutputLang("ru-RU")).toBe("russian");
  });
  it("every VOICE_LANGUAGES entry has an outputLang", () => {
    for (const lang of VOICE_LANGUAGES) {
      expect(lang.outputLang).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test -- src/hooks/__tests__/useVoiceRecorder.test.ts
```

Expected: FAIL — `voiceLangToOutputLang is not a function` / `outputLang is undefined`

- [ ] **Step 3: Add `outputLang` to each VOICE_LANGUAGES entry and export the helper**

In `src/hooks/useVoiceRecorder.ts`, replace lines 6-13:

```typescript
export const VOICE_LANGUAGES = [
  { code: "he-IL", label: "עברית",    flag: "🇮🇱", short: "HE", outputLang: "hebrew"  },
  { code: "en-US", label: "English",  flag: "🇺🇸", short: "EN", outputLang: "english" },
  { code: "ar-SA", label: "العربية", flag: "🇸🇦", short: "AR", outputLang: "arabic"  },
  { code: "ru-RU", label: "Русский",  flag: "🇷🇺", short: "RU", outputLang: "russian" },
] as const;

export type VoiceLang = (typeof VOICE_LANGUAGES)[number]["code"];

export function voiceLangToOutputLang(code: VoiceLang): "hebrew" | "english" | "arabic" | "russian" {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.outputLang ?? "hebrew";
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm run test -- src/hooks/__tests__/useVoiceRecorder.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useVoiceRecorder.ts src/hooks/__tests__/useVoiceRecorder.test.ts
git commit -m "feat(voice): add outputLang to VOICE_LANGUAGES, export voiceLangToOutputLang"
```

---

### Task 2: Expand `OutputLanguage` type in engines/types.ts

**Files:**
- Modify: `src/lib/engines/types.ts:62`

- [ ] **Step 1: Update the `outputLanguage` field and export the named type**

In `src/lib/engines/types.ts`, replace the `outputLanguage` line (currently line 62):

```typescript
/** Force output language — overrides the engine's default (Hebrew) */
outputLanguage?: "hebrew" | "english" | "arabic" | "russian";
```

Then add the named type export directly above the `EngineInput` interface (or anywhere near the top of the type exports, before `EngineInput`):

```typescript
export type OutputLanguage = "hebrew" | "english" | "arabic" | "russian";
```

Then update the field in `EngineInput`:

```typescript
/** Force output language — overrides the engine's default (Hebrew) */
outputLanguage?: OutputLanguage;
```

- [ ] **Step 2: Run typecheck**

```
npm run typecheck
```

Expected: No errors (the union is backward-compatible — existing call sites using `"hebrew"` or `"english"` are still valid).

- [ ] **Step 3: Commit**

```bash
git add src/lib/engines/types.ts
git commit -m "feat(types): expand OutputLanguage to arabic/russian, export named type"
```

---

### Task 3: Generic `buildLanguageOverride()` in base-engine.ts

**Files:**
- Modify: `src/lib/engines/base-engine.ts`
- Modify: `src/lib/engines/__tests__/base-engine-model-profile.test.ts` (add new describe block)

- [ ] **Step 1: Write the failing test**

Add this describe block to `src/lib/engines/__tests__/base-engine-model-profile.test.ts` (or create a new file `src/lib/engines/__tests__/base-engine-language.test.ts`):

```typescript
// src/lib/engines/__tests__/base-engine-language.test.ts
import { describe, it, expect } from "vitest";
import { StandardEngine } from "@/lib/engines/standard";
import { CapabilityMode } from "@/lib/capability-mode";

const MIN_CONFIG = {
  mode: CapabilityMode.STANDARD,
  name: "test",
  system_prompt_template: "system",
  user_prompt_template: "user: {{prompt}}",
};

const BASE_INPUT = {
  prompt: "test prompt",
  tone: "professional",
  category: "general",
  mode: CapabilityMode.STANDARD,
};

describe("BaseEngine language override", () => {
  it("generate() with hebrew outputLanguage produces no override block", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generate({ ...BASE_INPUT, outputLanguage: "hebrew" });
    expect(out.systemPrompt).not.toContain("[OUTPUT_LANGUAGE_OVERRIDE]");
  });

  it("generate() with arabic outputLanguage injects override", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generate({ ...BASE_INPUT, outputLanguage: "arabic" });
    expect(out.systemPrompt).toContain("[OUTPUT_LANGUAGE_OVERRIDE]");
    expect(out.systemPrompt).toContain("Arabic");
  });

  it("generate() with russian outputLanguage injects override", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generate({ ...BASE_INPUT, outputLanguage: "russian" });
    expect(out.systemPrompt).toContain("[OUTPUT_LANGUAGE_OVERRIDE]");
    expect(out.systemPrompt).toContain("Russian");
  });

  it("generateRefinement() with english outputLanguage injects override", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generateRefinement({
      ...BASE_INPUT,
      outputLanguage: "english",
      previousResult: "previous enhanced prompt",
    });
    expect(out.systemPrompt).toContain("[OUTPUT_LANGUAGE_OVERRIDE]");
    expect(out.systemPrompt).not.toContain("הפלט חייב להיות בעברית בלבד");
  });

  it("generateRefinement() with hebrew outputLanguage keeps Hebrew rule", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generateRefinement({
      ...BASE_INPUT,
      outputLanguage: "hebrew",
      previousResult: "previous",
    });
    expect(out.systemPrompt).toContain("עברית");
    expect(out.systemPrompt).not.toContain("[OUTPUT_LANGUAGE_OVERRIDE]");
  });

  it("generateRefinement() with undefined outputLanguage keeps Hebrew rule", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generateRefinement({
      ...BASE_INPUT,
      previousResult: "previous",
    });
    expect(out.systemPrompt).toContain("עברית");
    expect(out.systemPrompt).not.toContain("[OUTPUT_LANGUAGE_OVERRIDE]");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test -- src/lib/engines/__tests__/base-engine-language.test.ts
```

Expected: FAIL — arabic/russian cases produce no override block; refinement tests fail because generateRefinement always says Hebrew.

- [ ] **Step 3: Add `buildLanguageOverride()` private method and update both methods**

In `src/lib/engines/base-engine.ts`, add the private method right before `generate()` (search for `generate(input: EngineInput)`):

```typescript
private buildLanguageOverride(outputLanguage: string | undefined): string {
  const LANG_NAMES: Record<string, string> = {
    hebrew: "Hebrew",
    english: "English",
    arabic: "Arabic",
    russian: "Russian",
  };
  if (!outputLanguage || outputLanguage === "hebrew") return "";
  const langName = LANG_NAMES[outputLanguage] ?? outputLanguage;
  return `\n\n[OUTPUT_LANGUAGE_OVERRIDE]\nThe user has requested output in ${langName}. Write the entire enhanced prompt in ${langName} only. All headers, instructions, persona descriptions, constraints, and examples must be in ${langName}. Do NOT use Hebrew anywhere in the output.`;
}
```

In `generate()`, replace lines 359-362 (the English-specific block):

```typescript
const languageOverride = this.buildLanguageOverride(input.outputLanguage);
```

In `generateRefinement()` (around line 438-469):

1. After the `modelHints` line (around line 436), add:
   ```typescript
   const languageOverride = this.buildLanguageOverride(input.outputLanguage);
   ```

2. Replace the hardcoded Hebrew rule on line 445:
   ```
   4. הפלט חייב להיות בעברית בלבד.
   ```
   With a language-aware rule:
   ```typescript
   ${input.outputLanguage && input.outputLanguage !== "hebrew"
     ? `4. כתוב את כל הפרומפט ב${input.outputLanguage === "english" ? "אנגלית" : input.outputLanguage === "arabic" ? "ערבית" : "רוסית"} בלבד.`
     : "4. הפלט חייב להיות בעברית בלבד."}
   ```

   Actually, use the override block instead. Replace the `return` statement's `systemPrompt` to append `languageOverride` at the end:

   In the `return` block of `generateRefinement()` (line 438-461), replace the closing of the systemPrompt template literal:

   Before the closing backtick of `systemPrompt`, insert `${languageOverride}`.

   The full replacement for line 445 (removing the hardcoded Hebrew rule) and the systemPrompt closing:

   Remove line 445 (`4. הפלט חייב להיות בעברית בלבד.`) entirely. Append `${languageOverride}` to the end of the `systemPrompt` string, right before the final closing backtick.

   The `systemPrompt` in `generateRefinement()` ends at approximately line 461 with `\n\n`. Change the closing of that template literal from:

   ```typescript
   ${this.getVariableRegistryBlock(input.category)}

   `,
   ```

   to:

   ```typescript
   ${this.getVariableRegistryBlock(input.category)}
   ${languageOverride}
   `,
   ```

- [ ] **Step 4: Run test to verify it passes**

```
npm run test -- src/lib/engines/__tests__/base-engine-language.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Run all engine tests to check for regressions**

```
npm run test -- src/lib/engines
```

Expected: All pass. No regressions.

- [ ] **Step 6: Commit**

```bash
git add src/lib/engines/base-engine.ts src/lib/engines/__tests__/base-engine-language.test.ts
git commit -m "feat(engine): extract buildLanguageOverride(), add arabic/russian support to generate() and generateRefinement()"
```

---

### Task 4: Expand Zod enum in the enhance route

**Files:**
- Modify: `src/app/api/enhance/route.ts:101`

- [ ] **Step 1: Write the failing test**

Open `src/app/api/enhance/__tests__/route.test.ts` and add a small test verifying arabic/russian are accepted. If the test file is large, add to an existing describe block testing the Zod schema or request validation:

```typescript
// Add to existing route test file — find a describe block about request validation
it("accepts arabic as output_language", async () => {
  // The Zod schema should parse "arabic" without throwing
  const { output_language } = z.object({
    output_language: z.enum(["hebrew", "english", "arabic", "russian"]).optional(),
  }).parse({ output_language: "arabic" });
  expect(output_language).toBe("arabic");
});
```

If the test file doesn't import `z`, just verify the enum via a simple unit test of the schema. A simpler approach — add to the existing route test file or create a small standalone test:

```typescript
// src/app/api/enhance/__tests__/output-language-schema.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";

const outputLanguageSchema = z.enum(["hebrew", "english", "arabic", "russian"]).optional();

describe("output_language Zod schema", () => {
  it("accepts hebrew", () => expect(outputLanguageSchema.parse("hebrew")).toBe("hebrew"));
  it("accepts english", () => expect(outputLanguageSchema.parse("english")).toBe("english"));
  it("accepts arabic", () => expect(outputLanguageSchema.parse("arabic")).toBe("arabic"));
  it("accepts russian", () => expect(outputLanguageSchema.parse("russian")).toBe("russian"));
  it("accepts undefined", () => expect(outputLanguageSchema.parse(undefined)).toBeUndefined());
  it("rejects unknown value", () => {
    expect(() => outputLanguageSchema.parse("french")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test -- src/app/api/enhance/__tests__/output-language-schema.test.ts
```

Expected: FAIL on arabic and russian (not in enum).

- [ ] **Step 3: Expand the Zod enum in route.ts**

In `src/app/api/enhance/route.ts`, line 101, change:

```typescript
output_language: z.enum(["hebrew", "english"]).optional(),
```

to:

```typescript
output_language: z.enum(["hebrew", "english", "arabic", "russian"]).optional(),
```

- [ ] **Step 4: Run test to verify it passes**

```
npm run test -- src/app/api/enhance/__tests__/output-language-schema.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/enhance/route.ts src/app/api/enhance/__tests__/output-language-schema.test.ts
git commit -m "feat(api): expand output_language Zod enum to include arabic and russian"
```

---

### Task 5: Add `outputLanguage` prop to `usePromptEnhance`

**Files:**
- Modify: `src/hooks/usePromptEnhance.ts`

- [ ] **Step 1: Import `OutputLanguage` at the top of the file**

In `src/hooks/usePromptEnhance.ts`, find the import that includes `TargetModel`:

```typescript
import type { TargetModel } from "@/lib/engines/types";
```

Change to:

```typescript
import type { TargetModel, OutputLanguage } from "@/lib/engines/types";
```

- [ ] **Step 2: Add `outputLanguage` to the params interface**

In `UsePromptEnhanceParams` (around line 58), after `targetModel: TargetModel;`, add:

```typescript
outputLanguage: OutputLanguage;
```

- [ ] **Step 3: Destructure `outputLanguage` in the hook body**

In `usePromptEnhance` (around line 99), after `targetModel,`, add:

```typescript
outputLanguage,
```

- [ ] **Step 4: Inject into the enhance payload**

Find line 384 where `target_model` is injected in the enhance payload. Add `output_language` injection right after it:

```typescript
...(targetModel !== "general" && { target_model: targetModel }),
...(outputLanguage !== "hebrew" && { output_language: outputLanguage }),
```

- [ ] **Step 5: Inject into the refine payload**

Find line 529 where `target_model` is injected in the refine payload. Add the same injection:

```typescript
...(targetModel !== "general" && { target_model: targetModel }),
...(outputLanguage !== "hebrew" && { output_language: outputLanguage }),
```

- [ ] **Step 6: Run typecheck**

```
npm run typecheck
```

Expected: TypeScript error — `outputLanguage` is not yet passed at the call site in `HomeClient.tsx`. That's expected; we fix it in Task 7.

- [ ] **Step 7: Commit (with typecheck error — will be fixed in Task 7)**

```bash
git add src/hooks/usePromptEnhance.ts
git commit -m "feat(hook): add outputLanguage prop to usePromptEnhance, inject into enhance and refine payloads"
```

---

### Task 6: Lift `voiceLang` state out of `PromptInput.tsx`

**Files:**
- Modify: `src/components/features/prompt-improver/PromptInput.tsx`

- [ ] **Step 1: Add imports**

In `PromptInput.tsx`, find the import for `VoiceLang`:

```typescript
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
```

Change to:

```typescript
import { useVoiceRecorder, type VoiceLang } from "@/hooks/useVoiceRecorder";
```

(If `VoiceLang` is already imported, just verify it's there.)

- [ ] **Step 2: Add `voiceLang` and `setVoiceLang` to `PromptInputProps`**

Find the `PromptInputProps` interface (search for `targetModel: TargetModel`). Add two fields alongside `targetModel` and `setTargetModel`:

```typescript
voiceLang: VoiceLang;
setVoiceLang: (lang: VoiceLang) => void;
```

- [ ] **Step 3: Remove the internal `voiceLang` useState**

Find line 194:
```typescript
const [voiceLang, setVoiceLang] = useState<VoiceLang>("he-IL");
```
Delete this line entirely.

- [ ] **Step 4: Destructure the new props in the component**

Find where `targetModel` and `setTargetModel` are destructured from props (around line 179-180). Add:

```typescript
voiceLang,
setVoiceLang,
```

- [ ] **Step 5: Run typecheck**

```
npm run typecheck
```

Expected: TypeScript errors at the `PromptInput` usage site in `HomeClient.tsx` (missing `voiceLang`/`setVoiceLang` props). That's correct — fix in Task 7.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/prompt-improver/PromptInput.tsx
git commit -m "feat(ui): lift voiceLang state from PromptInput to parent — add as props"
```

---

### Task 7: Wire everything in `HomeClient.tsx`

**Files:**
- Modify: `src/app/HomeClient.tsx`

- [ ] **Step 1: Add imports**

At the top of `HomeClient.tsx`, find the existing imports from `useVoiceRecorder` or the `VoiceLang` type. Add:

```typescript
import { voiceLangToOutputLang, type VoiceLang } from "@/hooks/useVoiceRecorder";
import type { OutputLanguage } from "@/lib/engines/types";
```

- [ ] **Step 2: Add `voiceLang` state after `targetModel` state (line 174)**

After:
```typescript
const [targetModel, setTargetModel] = useState<TargetModel>("general");
```

Add:
```typescript
const [voiceLang, setVoiceLang] = useState<VoiceLang>("he-IL");
const outputLanguage: OutputLanguage = voiceLangToOutputLang(voiceLang);
```

- [ ] **Step 3: Pass `voiceLang`/`setVoiceLang` to `PromptInput`**

Find line 1518-1519 where `targetModel` and `setTargetModel` are passed:

```typescript
targetModel={targetModel}
setTargetModel={handleSetTargetModel}
```

Add after those two:

```typescript
voiceLang={voiceLang}
setVoiceLang={setVoiceLang}
```

- [ ] **Step 4: Pass `outputLanguage` to `usePromptEnhance`**

Find the `usePromptEnhance` call site (around line 825). The params object includes `targetModel`. Add `outputLanguage` alongside it:

```typescript
targetModel,
outputLanguage,
```

- [ ] **Step 5: Run typecheck**

```
npm run typecheck
```

Expected: No errors. All type errors from Tasks 5 and 6 are resolved.

- [ ] **Step 6: Run all tests**

```
npm run test
```

Expected: All tests pass. No regressions.

- [ ] **Step 7: Commit**

```bash
git add src/app/HomeClient.tsx
git commit -m "feat(home): hold voiceLang state, derive outputLanguage, wire to PromptInput and usePromptEnhance"
```

---

### Task 8: Manual smoke test

- [ ] **Step 1: Start dev server**

```
npm run dev
```

- [ ] **Step 2: Test Hebrew (default)**

Open http://localhost:3000. Do NOT change the language picker (stays on HE). Type a prompt and enhance it. Verify: output is in Hebrew.

- [ ] **Step 3: Test English**

Click the language picker, select EN. Type a prompt and enhance it. Verify: output is in English throughout.

- [ ] **Step 4: Test Arabic**

Select AR. Enhance a prompt. Verify: output is in Arabic.

- [ ] **Step 5: Test Russian**

Select RU. Enhance a prompt. Verify: output is in Russian.

- [ ] **Step 6: Test refinement carries language**

With EN selected, enhance a prompt. Answer the GENIUS_QUESTIONS. Verify: refinement output is also in English (not Hebrew).

- [ ] **Step 7: Verify network payload**

Open DevTools → Network → filter `/api/enhance`. With EN selected, confirm `output_language: "english"` appears in the request body. With HE selected, confirm `output_language` is absent (not sent).

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "test: manual smoke test complete — output language follows voice picker"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `VOICE_LANGUAGES` gets `outputLang` field (Task 1)
- [x] `voiceLangToOutputLang` exported (Task 1)
- [x] `OutputLanguage` type exported from types.ts (Task 2)
- [x] `EngineInput.outputLanguage` expanded to 4 values (Task 2)
- [x] `generate()` uses generic override (Task 3)
- [x] `generateRefinement()` hardcoded Hebrew rule removed / replaced (Task 3)
- [x] `buildLanguageOverride()` shared between both methods (Task 3)
- [x] Zod enum in route.ts expanded (Task 4)
- [x] `usePromptEnhance` accepts and injects `outputLanguage` (Task 5)
- [x] `voiceLang` lifted from PromptInput to HomeClient (Task 6)
- [x] HomeClient holds state, derives `outputLanguage`, passes everywhere (Task 7)
- [x] Hebrew = no `output_language` in payload (Task 5 — keeps majority case clean)
- [x] `AGENT_BUILDER` not affected — the language override only fires for non-Hebrew; agent mode system prompts aren't changed

**Fallback / error handling (from spec):**
- [x] Unknown code → falls back to `"hebrew"` via `?? "hebrew"` in `voiceLangToOutputLang`
- [x] `output_language` is optional in API — omitting it = Hebrew (unchanged default)

**No placeholders:** Confirmed — every step has concrete code.

**Type consistency:** `OutputLanguage` defined in Task 2, imported in Tasks 5 and 7 from the same `@/lib/engines/types` path.
