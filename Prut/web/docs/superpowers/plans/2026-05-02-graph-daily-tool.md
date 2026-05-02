> STATUS: ✅ DONE — verified against codebase 2026-05-02

# Graph Daily Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Today in your library" insight overlay, smart filter chips, node ghosting, daily pick highlight, permanent node labels, and stats HUD upgrade to the personal library graph view.

**Architecture:** All computation is client-side from the existing `prompts` prop — no new API routes. `computeInsights()` is added to `graph-utils.ts` to centralize the per-session metrics. A new `GraphInsightOverlay` component renders the entry overlay. `PromptGraphView` is extended with insight state, filter chips, and `nodeThreeObject` callbacks for Three.js visual effects.

**Tech Stack:** React 19, TypeScript 5, `react-force-graph-3d`, `three` (already in node_modules via transitive dep), Vitest, Tailwind 4.

---

## File Map

| File | Change |
|---|---|
| `src/components/features/library/graph-utils.ts` | Add `InsightFilter` type, `GraphInsights` interface, `computeInsights()` function |
| `src/components/features/library/__tests__/graph-utils.test.ts` | Add tests for `computeInsights()` |
| `src/components/features/library/GraphInsightOverlay.tsx` | New — overlay component |
| `src/components/features/library/PromptGraphView.tsx` | Import overlay + types, add insight state, filter chips, nodeColor ghosting, nodeThreeObject, HUD upgrade |

---

## Task 1: `computeInsights()` + types in `graph-utils.ts`

**Files:**
- Modify: `src/components/features/library/graph-utils.ts`
- Test: `src/components/features/library/__tests__/graph-utils.test.ts`

- [ ] **Step 1: Install `three` and its types as direct dependencies**

Run:
```bash
npm install three @types/three
```
Expected: `three` and `@types/three` appear in `package.json` dependencies.

- [ ] **Step 2: Write failing tests for `computeInsights()`**

Append to `src/components/features/library/__tests__/graph-utils.test.ts`:

```ts
import { computeInsights, type GraphInsights } from "../graph-utils";

const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

describe("computeInsights", () => {
  it("marks prompts not used in 30+ days as underused", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const { underusedIds, underusedCount } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(underusedIds.has("p1")).toBe(true);
    expect(underusedCount).toBe(1);
  });

  it("marks never-used prompts older than 14 days as underused", () => {
    const p = makePrompt("p1", {
      last_used_at: null,
      created_at: new Date(Date.now() - FIFTEEN_DAYS_MS).toISOString(),
    });
    const { underusedIds } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(underusedIds.has("p1")).toBe(true);
  });

  it("does NOT mark recently used prompts as underused", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
    });
    const { underusedIds } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(underusedIds.has("p1")).toBe(false);
  });

  it("marks prompts with score < 60 as low_score", () => {
    const p1 = makePrompt("p1");
    const p2 = makePrompt("p2");
    const { lowScoreIds, lowScoreCount } = computeInsights(
      [p1, p2],
      [],
      new Map([["p1", 59], ["p2", 60]]),
    );
    expect(lowScoreIds.has("p1")).toBe(true);
    expect(lowScoreIds.has("p2")).toBe(false);
    expect(lowScoreCount).toBe(1);
  });

  it("marks prompts used within 7 days as recent", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
    });
    const { recentIds } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(recentIds.has("p1")).toBe(true);
  });

  it("collects clustered IDs from clusters", () => {
    const p1 = makePrompt("p1");
    const p2 = makePrompt("p2");
    const cluster = {
      clusterId: "c1",
      nodeIds: ["p1", "p2"],
      label: "test",
      color: "#f59e0b",
      capability: CapabilityMode.STANDARD,
    };
    const { clusteredIds, clusterCount } = computeInsights([p1, p2], [cluster], new Map());
    expect(clusteredIds.has("p1")).toBe(true);
    expect(clusteredIds.has("p2")).toBe(true);
    expect(clusterCount).toBe(1);
  });

  it("picks the highest-score underused prompt as dailyPickId", () => {
    const p1 = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const p2 = makePrompt("p2", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const { dailyPickId } = computeInsights([p1, p2], [], new Map([["p1", 65], ["p2", 80]]));
    expect(dailyPickId).toBe("p2");
  });

  it("returns dailyPickId null when no prompts are underused", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
    });
    const { dailyPickId } = computeInsights([p], [], new Map([["p1", 80]]));
    expect(dailyPickId).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/components/features/library/__tests__/graph-utils.test.ts
```
Expected: `computeInsights is not a function` or similar import error.

- [ ] **Step 4: Add `InsightFilter`, `GraphInsights`, and `computeInsights()` to `graph-utils.ts`**

Add after the `GraphCluster` interface (after line 387), before the `makeUF` function:

```ts
/** One of the four insight lenses the user can activate as a filter chip. */
export type InsightFilter = "underused" | "clusters" | "low_score" | "recent";

export interface GraphInsights {
  underusedCount: number;
  underusedIds: Set<string>;
  clusterCount: number;
  clusteredIds: Set<string>;
  lowScoreCount: number;
  lowScoreIds: Set<string>;
  recentCount: number;
  recentIds: Set<string>;
  /** ID of the highest-score underused prompt — shown as "daily pick" in the overlay. */
  dailyPickId: string | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Compute per-session insight metrics from the prompt list.
 * Pure function — no side effects, safe to call in useMemo.
 */
export function computeInsights(
  prompts: PersonalPrompt[],
  clusters: GraphCluster[],
  scoreMap: Map<string, number>,
): GraphInsights {
  const now = Date.now();
  const underusedIds = new Set<string>();
  const lowScoreIds = new Set<string>();
  const recentIds = new Set<string>();
  let dailyPickId: string | null = null;
  let dailyPickScore = -1;

  for (const p of prompts) {
    const lastUsed = p.last_used_at ? new Date(p.last_used_at as string).getTime() : null;
    const createdAt = new Date(p.created_at as string).getTime();
    const score = scoreMap.get(p.id) ?? 50;

    const isUnderused =
      lastUsed !== null ? now - lastUsed > THIRTY_DAYS_MS : now - createdAt > FOURTEEN_DAYS_MS;

    if (isUnderused) {
      underusedIds.add(p.id);
      if (score > dailyPickScore) {
        dailyPickScore = score;
        dailyPickId = p.id;
      }
    }

    if (score < 60) lowScoreIds.add(p.id);
    if (lastUsed !== null && now - lastUsed <= SEVEN_DAYS_MS) recentIds.add(p.id);
  }

  const clusteredIds = new Set<string>();
  for (const c of clusters) {
    for (const id of c.nodeIds) clusteredIds.add(id);
  }

  return {
    underusedCount: underusedIds.size,
    underusedIds,
    clusterCount: clusters.length,
    clusteredIds,
    lowScoreCount: lowScoreIds.size,
    lowScoreIds,
    recentCount: recentIds.size,
    recentIds,
    dailyPickId,
  };
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/components/features/library/__tests__/graph-utils.test.ts
```
Expected: All tests pass (including the new `computeInsights` suite).

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/features/library/graph-utils.ts src/components/features/library/__tests__/graph-utils.test.ts package.json package-lock.json
git commit -m "feat(graph): add computeInsights() helper with underused/cluster/score/recent metrics"
```

---

## Task 2: `GraphInsightOverlay` component

**Files:**
- Create: `src/components/features/library/GraphInsightOverlay.tsx`

- [ ] **Step 1: Create the overlay component**

Create `src/components/features/library/GraphInsightOverlay.tsx`:

```tsx
"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonalPrompt } from "@/lib/types";
import type { GraphInsights, InsightFilter } from "./graph-utils";

interface GraphInsightOverlayProps {
  insights: GraphInsights;
  dailyPick: PersonalPrompt | null;
  onFilter: (filter: InsightFilter) => void;
  onOpenDailyPick: (p: PersonalPrompt) => void;
  onDismiss: () => void;
}

export function GraphInsightOverlay({
  insights,
  dailyPick,
  onFilter,
  onOpenDailyPick,
  onDismiss,
}: GraphInsightOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-in fade-in duration-300"
      dir="rtl"
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-serif text-white">✨ הספרייה שלך היום</h2>
          <button
            onClick={onDismiss}
            className="p-1 -m-1 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Daily pick */}
        {dailyPick && (
          <button
            onClick={() => {
              onOpenDailyPick(dailyPick);
              onDismiss();
            }}
            className="w-full mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors text-right cursor-pointer"
          >
            <span className="text-xl shrink-0">💎</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-amber-400 font-semibold mb-0.5">
                פרומפט שכדאי לגלות מחדש
              </div>
              <div className="text-sm text-white truncate">{dailyPick.title}</div>
            </div>
          </button>
        )}

        {/* Insight filter cards */}
        <div className="flex flex-col gap-2">
          <InsightCard
            icon="📬"
            count={insights.underusedCount}
            label="פרומפטים שלא השתמשת בהם 30 יום"
            filter="underused"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
          <InsightCard
            icon="🔵"
            count={insights.clusterCount}
            label="אשכולות שגילית בספרייה שלך"
            filter="clusters"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
          <InsightCard
            icon="⚠️"
            count={insights.lowScoreCount}
            label="פרומפטים עם ציון נמוך מ-60"
            filter="low_score"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
          <InsightCard
            icon="🕐"
            count={insights.recentCount}
            label="פרומפטים בהם השתמשת השבוע"
            filter="recent"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full mt-4 py-2.5 rounded-xl border border-white/15 text-sm text-slate-300 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
        >
          צלול לגרף ←
        </button>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  count,
  label,
  filter,
  onFilter,
  onDismiss,
}: {
  icon: string;
  count: number;
  label: string;
  filter: InsightFilter;
  onFilter: (f: InsightFilter) => void;
  onDismiss: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      onClick={() => {
        if (!disabled) {
          onFilter(filter);
          onDismiss();
        }
      }}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-colors w-full",
        disabled
          ? "border-white/8 bg-white/3 opacity-50 cursor-not-allowed"
          : "border-white/12 bg-white/6 hover:bg-white/12 hover:border-white/20 cursor-pointer",
      )}
    >
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">
          <span className="font-bold text-amber-400">{count}</span> {label}
        </span>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/GraphInsightOverlay.tsx
git commit -m "feat(graph): add GraphInsightOverlay component"
```

---

## Task 3: Insight filter chips + node ghosting in `PromptGraphView`

**Files:**
- Modify: `src/components/features/library/PromptGraphView.tsx`

This task wires the insight filter state into the existing filter bar and node color callback. The overlay is NOT wired yet (that's Task 4).

- [ ] **Step 1: Update imports in `PromptGraphView.tsx`**

Replace the existing import from `./graph-utils`:

```ts
import {
  buildGraphData,
  computeClusters,
  computeInsights,
  CAPABILITY_COLORS,
  CAPABILITY_HIGHLIGHT,
  type GraphNode,
  type GraphLink,
  type GraphCluster,
  type GraphInsights,
  type InsightFilter,
} from "./graph-utils";
```

- [ ] **Step 2: Add insight filter state after the existing `favOnly` state (around line 93)**

```ts
// Insight filter chips — "underused" | "clusters" | "low_score" | "recent"
const [activeInsightFilters, setActiveInsightFilters] = useState<Set<InsightFilter>>(new Set());
```

- [ ] **Step 3: Add clusters and insights memos after the existing `scoreMap` memo (around line 174)**

Add these two memos immediately after the `scoreMap` useMemo block:

```ts
const clusters = useMemo(
  () => computeClusters(prompts, graphData.links),
  [prompts, graphData.links],
);

const insights = useMemo(
  () => computeInsights(prompts, clusters, scoreMap),
  [prompts, clusters, scoreMap],
);
```

- [ ] **Step 4: Add `insightMatchedIds` memo after the existing `matchedIds` memo (around line 221)**

```ts
// IDs that satisfy ALL active insight filters (intersection logic). null = no insight filter active.
const insightMatchedIds = useMemo<Set<string> | null>(() => {
  if (activeInsightFilters.size === 0) return null;
  const result = new Set<string>();
  for (const p of prompts) {
    let match = true;
    for (const f of activeInsightFilters) {
      if (f === "underused" && !insights.underusedIds.has(p.id)) {
        match = false;
        break;
      }
      if (f === "clusters" && !insights.clusteredIds.has(p.id)) {
        match = false;
        break;
      }
      if (f === "low_score" && !insights.lowScoreIds.has(p.id)) {
        match = false;
        break;
      }
      if (f === "recent" && !insights.recentIds.has(p.id)) {
        match = false;
        break;
      }
    }
    if (match) result.add(p.id);
  }
  return result;
}, [activeInsightFilters, insights, prompts]);
```

- [ ] **Step 5: Add the `toggleInsightFilter` callback after the `dismissBanner` callback (around line 133)**

```ts
const toggleInsightFilter = useCallback((filter: InsightFilter) => {
  setActiveInsightFilters((prev) => {
    const next = new Set(prev);
    if (next.has(filter)) next.delete(filter);
    else next.add(filter);
    return next;
  });
}, []);
```

- [ ] **Step 6: Update `nodeColor` in the ForceGraph3D props to apply insight ghosting**

Find the existing `nodeColor` prop (around line 923) and replace it with:

```tsx
nodeColor={
  ((n: GraphNode) => {
    if (n.type === "tag") {
      return insightMatchedIds ? hexToRgba("#f59e0b", 0.35) : "#f59e0b";
    }
    if (n.type === "library") {
      return insightMatchedIds ? hexToRgba("#a855f7", 0.35) : "#a855f7";
    }
    const hex = CAPABILITY_COLORS[n.capability ?? CapabilityMode.STANDARD];
    const s = n.score ?? 50;
    const scoreAlpha = s < 40 ? 0.55 : s < 70 ? 0.55 + ((s - 40) / 30) * 0.45 : 1.0;
    // Insight filter: ghost non-matching nodes to near-invisible
    if (insightMatchedIds && !insightMatchedIds.has(n.id)) {
      return hexToRgba(hex, 0.12);
    }
    return scoreAlpha >= 1.0 ? hex : hexToRgba(hex, scoreAlpha);
  }) as any
}
```

- [ ] **Step 7: Add the insight filter chip row to the filter bar JSX**

Find the section of JSX containing the capability filter chips (the `Object.entries(CAPABILITY_COLORS).map(...)` section, which renders as a `flex flex-wrap gap-2` row). Add the following insight chip row **directly below** that capability chips row (before the favorites toggle or closing div):

```tsx
{/* Insight filter chips — second row */}
{[
  { filter: "underused" as InsightFilter, icon: "📬", label: "לא בשימוש", count: insights.underusedCount },
  { filter: "clusters" as InsightFilter, icon: "🔵", label: "אשכולות", count: insights.clusterCount },
  { filter: "low_score" as InsightFilter, icon: "⚠️", label: "ציון נמוך", count: insights.lowScoreCount },
  { filter: "recent" as InsightFilter, icon: "🕐", label: "השבוע", count: insights.recentCount },
].map(({ filter, icon, label, count }) => {
  const active = activeInsightFilters.has(filter);
  return (
    <button
      key={filter}
      onClick={() => toggleInsightFilter(filter)}
      disabled={count === 0}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] transition-all cursor-pointer shrink-0",
        active
          ? "bg-amber-500 border-amber-500 text-black font-semibold"
          : count === 0
            ? "border-white/8 bg-white/3 text-slate-600 cursor-not-allowed opacity-50"
            : "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:border-amber-500/30 hover:text-amber-500",
      )}
      aria-pressed={active}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span
          className={cn(
            "rounded-full px-1 font-mono tabular-nums",
            active ? "bg-black/20 text-black" : "bg-white/10 text-slate-400",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
})}
```

- [ ] **Step 8: Add a "clear insight filters" button that appears when any insight filter is active**

Add this directly after the insight chips row (still inside the filter bar flex container):

```tsx
{activeInsightFilters.size > 0 && (
  <button
    onClick={() => setActiveInsightFilters(new Set())}
    className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/15 bg-white/8 text-[11px] text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
  >
    <X className="w-3 h-3" />
    <span>נקה</span>
  </button>
)}
```

- [ ] **Step 9: Typecheck and run tests**

```bash
npm run typecheck && npx vitest run src/components/features/library/__tests__/graph-utils.test.ts
```
Expected: No type errors, all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/features/library/PromptGraphView.tsx
git commit -m "feat(graph): add insight filter chips and node ghosting"
```

---

## Task 4: Overlay wiring + daily pick highlight + permanent labels + stats HUD

**Files:**
- Modify: `src/components/features/library/PromptGraphView.tsx`

- [ ] **Step 1: Add the overlay import to `PromptGraphView.tsx`**

Add to the import block at the top of the file:

```ts
import * as THREE from "three";
import { GraphInsightOverlay } from "./GraphInsightOverlay";
```

- [ ] **Step 2: Add overlay session state (after the existing `showHint` effect block, around line 117)**

```ts
// "Today in your library" overlay — shown once per browser session
const [showInsightOverlay, setShowInsightOverlay] = useState(false);
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    if (!sessionStorage.getItem("peroot:graph-overlay-seen")) {
      setShowInsightOverlay(true);
    }
  } catch {}
}, []);

const dismissInsightOverlay = useCallback(() => {
  setShowInsightOverlay(false);
  try {
    sessionStorage.setItem("peroot:graph-overlay-seen", "1");
  } catch {}
}, []);
```

- [ ] **Step 3: Add `dailyPick` memo (after the `insights` memo)**

```ts
const dailyPick = useMemo(
  () => (insights.dailyPickId ? (prompts.find((p) => p.id === insights.dailyPickId) ?? null) : null),
  [insights.dailyPickId, prompts],
);
```

- [ ] **Step 4: Add `makeTextSprite` helper — module-level function, above the component**

Add this function **above** the `PromptGraphView` function declaration (not inside it):

```ts
/** Creates a Three.js sprite with canvas-drawn text — used for permanent node labels. */
function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();
  ctx.clearRect(0, 0, 256, 48);
  ctx.font = "bold 20px sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.length > 22 ? text.slice(0, 22) + "…" : text, 128, 24);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(28, 8, 1);
  sprite.position.set(0, 14, 0); // float above the node sphere
  return sprite;
}
```

- [ ] **Step 5: Add `nodeThreeObject` and `nodeThreeObjectExtend` props to the ForceGraph3D component**

Add these two props to the `<ForceGraph3D>` element (inside its JSX, alongside the existing `nodeColor`, `nodeVal` etc. props):

```tsx
nodeThreeObjectExtend={true}
nodeThreeObject={
  ((n: GraphNode) => {
    if (n.type !== "prompt") return undefined;
    const isDailyPick = n.id === insights.dailyPickId;
    const hasLabel = (n.score ?? 0) > 75 || !!n.isFavorite;
    if (!isDailyPick && !hasLabel) return undefined;

    const group = new THREE.Group();

    if (isDailyPick) {
      // Amber wireframe sphere slightly larger than the node
      const nodeRadius = Math.max(4, Math.min(18, 4 + ((n.score ?? 50) / 100) * 14));
      const wire = new THREE.Mesh(
        new THREE.SphereGeometry(nodeRadius + 4, 16, 8),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          wireframe: true,
          transparent: true,
          opacity: 0.65,
        }),
      );
      group.add(wire);
    }

    if (hasLabel) {
      group.add(makeTextSprite(n.label));
    }

    return group;
  }) as any
}
```

- [ ] **Step 6: Upgrade the stats HUD (the "node count hint" div, around line 1093)**

Find the existing stats HUD:
```tsx
<div className="hidden sm:block absolute top-3 right-3 bg-white/80 dark:bg-black/55 backdrop-blur-sm text-slate-600 dark:text-slate-400 text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/8 z-10 select-none leading-tight">
  <div>{prompts.length} פרומפטים</div>
  <div className="text-slate-400 dark:text-slate-500">גלגלת להגדלה · גרור להזזה</div>
</div>
```

Replace it with:

```tsx
<button
  onClick={() => {
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("peroot:graph-overlay-seen"); } catch {}
    }
    setShowInsightOverlay(true);
  }}
  className="hidden sm:block absolute top-3 right-3 bg-white/80 dark:bg-black/55 backdrop-blur-sm text-slate-600 dark:text-slate-400 text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/8 z-10 select-none leading-tight hover:bg-white/90 dark:hover:bg-black/65 transition-colors cursor-pointer text-right"
  aria-label="פתח סיכום יומי"
>
  <div className="font-medium">
    {prompts.length} פרומפטים
    {insights.clusterCount > 0 && ` · ${insights.clusterCount} אשכולות`}
    {insights.underusedCount > 0 && ` · ${insights.underusedCount} לא בשימוש`}
  </div>
  <div className="text-slate-400 dark:text-slate-500">גלגלת להגדלה · גרור להזזה · לחץ לסיכום</div>
</button>
```

Note: Making the HUD a button that re-opens the overlay (by clearing the sessionStorage flag) gives daily re-access without a full page reload.

- [ ] **Step 7: Render the `GraphInsightOverlay` in the JSX**

Find the div that wraps the entire graph area (the one with `"relative w-full overflow-hidden..."` or similar). Add the overlay render as the **first child** of that wrapper div, before the filter bar:

```tsx
{showInsightOverlay && (
  <GraphInsightOverlay
    insights={insights}
    dailyPick={dailyPick}
    onFilter={(filter) => {
      setActiveInsightFilters(new Set([filter]));
    }}
    onOpenDailyPick={(p) => {
      setSelectedPrompt(p);
      setFocusedId(p.id);
    }}
    onDismiss={dismissInsightOverlay}
  />
)}
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```
Expected: No errors. If `THREE` types are missing for any method, add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` above the cast line.

- [ ] **Step 9: Manual smoke test in the browser**

```bash
npm run dev
```

Open http://localhost:3000, navigate to the personal library → graph view.

Verify:
1. The "Today in your library" overlay appears on first load
2. Clicking an insight card dismisses overlay and activates that filter chip (chips in the bar turn amber)
3. The daily pick card (💎) opens the PromptNodeCard for that prompt
4. With a filter active, non-matching nodes ghost to near-invisible
5. Clicking "צלול לגרף" dismisses with no filter change
6. Clicking the stats HUD (top-right) re-opens the overlay
7. Navigating away and back in the same tab: overlay does NOT appear again (sessionStorage guard)
8. Refreshing the page: overlay appears again
9. Nodes with score > 75 or marked as favorite show a floating text label in 3D
10. The daily pick node has a wireframe amber ring around it

- [ ] **Step 10: Commit**

```bash
git add src/components/features/library/PromptGraphView.tsx
git commit -m "feat(graph): add daily pick ring, permanent labels, insight overlay, HUD upgrade"
```

- [ ] **Step 11: Push**

```bash
git push
```
