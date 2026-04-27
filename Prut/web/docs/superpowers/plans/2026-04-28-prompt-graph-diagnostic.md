# Prompt Graph Diagnostic Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the prompt graph a diagnostic tool — node size reflects prompt score, tag/library hub nodes are interactive, and three existing dead features are repaired.

**Architecture:** All scoring is client-side via `scoreInput()`. A `scoreMap` is computed in `PromptGraphView` and passed to `buildGraphData`. A new `TagNodePanel` component handles hub-node clicks. Bug fixes are surgical single-line changes.

**Tech Stack:** React 19, TypeScript, `react-force-graph-3d`, existing `scoreInput` from `src/lib/engines/scoring/input-scorer.ts`

---

## Files

- Modify: `src/components/features/library/graph-utils.ts` — add `score?` to `GraphNode`, accept `scoreMap` param, remove dead `"category"` type
- Modify: `src/components/features/library/PromptGraphView.tsx` — score map useMemo, nodeVal/nodeColor, onLinkHover fix, successRate tooltip, TagNodePanel wiring
- Create: `src/components/features/library/TagNodePanel.tsx` — side panel for tag and library hub nodes
- Create: `src/components/features/library/__tests__/graph-utils.test.ts` — unit tests for buildGraphData score field

---

## Task 1: Fix dead type + onLinkHover bug

**Files:**
- Modify: `src/components/features/library/graph-utils.ts:34`
- Modify: `src/components/features/library/PromptGraphView.tsx` (two spots)

- [ ] **Step 1: Remove `"category"` from GraphLink type union**

In `src/components/features/library/graph-utils.ts`, find line 34:
```typescript
  type: "category" | "tag" | "reference" | "template" | "similarity" | "capability" | "temporal";
```
Replace with:
```typescript
  type: "tag" | "reference" | "template" | "similarity" | "capability" | "temporal";
```

- [ ] **Step 2: Add missing `onLinkHover` prop to ForceGraph3D**

In `src/components/features/library/PromptGraphView.tsx`, find the `<ForceGraph3D` block. After `onNodeHover={handleNodeHover as any}`, add:
```tsx
            onLinkHover={handleLinkHover as any}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/library/graph-utils.ts src/components/features/library/PromptGraphView.tsx
git commit -m "fix(graph): restore edge hover tooltip + remove dead category edge type"
```

---

## Task 2: Add `score` field to `GraphNode` and `buildGraphData`

**Files:**
- Modify: `src/components/features/library/graph-utils.ts`
- Create: `src/components/features/library/__tests__/graph-utils.test.ts`

- [ ] **Step 1: Add `score?` to `GraphNode` interface**

In `src/components/features/library/graph-utils.ts`, after line `successRate?: number; // 0–1, from success_count / total`, add:
```typescript
  score?: number; // 0–100, from client-side scoreInput
```

- [ ] **Step 2: Add `scoreMap` parameter to `buildGraphData`**

Change the function signature from:
```typescript
export function buildGraphData(prompts: PersonalPrompt[], favoriteIds: Set<string>): GraphData {
```
To:
```typescript
export function buildGraphData(
  prompts: PersonalPrompt[],
  favoriteIds: Set<string>,
  scoreMap?: Map<string, number>,
): GraphData {
```

- [ ] **Step 3: Apply score to nodes in `buildGraphData`**

In `buildGraphData`, inside the `nodes` map (after the `groupId` line), add:
```typescript
      score: scoreMap?.get(p.id),
```
The full node object now ends with:
```typescript
      groupId: `${p.capability_mode ?? CapabilityMode.STANDARD}:${p.personal_category || "כללי"}`,
      score: scoreMap?.get(p.id),
    };
```

- [ ] **Step 4: Write failing test**

Create `src/components/features/library/__tests__/graph-utils.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildGraphData } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";

const makePrompt = (id: string, overrides: Partial<PersonalPrompt> = {}): PersonalPrompt => ({
  id,
  title: `Prompt ${id}`,
  prompt: "test prompt text",
  capability_mode: CapabilityMode.STANDARD,
  tags: [],
  template_variables: [],
  use_count: 0,
  success_count: 0,
  fail_count: 0,
  is_pinned: false,
  is_template: false,
  source: "personal",
  created_at: new Date().toISOString(),
  ...overrides,
} as PersonalPrompt);

describe("buildGraphData", () => {
  it("sets score on node when scoreMap provided", () => {
    const prompts = [makePrompt("p1"), makePrompt("p2")];
    const scoreMap = new Map([["p1", 85], ["p2", 30]]);
    const { nodes } = buildGraphData(prompts, new Set(), scoreMap);
    const p1Node = nodes.find((n) => n.id === "p1");
    const p2Node = nodes.find((n) => n.id === "p2");
    expect(p1Node?.score).toBe(85);
    expect(p2Node?.score).toBe(30);
  });

  it("leaves score undefined when scoreMap not provided", () => {
    const prompts = [makePrompt("p1")];
    const { nodes } = buildGraphData(prompts, new Set());
    expect(nodes.find((n) => n.id === "p1")?.score).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run test — expect FAIL**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npx vitest run src/components/features/library/__tests__/graph-utils.test.ts 2>&1 | tail -20
```
Expected: FAIL (function signature not yet updated, or test file can't find module).

- [ ] **Step 6: Run test — expect PASS after Step 2 & 3**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npx vitest run src/components/features/library/__tests__/graph-utils.test.ts 2>&1 | tail -10
```
Expected: `Tests 2 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/components/features/library/graph-utils.ts src/components/features/library/__tests__/graph-utils.test.ts
git commit -m "feat(graph): add score field to GraphNode + buildGraphData scoreMap param"
```

---

## Task 3: Compute score map in PromptGraphView + wire to node visuals

**Files:**
- Modify: `src/components/features/library/PromptGraphView.tsx`

**Context:** `scoreInput` is at `src/lib/engines/scoring/input-scorer.ts`, signature: `scoreInput(text: string, mode: CapabilityMode): InputScore` where `InputScore.total` is 0–100.

- [ ] **Step 1: Add import for `scoreInput`**

At the top of `src/components/features/library/PromptGraphView.tsx`, after the existing imports, add:
```typescript
import { scoreInput } from "@/lib/engines/scoring/input-scorer";
```

- [ ] **Step 2: Add `hexToRgba` helper**

Before the `PromptGraphView` function declaration, add:
```typescript
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
```

- [ ] **Step 3: Add `scoreMap` useMemo**

Inside `PromptGraphView`, after the existing `promptById` useMemo, add:
```typescript
  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prompts) {
      const result = scoreInput(p.prompt ?? "", p.capability_mode ?? CapabilityMode.STANDARD);
      m.set(p.id, result.total);
    }
    return m;
  }, [prompts]);
```

- [ ] **Step 4: Pass `scoreMap` to `buildGraphData`**

Find the `graphData` useMemo (around line 152):
```typescript
    const data = buildGraphData(prompts, favoriteIds);
```
Replace with:
```typescript
    const data = buildGraphData(prompts, favoriteIds, scoreMap);
```

- [ ] **Step 5: Update `nodeVal` to use score**

Find the `nodeVal` prop on `<ForceGraph3D>`:
```typescript
            nodeVal={
              ((n: GraphNode) => {
                if (n.type === "tag") return 3;
                if (n.type === "library") return 5;
                return Math.max(4, Math.min(10, n.isFavorite ? 9 : n.isRecentlyUsed ? 6 : 4));
              }) as any
            }
```
Replace with:
```typescript
            nodeVal={
              ((n: GraphNode) => {
                if (n.type === "tag") return 3;
                if (n.type === "library") return 5;
                // Size = score-driven: 0→4, 50→9, 100→18
                const s = n.score ?? 50;
                return Math.max(4, Math.min(18, 4 + (s / 100) * 14));
              }) as any
            }
```

- [ ] **Step 6: Update `nodeColor` to dim low-score nodes**

Find the `nodeColor` prop:
```typescript
            nodeColor={
              ((n: GraphNode) => {
                if (n.type === "tag") return "#f59e0b"; // amber — matches legend
                if (n.type === "library") return "#a855f7"; // purple — matches legend
                return CAPABILITY_COLORS[n.capability ?? CapabilityMode.STANDARD];
              }) as any
            }
```
Replace with:
```typescript
            nodeColor={
              ((n: GraphNode) => {
                if (n.type === "tag") return "#f59e0b";
                if (n.type === "library") return "#a855f7";
                const hex = CAPABILITY_COLORS[n.capability ?? CapabilityMode.STANDARD];
                const s = n.score ?? 50;
                // score < 40 → alpha 0.55 (muted); score ≥ 70 → alpha 1.0; linear between
                const alpha = s < 40 ? 0.55 : s < 70 ? 0.55 + ((s - 40) / 30) * 0.45 : 1.0;
                return alpha >= 1.0 ? hex : hexToRgba(hex, alpha);
              }) as any
            }
```

- [ ] **Step 7: Add `successRate` to hover tooltip**

Find the hover tooltip block (around line 934, inside the hover card `dir="rtl"` div). After the `personal_category` block:
```tsx
            {hoverNode.prompt.personal_category && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {hoverNode.prompt.personal_category}
              </div>
            )}
```
Add after it:
```tsx
            {hoverNode.successRate !== undefined && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                הצלחה: {Math.round(hoverNode.successRate * 100)}%
              </div>
            )}
            {hoverNode.score !== undefined && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                ציון: {hoverNode.score}
              </div>
            )}
```

- [ ] **Step 8: TypeScript check**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/features/library/PromptGraphView.tsx
git commit -m "feat(graph): node size + color intensity driven by prompt score"
```

---

## Task 4: Create TagNodePanel component

**Files:**
- Create: `src/components/features/library/TagNodePanel.tsx`

**Context:** This panel slides in from the right when a tag or library hub node is clicked. It shows the prompts associated with that hub and allows tag management. Pattern reference: `PromptNodeCard.tsx` in the same directory uses `useLibraryContext` and `useFavoritesContext`.

- [ ] **Step 1: Create `TagNodePanel.tsx`**

Create `src/components/features/library/TagNodePanel.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { X, Tag, Library, ChevronDown } from "lucide-react";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { CAPABILITY_COLORS } from "./graph-utils";
import { cn } from "@/lib/utils";

const CAPABILITY_LABELS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "רגיל",
  [CapabilityMode.IMAGE_GENERATION]: "תמונות",
  [CapabilityMode.DEEP_RESEARCH]: "מחקר",
  [CapabilityMode.AGENT_BUILDER]: "סוכן",
  [CapabilityMode.VIDEO_GENERATION]: "וידאו",
};

interface TagNodePanelProps {
  nodeId: string;
  nodeType: "tag" | "library";
  nodeLabel: string;
  prompts: PersonalPrompt[];
  onClose: () => void;
  onOpenPrompt: (p: PersonalPrompt) => void;
  onRemoveTag: (promptId: string, tag: string) => void;
  onAddTag: (promptId: string, tag: string) => void;
}

export function TagNodePanel({
  nodeId,
  nodeType,
  nodeLabel,
  prompts,
  onClose,
  onOpenPrompt,
  onRemoveTag,
  onAddTag,
}: TagNodePanelProps) {
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  const tagKey = nodeId.replace(/^tag:/, "");
  const libKey = nodeId.replace(/^lib:/, "");

  const panelPrompts = useMemo(() => {
    if (nodeType === "tag") {
      return prompts.filter((p) =>
        (p.tags ?? []).some((t) => t.trim().toLowerCase() === tagKey),
      );
    }
    // library node
    return prompts.filter(
      (p) => p.source === "library" && (p.reference || p.category || "library") === libKey,
    );
  }, [prompts, nodeType, tagKey, libKey]);

  const untaggedPrompts = useMemo(() => {
    if (nodeType !== "tag") return [];
    return prompts.filter(
      (p) => !(p.tags ?? []).some((t) => t.trim().toLowerCase() === tagKey),
    );
  }, [prompts, nodeType, tagKey]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[140] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[340px] z-[150] flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200/60 dark:border-white/10 shadow-2xl animate-in slide-in-from-right duration-200"
        dir="rtl"
        role="dialog"
        aria-label={nodeLabel}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200/60 dark:border-white/10 shrink-0">
          {nodeType === "tag" ? (
            <Tag className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Library className="w-4 h-4 text-violet-500 shrink-0" />
          )}
          <span className="flex-1 font-semibold text-slate-900 dark:text-white text-sm truncate">
            {nodeLabel}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            {panelPrompts.length} פרומפטים
          </span>
          <button
            onClick={onClose}
            className="p-1 -m-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt list */}
        <div className="flex-1 overflow-y-auto py-2">
          {panelPrompts.length === 0 ? (
            <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-8 px-4">
              אין פרומפטים
            </p>
          ) : (
            panelPrompts.map((p) => {
              const cap = p.capability_mode ?? CapabilityMode.STANDARD;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/4 group transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CAPABILITY_COLORS[cap] }}
                  />
                  <button
                    onClick={() => onOpenPrompt(p)}
                    className="flex-1 text-right text-sm text-slate-800 dark:text-slate-200 truncate hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    title={p.title}
                  >
                    {p.title}
                  </button>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {CAPABILITY_LABELS[cap]}
                  </span>
                  {nodeType === "tag" && (
                    <button
                      onClick={() => onRemoveTag(p.id, tagKey)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-all shrink-0"
                      title="הסר תגית"
                    >
                      הסר
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add tag footer — tag panels only */}
        {nodeType === "tag" && untaggedPrompts.length > 0 && (
          <div className="shrink-0 border-t border-slate-200/60 dark:border-white/10 px-4 py-3">
            <button
              onClick={() => setAddDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <ChevronDown
                className={cn("w-3.5 h-3.5 transition-transform", addDropdownOpen && "rotate-180")}
              />
              הוסף תגית לפרומפטים אחרים
            </button>
            {addDropdownOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {untaggedPrompts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAddTag(p.id, tagKey)}
                    className="text-right text-[12px] px-2 py-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-700 dark:text-slate-300 transition-colors truncate"
                    title={p.title}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/TagNodePanel.tsx
git commit -m "feat(graph): TagNodePanel — interactive side panel for tag and library hub nodes"
```

---

## Task 5: Wire TagNodePanel into PromptGraphView

**Files:**
- Modify: `src/components/features/library/PromptGraphView.tsx`

- [ ] **Step 1: Import TagNodePanel**

At the top of `PromptGraphView.tsx`, after the `PromptNodeCard` import:
```typescript
import { TagNodePanel } from "./TagNodePanel";
```

- [ ] **Step 2: Add `selectedTagNode` state**

Inside `PromptGraphView`, after the `[selectedPrompt, setSelectedPrompt]` state line, add:
```typescript
  const [selectedTagNode, setSelectedTagNode] = useState<{
    type: "tag" | "library";
    id: string;
    label: string;
  } | null>(null);
```

- [ ] **Step 3: Update `handleNodeClick` to handle hub nodes**

Find:
```typescript
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      savePositions();
      if (node.type === "prompt" && node.prompt) {
        setSelectedPrompt((prev) => (prev?.id === node.prompt!.id ? null : node.prompt!));
        setFocusedId((prev) => (prev === node.id ? null : node.id));
      }
    },
    [savePositions],
  );
```
Replace with:
```typescript
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      savePositions();
      if (node.type === "tag" || node.type === "library") {
        setSelectedTagNode((prev) =>
          prev?.id === node.id ? null : { type: node.type as "tag" | "library", id: node.id, label: node.label },
        );
        return;
      }
      if (node.type === "prompt" && node.prompt) {
        setSelectedPrompt((prev) => (prev?.id === node.prompt!.id ? null : node.prompt!));
        setFocusedId((prev) => (prev === node.id ? null : node.id));
      }
    },
    [savePositions],
  );
```

- [ ] **Step 4: Update `handleContainerPointerUp` to also handle hub nodes**

Find inside `handleContainerPointerUp`:
```typescript
      if (clicked && clicked.type === "prompt" && clicked.prompt) {
        savePositions();
        setSelectedPrompt((prev) => (prev?.id === clicked.prompt!.id ? null : clicked.prompt!));
        setFocusedId((prev) => (prev === clicked.id ? null : clicked.id));
      }
```
Replace with:
```typescript
      if (clicked) {
        savePositions();
        if (clicked.type === "tag" || clicked.type === "library") {
          setSelectedTagNode((prev) =>
            prev?.id === clicked.id ? null : { type: clicked.type as "tag" | "library", id: clicked.id, label: clicked.label },
          );
        } else if (clicked.type === "prompt" && clicked.prompt) {
          setSelectedPrompt((prev) => (prev?.id === clicked.prompt!.id ? null : clicked.prompt!));
          setFocusedId((prev) => (prev === clicked.id ? null : clicked.id));
        }
      }
```

- [ ] **Step 5: Close TagNodePanel on background click**

Find `handleBackgroundClick`:
```typescript
  const handleBackgroundClick = useCallback(() => {
    if (!focusedId && !selectedPrompt) return;
    setFocusedId(null);
    setSelectedPrompt(null);
    handleFitView();
  }, [focusedId, selectedPrompt, handleFitView]);
```
Replace with:
```typescript
  const handleBackgroundClick = useCallback(() => {
    if (!focusedId && !selectedPrompt && !selectedTagNode) return;
    setFocusedId(null);
    setSelectedPrompt(null);
    setSelectedTagNode(null);
    handleFitView();
  }, [focusedId, selectedPrompt, selectedTagNode, handleFitView]);
```

- [ ] **Step 6: Render TagNodePanel**

Find the `{selectedPrompt && (` modal block. Immediately before it, add:
```tsx
        {/* Tag / Library hub node panel */}
        {selectedTagNode && (
          <TagNodePanel
            nodeId={selectedTagNode.id}
            nodeType={selectedTagNode.type}
            nodeLabel={selectedTagNode.label}
            prompts={prompts}
            onClose={() => setSelectedTagNode(null)}
            onOpenPrompt={(p) => {
              setSelectedTagNode(null);
              setSelectedPrompt(p);
              setFocusedId(p.id);
            }}
            onRemoveTag={async (promptId, tag) => {
              const p = prompts.find((x) => x.id === promptId);
              if (!p) return;
              const next = (p.tags ?? []).filter((t) => t.trim().toLowerCase() !== tag);
              await updateTags(promptId, next);
            }}
            onAddTag={async (promptId, tag) => {
              const p = prompts.find((x) => x.id === promptId);
              if (!p) return;
              const next = [...(p.tags ?? []), tag];
              await updateTags(promptId, next);
            }}
          />
        )}
```

- [ ] **Step 7: TypeScript check**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/features/library/PromptGraphView.tsx
git commit -m "feat(graph): wire TagNodePanel — tag and library hub nodes are now interactive"
```

---

## Task 6: Manual verification in browser

- [ ] **Step 1: Start dev server**

```bash
cd C:\Users\sasso\dev\Peroot\Prut\web && npm run dev
```

- [ ] **Step 2: Open graph view**

Navigate to `http://localhost:3000`, open personal library, switch to graph view.

- [ ] **Step 3: Verify node sizes vary by score**

Prompts with detailed, well-structured text should appear noticeably larger than single-sentence prompts. Confirm in dark mode and light mode.

- [ ] **Step 4: Verify low-score nodes are muted**

A very short or vague prompt node should appear slightly transparent/muted compared to a high-score one.

- [ ] **Step 5: Verify edge hover tooltip**

Hover over a connection line between two nodes. A tooltip should appear describing the connection (e.g. "תגיות משותפות: שיווק, תוכן").

- [ ] **Step 6: Verify tag node click**

Click an amber tag hub node. The TagNodePanel should slide in from the right listing all prompts with that tag. Verify "הסר" button appears on hover of a row. Verify clicking a prompt row opens the PromptNodeCard modal.

- [ ] **Step 7: Verify library node click**

Click a purple library hub node. Panel should list prompts from that library source.

- [ ] **Step 8: Verify add tag flow**

In a tag panel, expand "הוסף תגית לפרומפטים אחרים" and click a prompt. Verify the prompt appears in the panel list after the tag is added.

- [ ] **Step 9: Verify Escape key still closes**

With tag panel open, press Escape. Panel should close (the existing keyboard handler clears `selectedPrompt` — verify it also clears `selectedTagNode` via the `handleBackgroundClick` flow or add Escape handling).

> **Note:** If Escape doesn't close the TagNodePanel, add `selectedTagNode` to the Escape branch in the `useEffect` keyboard handler: find `setSelectedPrompt(null);` inside the Escape block and add `setSelectedTagNode(null);` after it.

- [ ] **Step 10: Final commit if any fixes applied**

```bash
git add -A
git commit -m "fix(graph): post-verification adjustments"
```
