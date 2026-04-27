# Prompt Graph — Diagnostic Upgrade Design

**Date:** 2026-04-28
**Status:** Approved

---

## Goal

Turn the existing 3D prompt graph from a passive visualization into an active diagnostic tool: prompt quality (score) is encoded in node size, tag/library hubs are interactive, and several existing but broken features are repaired.

## Architecture

No new data sources. All scoring is client-side via `scoreInput()` (already exists in `src/lib/engines/scoring/input-scorer.ts`). Score map is computed in a `useMemo` inside `PromptGraphView` and passed into `buildGraphData`. A new `TagNodePanel` component handles hub-node interactions. Three bug fixes restore dead features.

---

## Files

### Modified
- `src/components/features/library/graph-utils.ts`
  - Add `score?: number` to `GraphNode`
  - `buildGraphData` accepts new param `scoreMap: Map<string, number>`
  - Sets `node.score` from the map
  - Remove `"category"` from `GraphLink["type"]` union (dead type, never created)

- `src/components/features/library/PromptGraphView.tsx`
  - Add `useMemo` to compute `scoreMap` via `scoreInput(p.prompt, p.capability_mode)` for all prompts
  - Pass `scoreMap` to `buildGraphData`
  - Update `nodeVal` callback: `score 0 → 4`, `score 50 → 9`, `score 100 → 18` (linear interpolation)
  - Update `nodeColor`: multiply base capability color alpha/brightness by score ratio so low-score nodes appear more muted
  - Add `selectedTagNode` state: `{ type: "tag" | "library"; id: string; label: string } | null`
  - Update `handleNodeClick`: add branch for `type === "tag"` and `type === "library"` — sets `selectedTagNode` instead of `selectedPrompt`
  - Add `onLinkHover={handleLinkHover as any}` prop to `<ForceGraph3D>` (missing prop — fixes edge hover tooltip)
  - Add `successRate` display to hover tooltip card (e.g. "הצלחה: 73%") when `node.successRate !== undefined`
  - Render `<TagNodePanel>` when `selectedTagNode !== null`

### Created
- `src/components/features/library/TagNodePanel.tsx`
  - Props: `nodeId: string`, `nodeType: "tag" | "library"`, `nodeLabel: string`, `prompts: PersonalPrompt[]`, `onClose: () => void`, `onOpenPrompt: (p: PersonalPrompt) => void`, `onRemoveTag: (promptId: string, tag: string) => void`, `onAddTag: (promptId: string, tag: string) => void`
  - Layout: fixed right-side slide-in panel (RTL), `max-w-[340px]`, `z-[150]` (below graph modal `z-[200]`)
  - Tag panel content: tag name as `#label`, count badge, scrollable list of prompts (title + capability chip + "הסר תגית" button), "+ הוסף תגית לפרומפטים אחרים" dropdown listing prompts not yet tagged
  - Library panel content: source library name, list of prompts from that source with "פתח" button each
  - Clicking a prompt row calls `onOpenPrompt` which sets `selectedPrompt` in the parent (opens existing `PromptNodeCard` modal)
  - Close: X button + click-outside backdrop (same pattern as existing graph modal)

---

## Feature Details

### Score → Node Size

```typescript
// useMemo in PromptGraphView
const scoreMap = useMemo(() => {
  const m = new Map<string, number>();
  for (const p of prompts) {
    const result = scoreInput(p.prompt ?? "", p.capability_mode ?? CapabilityMode.STANDARD);
    m.set(p.id, result.score); // 0–100
  }
  return m;
}, [prompts]);
```

`nodeVal` mapping: `score → Math.max(4, Math.min(18, 4 + (score / 100) * 14))`

Color intensity: `nodeColor` callback returns an rgba string. For score < 40, alpha is reduced to ~0.55 so low-score nodes recede while preserving capability hue. For score ≥ 70, full opacity. ForceGraph3D accepts rgba strings in `nodeColor`.

### Tag Node Click Flow

1. User clicks amber tag hub node
2. `handleNodeClick` detects `node.type === "tag"`, calls `setSelectedTagNode({ type: "tag", id: node.id, label: node.label })`
3. `TagNodePanel` renders with all prompts whose `tags` array contains this tag key
4. User can remove tag → calls `updateTags` from `useLibraryContext`, panel re-derives its list reactively
5. User can click a prompt row → `onOpenPrompt(p)` → sets `selectedPrompt` → opens existing `PromptNodeCard` modal on top

### Library Node Click Flow

Same as tag flow but `nodeType = "library"`. Panel filters `prompts.filter(p => p.source === "library" && (p.reference || p.category) === key)` where `key` is extracted from `node.id` (`lib:${key}`).

### Bug Fixes

| Bug | Fix |
|-----|-----|
| Edge hover tooltip never fires | Add `onLinkHover={handleLinkHover as any}` to `<ForceGraph3D>` |
| `successRate` computed but invisible | Show in hover tooltip: `הצלחה: ${Math.round(n.successRate * 100)}%` |
| `"category"` in `GraphLink["type"]` union but never created | Remove from union |

---

## Out of Scope

- **Cluster hull overlay** (`computeClusters`/`convexHull`/`expandHull`): implemented in graph-utils but requires THREE.js mesh projection for 3D screen coordinates — separate task.
- Any backend changes — all data is already available client-side.
- Redesigning the 3D renderer or switching to 2D.

---

## Success Criteria

1. Node size visibly varies with prompt score — a prompt scored 90 is noticeably larger than one scored 30
2. Clicking a tag hub opens a side panel listing all tagged prompts with remove/add-tag actions
3. Clicking a library hub opens a side panel listing sourced prompts
4. Hovering an edge shows the tooltip describing the connection reason
5. `successRate` appears in the hover card when data exists
6. No TypeScript errors, no regressions in existing graph interactions (drag, filter, search, PromptNodeCard)
