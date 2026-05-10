# Design: Thinking Stages UX Indicator
**Date:** 2026-05-10
**Track:** Speed / Latency (Track 2)
**Status:** Approved

---

## Context

The enhance endpoint has a 4-12s silent gap before the first text token arrives. During this time Gemini runs thinking tokens internally. The UI shows a static skeleton/spinner with no indication of progress. Users experience this as the app being slow or frozen.

**Goal:** Eliminate the perception of silence. Show animated stage labels that auto-advance during the pre-stream wait, so users see the app actively working.

**Constraint:** Zero server changes. Client-only solution. No risk to the streaming pipeline.

---

## Decision

**Approach A — Client-only time-based stage progression.**

A new `ThinkingStagesIndicator` component replaces the current animate-pulse skeleton in `ResultSection.tsx`. It auto-advances through 3 stages using timers:

- Stage 1: shown immediately on `streamPhase === "sending"`
- Stage 2: shown after 2 seconds
- Stage 3: shown after 5 seconds (handles very slow deep-research requests)

When `streamPhase` transitions to `"writing"` (first text chunk), `isLoading && !completion` becomes false and the indicator unmounts automatically. No manual cleanup needed.

---

## Components

### New: `ThinkingStagesIndicator.tsx`
**Path:** `src/components/features/prompt-improver/ThinkingStagesIndicator.tsx`

**Props:**
```ts
interface Props {
  streamPhase: StreamPhase; // "sending" | "writing" | ...
}
```

**Stage labels (Hebrew-first):**
| Stage | Label | Delay |
|-------|-------|-------|
| 1 | מנתח את הפרומפט... | 0ms (immediate) |
| 2 | בונה מבנה שיפור... | 2000ms |
| 3 | מייצר גרסה משופרת... | 5000ms |

**Visual design:**
- Completed stages: checkmark icon (`✓`), muted text color
- Active stage: animated spinner dot + full-opacity text
- Pending stages: faded text, no icon
- Direction: `dir="rtl"`
- Container: same `p-8 space-y-4` as existing skeleton

**Behavior:**
- `useEffect` starts 2s and 5s timers on mount
- Cleanup cancels both timers on unmount (no memory leaks)
- No timer needed for stage 1 (shown immediately)

### Modified: `ResultSection.tsx`
**Path:** `src/components/features/prompt-improver/ResultSection.tsx`

**Change:** Inside the `isLoading && !completion` block (line ~253), replace the `animate-pulse` skeleton div with `<ThinkingStagesIndicator streamPhase={streamPhase} />`.

The JSON-platform special message (lines ~267-271) stays above the indicator.

---

## Why This Works

The `streamPhase` state machine in `usePromptWorkflow.ts` already tracks exactly what we need:
- `START_STREAM` action → `streamPhase = "sending"` (request fired)
- `STREAM_CHUNK` action → `streamPhase = "writing"` (first token arrived)

`ResultSection` already receives `streamPhase` as a prop (line 57). No prop threading needed.

---

## Verification

1. Fire a Standard prompt → see "מנתח את הפרומפט..." immediately
2. Wait 2s → "בונה מבנה שיפור..." appears
3. When streaming starts → indicator disappears, text flows in
4. Fire a Deep Research prompt (longer wait) → stage 3 "מייצר גרסה משופרת..." should appear at ~5s
5. Rapid cancellation (click Stop mid-thinking) → timers must clean up, no console errors
6. `npm run typecheck` — zero new errors
