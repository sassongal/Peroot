# Output Language from Voice Picker — Design Spec

**Date:** 2026-05-07
**Status:** Approved
**Scope:** Wire the existing voice-language picker to also control the output language of the enhanced prompt.

---

## Problem

The voice-language picker in the chat window (HE / EN / AR / RU) controls speech-recognition language only. When a user picks English, Arabic, or Russian, the enhanced prompt still comes back in Hebrew. The backend already accepts `output_language` and the engine already has a partial English override — neither is wired to the UI.

---

## Goal

When the user selects a language in the voice picker, the improved prompt output is written in that language. No new UI elements. Zero extra LLM API calls. Token overhead: ~30 tokens only when a non-Hebrew language is selected.

---

## Architecture

### 1. Data mapping — `src/hooks/useVoiceRecorder.ts`

Add an `outputLang` field to each entry in `VOICE_LANGUAGES`. This is the single source of truth; no switch statements anywhere else.

```typescript
export const VOICE_LANGUAGES = [
  { code: "he-IL", label: "עברית",   flag: "🇮🇱", short: "HE", outputLang: "hebrew"  },
  { code: "en-US", label: "English", flag: "🇺🇸", short: "EN", outputLang: "english" },
  { code: "ar-SA", label: "العربية", flag: "🇸🇦", short: "AR", outputLang: "arabic"  },
  { code: "ru-RU", label: "Русский", flag: "🇷🇺", short: "RU", outputLang: "russian" },
] as const;
```

Also export a helper:
```typescript
export function voiceLangToOutputLang(code: VoiceLang): OutputLanguage {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.outputLang ?? "hebrew";
}
```

---

### 2. Type expansion — `src/lib/engines/types.ts`

Expand `EngineInput.outputLanguage` from `"hebrew" | "english"` to the full union:

```typescript
outputLanguage?: "hebrew" | "english" | "arabic" | "russian";
```

Export `OutputLanguage` as a named type so consumers don't repeat the union.

---

### 3. API schema — `src/app/api/enhance/route.ts`

Expand the Zod enum to match:

```typescript
output_language: z.enum(["hebrew", "english", "arabic", "russian"]).optional(),
```

No other changes to the route.

---

### 4. Engine — `src/lib/engines/base-engine.ts`

#### `generate()` — replace English-specific block with generic one

Before (English-only hardcode):
```typescript
const languageOverride =
  input.outputLanguage === "english"
    ? `\n\n[OUTPUT_LANGUAGE_OVERRIDE]\n...English only...`
    : "";
```

After (generic, all languages):
```typescript
const LANG_NAMES: Record<string, string> = {
  hebrew: "Hebrew", english: "English", arabic: "Arabic", russian: "Russian",
};
const langName = LANG_NAMES[input.outputLanguage ?? "hebrew"] ?? "Hebrew";
const languageOverride =
  input.outputLanguage && input.outputLanguage !== "hebrew"
    ? `\n\n[OUTPUT_LANGUAGE_OVERRIDE]\nThe user has requested output in ${langName}. Write the entire enhanced prompt in ${langName} only. All headers, instructions, persona descriptions, constraints, and examples must be in ${langName}. Do NOT use Hebrew anywhere in the output.`
    : "";
```

#### `generateRefinement()` — remove hardcoded Hebrew rule, add language override

Remove this line from the refinement system prompt:
```
4. הפלט חייב להיות בעברית בלבד.
```

Add the same generic `languageOverride` block. When `outputLanguage` is `"hebrew"` or undefined, the rule reads "הפלט חייב להיות בעברית בלבד" (keeping existing Hebrew-first behavior). When it's another language, the override block fires instead.

**Implementation:** extract a shared private method `buildLanguageOverride(outputLanguage)` to avoid duplication between `generate()` and `generateRefinement()`.

---

### 5. State lifting — `PromptInput.tsx` → parent component

`voiceLang` currently lives as private state inside `PromptInput`. Lift it to the parent (same pattern as `targetModel` / `setTargetModel`):

- Add `voiceLang: VoiceLang` and `setVoiceLang: (l: VoiceLang) => void` to `PromptInputProps`
- Remove the `const [voiceLang, setVoiceLang] = useState` from inside the component
- Parent derives `outputLanguage` via `voiceLangToOutputLang(voiceLang)` and holds that state

---

### 6. Hook — `src/hooks/usePromptEnhance.ts`

Add `outputLanguage: OutputLanguage` alongside `targetModel` in the hook's props interface.

Inject into both payloads (enhance and refine) — only when non-Hebrew to keep payload clean for the majority case:

```typescript
...(outputLanguage !== "hebrew" && { output_language: outputLanguage }),
```

---

## Data Flow

```
User picks language in picker
  → setVoiceLang (lifted state in parent)
  → parent derives outputLanguage via voiceLangToOutputLang()
  → passed to usePromptEnhance as prop
  → added to /api/enhance payload as output_language
  → route passes it to EngineInput.outputLanguage
  → BaseEngine.generate() / generateRefinement() injects [OUTPUT_LANGUAGE_OVERRIDE]
  → LLM writes enhanced prompt in chosen language
```

---

## Error Handling

- Unknown language code → `voiceLangToOutputLang` falls back to `"hebrew"` (safe default)
- `output_language` is always optional in the API — omitting it = Hebrew (existing behavior unchanged)
- No changes to scoring, saving, or display logic — output is plain text regardless of language

---

## Out of Scope

- Translating the UI itself (that's the i18n system, unrelated)
- Adding more languages beyond the 4 already in the voice picker
- Per-user language preference persistence (could be a follow-up if needed)
- The `AGENT_BUILDER` mode — system prompts (not user-facing output) remain Hebrew by design

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useVoiceRecorder.ts` | Add `outputLang` to `VOICE_LANGUAGES`, export helper |
| `src/lib/engines/types.ts` | Expand `outputLanguage` union, export `OutputLanguage` type |
| `src/lib/engines/base-engine.ts` | Generic `languageOverride`, fix `generateRefinement()` |
| `src/app/api/enhance/route.ts` | Expand Zod enum |
| `src/hooks/usePromptEnhance.ts` | Add `outputLanguage` prop, inject into payloads |
| `src/components/features/prompt-improver/PromptInput.tsx` | Lift `voiceLang` state (props instead of internal) |
| Parent component (HomeClient or equivalent) | Hold lifted `voiceLang` state, derive `outputLanguage` |
