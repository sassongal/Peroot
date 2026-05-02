# Graph Daily Tool — Design Spec

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** Personal library graph view — accessibility, daily utility, visual polish

---

## Goal

Transform the personal library graph from a decorative visualization into a daily-use tool that helps users discover forgotten prompts and understand patterns in their own library — while keeping the 3D visual experience.

---

## Architecture

All new logic is computed client-side from the existing `prompts` prop — no new API calls. Three layers are added on top of the current `PromptGraphView`:

1. **Entry overlay** — session-scoped insight summary shown on mount
2. **Insight filter chips** — second row of filter chips, node dimming via alpha channel
3. **Visual polish** — daily pick node highlight, permanent labels for top nodes, stats HUD upgrade

No changes to `buildGraphData` or the backend. `graph-utils.ts` gets `computeInsights()` added.

---

## Files

| File | Change |
|---|---|
| `src/components/features/library/PromptGraphView.tsx` | All three feature layers added here |
| `src/components/features/library/GraphInsightOverlay.tsx` | New — extracted overlay component |
| `src/components/features/library/graph-utils.ts` | Add `computeInsights()` helper |

---

## Section 1 — "Today in your library" Entry Overlay

### Component: `GraphInsightOverlay`

Shown once per session (via `sessionStorage` key `peroot-graph-overlay-seen`). Renders as a centered modal over the 3D graph (graph renders behind, blurred via backdrop-filter on the overlay wrapper).

### Layout (RTL)

```
┌─────────────────────────────────────────────┐
│         ✨ הספרייה שלך היום                 │
│                                             │
│  [📬 4 פרומפטים שלא השתמשת בהם 30 יום]    │
│  [💎 כותרת פרומפט מומלץ  ←  גלה מחדש]     │
│  [🔵 3 אשכולות חזקים בספרייה שלך]         │
│  [⚠️ 2 פרומפטים עם ציון נמוך מ-60]        │
│  [🕐 5 פרומפטים בהם השתמשת השבוע]          │
│                                             │
│     [סינון ישיר]    [צלול לגרף →]          │
└─────────────────────────────────────────────┘
```

### Props

```ts
interface GraphInsightOverlayProps {
  insights: GraphInsights;
  dailyPick: PersonalPrompt | null;
  onFilter: (filter: InsightFilter) => void;
  onDismiss: () => void;
}
```

### Behavior

- Each insight card is a `<button>` — clicking calls `onFilter(type)` then `onDismiss()`
- "צלול לגרף" calls `onDismiss()` with no filter change
- Cards with count 0 are still shown but grayed out (not clickable)
- Animate in: `animate-in fade-in zoom-in-95 duration-300`
- Daily pick card opens `PromptNodeCard` directly when clicked

---

## Section 2 — Insight Filter Chips

### `InsightFilter` type

```ts
type InsightFilter = "underused" | "clusters" | "low_score" | "recent" | null;
```

Multiple chips can be active simultaneously — intersection logic.

### Chip row placement

Below the existing capability chips, above the graph canvas. Same `flex-wrap gap-2` pattern as capability chips.

### Chip labels

| Filter | Label | Icon | Condition |
|---|---|---|---|
| `underused` | לא בשימוש | 📬 | `last_used_at` > 30 days ago OR (never used AND created > 14 days ago) |
| `clusters` | אשכולות | 🔵 | node belongs to a cluster (groupId set by `computeClusters`) |
| `low_score` | ציון נמוך | ⚠️ | `score < 60` |
| `recent` | השבוע | 🕐 | `last_used_at` within 7 days |

### Node dimming

When any chip is active, `nodeColor` callback returns:
- **Matching nodes:** full color (current behavior)
- **Non-matching prompt nodes:** `hexToRgba(color, 0.12)` — near-invisible ghost
- **Tag/library nodes:** `hexToRgba(color, 0.35)` — dimmed but visible for context

Active chips are ANDed — a node must satisfy all active chips to be "matching."

---

## Section 3 — Visual Polish + Daily Pick

### Daily pick

Computed on mount from `prompts`:
- Candidate: `score` is highest among prompts where `last_used_at > 21 days` OR `last_used_at === null && created_at > 14 days ago`
- Stored in `dailyPickRef` (persists across re-renders, not recomputed on filter changes)
- In graph: that node gets a custom `nodeThreeObject` — a `THREE.Mesh` with `THREE.SphereGeometry` (wireframe) slightly larger than the node sphere, amber color (`#f59e0b`), animated rotation via `onEngineTick`
- In overlay: appears as its own card with prompt title truncated to 40 chars

### Permanent node labels

Nodes with `score > 75` OR `isFavorite === true` get a permanent sprite label above them using `nodeThreeObjectExtend: true` + a `THREE.Sprite` with canvas-drawn text. Label text = `n.label` truncated to 24 chars. Font: 10px, white with dark shadow.

Nodes without permanent labels continue to show hover-only tooltip (existing behavior).

### Stats HUD upgrade

Current: `12 פרומפטים · גלגלת להגדלה · גרור להזזה`

New (desktop):
```
12 פרומפטים · 3 אשכולות · 4 לא בשימוש
גלגלת להגדלה · גרור להזזה
```

Mobile: HUD becomes a tappable pill that re-opens the insight overlay.

---

## `computeInsights()` helper

Added to `graph-utils.ts`:

```ts
export interface GraphInsights {
  underusedCount: number;
  underusedIds: Set<string>;
  clusterCount: number;
  clusteredIds: Set<string>;
  lowScoreCount: number;
  lowScoreIds: Set<string>;
  recentCount: number;
  recentIds: Set<string>;
}

export function computeInsights(prompts: PersonalPrompt[], clusters: GraphCluster[]): GraphInsights
```

Computed once on mount (useMemo), passed into both the overlay and the filter chip logic.

---

## What is NOT in scope

- No new API routes or Supabase queries
- No changes to `buildGraphData` edge logic
- No starfield background (deferred — too risky for WebGL performance)
- No 2D mode

---

## Verification checklist

1. Open graph → overlay appears with correct counts
2. Click an insight card → overlay closes, matching chips activate, non-matching nodes ghost
3. Click daily pick card → PromptNodeCard opens for that prompt
4. Refresh page → overlay appears again (new session)
5. Close tab, reopen → overlay appears again
6. Navigate away and back within session → overlay does NOT appear again
7. Top-score/favorite nodes show permanent labels in 3D space
8. Stats HUD shows cluster + underused counts
9. Mobile: tapping HUD pill re-opens overlay
10. `npm run typecheck` — clean
