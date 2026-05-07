# Graph Memory Palace — Design Spec

**Date:** 2026-05-07
**Status:** Approved (brainstorming)
**Scope:** Transform the prompt graph from a destination view into a contextual "Memory Palace" — a peripheral tool that surfaces forgotten prompts in the moment of need.
**Supersedes context (does not replace):** `2026-05-02-graph-daily-tool-design.md` (insight overlay) — that spec stays as-is for the full graph view; this spec adds a new entry surface alongside it.

---

## Problem

The current graph at `/library` (graph view mode) is a beautiful destination. Users open it once, are impressed, and rarely return. There is **zero analytics instrumentation** on the graph today, so we cannot measure usage — but qualitative signal (and the broader product brief) confirms it functions as a "gadget" rather than a daily tool.

We want the graph to answer one specific question, every day:

> **"Where was that prompt I wrote about X?"**

This is the **Memory Palace** job-to-be-done. The user remembers a fragment (a topic, a client, a session) and wants to navigate via *shape and proximity* rather than by keyword search.

---

## Decision Log

| # | Decision | Alternatives | Why |
|---|---|---|---|
| 1 | **Job = Memory Palace only** | A+D combo (Memory + Quality Auditor); standalone Quality Auditor | Quality Auditor mixes two concerns and dilutes the value prop. Ship Memory Palace first; Quality Auditor can be a separate sprint later. |
| 2 | **Desktop = always-on collapsible sidebar** | Standalone destination page; on-demand modal | Sidebar makes the graph peripheral, not a destination. Always-on means users notice connections without seeking them. Collapsible respects users who want focus. |
| 3 | **Mobile = 50% bottom drawer with animation** | Full-screen drawer; per-card modal | 50% lets the user keep context (the prompt list above stays visible). Animation telegraphs "this is a peek, not a navigation." |
| 4 | **Trigger = prompt click/open** | Hover; current filter; ambient | Hover causes flicker. Filter-driven is a different mental model. Click = explicit user intent. |
| 5 | **Edges = similarity + co-occurrence only** | All 6 current edge types; tags+category only | Tags/category are already the visual *grouping* (color). Edges should reveal non-obvious connections. Similarity surfaces semantic neighbors; co-occurrence surfaces workflow neighbors. |
| 6 | **2D rendering for mini-graph** | Reuse `react-force-graph-3d` | 15-20 nodes don't need 3D. 2D SVG/Canvas is faster, lighter, more readable on mobile. The big graph view keeps 3D. |
| 7 | **Analytics is a release blocker** | Ship and add later | Without instrumentation we cannot measure success. PostHog events ship in Sprint 1. |
| 8 | **Big graph view stays** | Replace it | It's still useful for power users and onboarding. Mini-graph is additive. |

---

## Architecture

### Three components, one shared engine

```
┌────────────────────────────────────────────────────────────────┐
│                  PersonalLibraryView                            │
│  ┌─────────────────────────────┐  ┌──────────────────────┐    │
│  │  Existing prompt grid/list  │  │  MemoryPalaceSidebar │    │
│  │                             │  │  (desktop only)       │    │
│  │  • PromptCard               │  │                       │    │
│  │  • on-click → setSelectedId │◄─┤  ┌────────────────┐  │    │
│  │                             │  │  │ MiniGraph 2D   │  │    │
│  │  • on-mobile-click          │  │  │ (15-20 nodes)  │  │    │
│  │    → open drawer            │  │  └────────────────┘  │    │
│  └─────────────────────────────┘  │                       │    │
│            │                       │  collapsible / fixed  │    │
│            ▼                       └──────────────────────┘    │
│  ┌─────────────────────────────┐                                │
│  │  MemoryPalaceDrawer         │  (mobile only)                 │
│  │  50% bottom-anchored        │                                │
│  │  ┌────────────────┐         │                                │
│  │  │ MiniGraph 2D   │         │                                │
│  │  └────────────────┘         │                                │
│  └─────────────────────────────┘                                │
└────────────────────────────────────────────────────────────────┘
                       │
                       ▼
        ┌────────────────────────────┐
        │  computeNeighborhood()     │  ← shared engine
        │  in graph-utils.ts         │
        │                            │
        │  inputs:  prompts[],       │
        │           selectedId,      │
        │           usage_events     │
        │  output:  { nodes, links } │
        │           ≤20 nodes        │
        └────────────────────────────┘
```

### Data flow

1. User clicks a `PromptCard` in the library → `setSelectedPromptId(id)`
2. Desktop: `MemoryPalaceSidebar` reads `selectedPromptId` from context, calls `computeNeighborhood(prompts, id, usageEvents)`
3. Mobile: same but inside a drawer triggered by an explicit "🕸️ הצג קשרים" tap
4. The mini-graph renders; clicking a node calls `setSelectedPromptId(neighborId)` → graph re-computes around the new center
5. Double-click a node → opens the prompt itself (existing `PromptNodeCard`)

### Non-functional requirements

| Property | Target | Notes |
|---|---|---|
| Time-to-first-paint of mini-graph | <150ms after click | All compute is client-side, no network |
| Max nodes rendered | 20 (1 center + 19 neighbors) | Hard cap. Excess neighbors fall off ranked by score. |
| Memory footprint | <5MB on mobile | 2D Canvas, no Three.js |
| Bundle impact | <15KB gzipped | Reuse `graph-utils.ts`; new components are thin |
| Accessibility | Full keyboard nav, screen-reader fallback list | Each neighbor is also a focusable list item |
| Privacy | Zero PII in analytics events | Only IDs, counts, edge types — no prompt content |

---

## Component Specs

### 1. `MemoryPalaceSidebar` (desktop)

**Path:** `src/components/features/library/memory-palace/MemoryPalaceSidebar.tsx`

**Layout (LTR for diagram clarity, RTL in app):**

```
┌────────────────────────────────┐ ◄ collapsed: 32px wide, vertical "🕸️ קשרים" label
│  🕸️  קרבה                  [×]│ ◄ expanded: 320px wide, header
├────────────────────────────────┤
│                                │
│         ●  ← center (gold)     │
│       /   \                    │
│     ●       ●                  │
│   /   \   /   \                │
│  ●     ● ●     ●               │
│                                │
│  [Mini-graph 2D, 280×280px]    │
│                                │
├────────────────────────────────┤
│  שכנים (12):                   │
│  ┌──────────────────────────┐  │
│  │ • פרומפט A    similarity │  │
│  │ • פרומפט B    co-used    │  │
│  │ • פרומפט C    similarity │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

**State management:**
- `isCollapsed: boolean` — persisted to `localStorage` key `peroot_palace_collapsed`
- `selectedPromptId: string | null` — from `LibraryContext` (new field)
- Hydration-safe: starts `isCollapsed: false`, post-mount `useEffect` reads localStorage

**Empty states:**
- No prompt selected → "בחר פרומפט בספרייה כדי לראות את השכונה שלו"
- Selected prompt has no neighbors → "אין עדיין מספיק נתונים. נסה פרומפט אחר או המתן."
- User has <5 prompts total → entire sidebar hidden (graph needs critical mass)

**Animation:**
- Collapse/expand: `transition: width 200ms ease-out`
- Graph re-center: smooth force-layout transition (300ms)

### 2. `MemoryPalaceDrawer` (mobile)

**Path:** `src/components/features/library/memory-palace/MemoryPalaceDrawer.tsx`

**Trigger:** New "🕸️" icon button on each `PromptCard`, only visible on mobile (`md:hidden`). Tapping opens the drawer with that prompt as center.

**Layout:**
- Bottom-anchored, 50vh height, rounded top corners
- Backdrop: `bg-black/40 backdrop-blur-sm`
- Drag-down handle to dismiss
- Same content structure as sidebar (mini-graph + neighbor list)

**Animation (the "מגניבה" part):**
1. **Open:** drawer slides up from bottom (`translate-y` from 100% → 0) over 350ms with `cubic-bezier(0.32, 0.72, 0, 1)` (iOS-feel curve)
2. **Graph reveal:** nodes fade in with stagger (50ms between each, center first then radiating outward) — uses `framer-motion`'s `staggerChildren`
3. **Edges draw on:** SVG `stroke-dasharray` animation, 200ms after nodes appear
4. **Close:** drawer slides down + slight fade (250ms)

**Why this matters:** the staggered radial reveal physically shows the user "this is your prompt's neighborhood," reinforcing the spatial mental model.

### 3. `MiniGraph2D` (shared)

**Path:** `src/components/features/library/memory-palace/MiniGraph2D.tsx`

**Rendering:** SVG (not Canvas) — 15-20 nodes is well within SVG's comfortable range, and SVG gives us free a11y (each circle is a focusable `<g role="button">`).

**Layout algorithm:** `d3-force` (already a transitive dep) with:
- `forceManyBody(-150)` — repulsion
- `forceLink(distance=80)` — edge length proportional to similarity score (closer = more similar)
- `forceCenter()` — pin center node at origin
- 100 simulation ticks then freeze (no perpetual motion — reduces distraction)

**Node visual:**
- Center: 16px radius, gold ring (`#fbbf24`), pulsing glow
- Neighbors: 10px radius, color = category color (existing `getCategoryColor` helper)
- Co-occurrence neighbors get a subtle dashed outline to distinguish from similarity

**Edge visual:**
- Similarity: solid line, opacity proportional to score
- Co-occurrence: dashed line, blue tint

**Interactions:**
- Click neighbor → re-center on it (smooth transition, 300ms)
- Double-click → open `PromptNodeCard` modal
- Hover → tooltip with prompt title + edge reason ("דמיון 73%" / "שימוש משותף")
- Keyboard: Tab cycles through neighbors, Enter to re-center, Shift+Enter to open

---

## Engine: `computeNeighborhood`

**Path:** `src/components/features/library/graph-utils.ts` (extension)

**Signature:**

```ts
export interface NeighborhoodOptions {
  centerId: string;
  prompts: PersonalPrompt[];
  usageEvents: PromptUsageEvent[]; // new — see Section "Data" below
  maxNeighbors?: number; // default 19
  similarityWeight?: number; // default 0.6
  cooccurrenceWeight?: number; // default 0.4
}

export function computeNeighborhood(opts: NeighborhoodOptions): {
  nodes: GraphNode[]; // 1 center + ≤maxNeighbors
  links: GraphLink[]; // ≤2 edges per neighbor max
};
```

**Algorithm:**

1. Center prompt = `prompts.find(p => p.id === centerId)`
2. **Similarity scores:** for each other prompt, compute Jaccard on tokenized title+prompt+tags (existing `tokenize` helper, Hebrew stopwords filtered) → `simScore[id]`
3. **Co-occurrence scores:** count pairs of `usageEvents` where `prompt_id === centerId` and any other `prompt_id` appeared within ±24 hours. Normalize by max → `coScore[id]`
4. **Combined score:** `score = simScore * 0.6 + coScore * 0.4`
5. Sort descending, take top 19
6. Edges: for each neighbor, add 1-2 edges back to center (similarity if simScore > 0.15, co-occurrence if coScore > 0.1, both if both pass)
7. Return nodes + links

**Performance budget:** O(N) where N = total prompts. For N=500 (heavy user) this is ~5ms client-side — well within budget.

---

## Data: usage events

### New table: `prompt_usage_events`

We need this to compute co-occurrence. Today there's `last_used_at` on the prompt row — that's a single timestamp, not an event log.

```sql
CREATE TABLE prompt_usage_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id    uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  used_at      timestamptz NOT NULL DEFAULT now(),
  session_id   text, -- optional: client-generated UUID per browsing session
  source       text NOT NULL CHECK (source IN ('library', 'graph', 'search', 'chain'))
);

CREATE INDEX idx_prompt_usage_user_time ON prompt_usage_events (user_id, used_at DESC);
CREATE INDEX idx_prompt_usage_prompt ON prompt_usage_events (prompt_id);

-- RLS
ALTER TABLE prompt_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own events" ON prompt_usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own events" ON prompt_usage_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Retention:** keep 90 days, then prune via cron. (Older data has diminishing value for "what did I use together recently?")

**Backfill:** on migration, insert one synthetic event per prompt at `last_used_at` so existing users immediately get *some* co-occurrence signal even if degraded.

**Write path:** new endpoint `POST /api/prompts/[id]/track-usage` called from:
- `PromptCard.onUsePrompt` (existing handler)
- `LibraryView.onCopyPrompt`
- Chain execution entry point

**Read path:** existing `useLibrary` hook gets a new field `usageEvents` lazily fetched on first sidebar open (cached for the session).

---

## Analytics (release blocker)

PostHog events instrumented in Sprint 1, **before** any UI ships visibly:

| Event | Properties | When |
|---|---|---|
| `palace_sidebar_opened` | `viewport: 'desktop' \| 'mobile'`, `prompt_count: number` | First open in session |
| `palace_sidebar_collapsed` | — | User collapses sidebar |
| `palace_drawer_opened` | `prompt_id`, `entry: 'card_button'` | Mobile drawer opens |
| `palace_node_clicked` | `from_id`, `to_id`, `edge_type: 'similarity' \| 'cooccurrence' \| 'both'`, `hop_index: number` | Re-center action |
| `palace_node_double_clicked` | `prompt_id` | Open prompt from graph |
| `palace_navigated_to_prompt` | `via: 'palace'`, `from_neighbor: boolean` | Successful navigation (this is the **success metric**) |
| `palace_empty_state_shown` | `reason: 'no_selection' \| 'no_neighbors' \| 'too_few_prompts'` | Diagnostic |

**Success metrics for v1 (measure after 30 days):**
1. **Activation:** % of library-active users who open the palace at least once = target ≥40%
2. **Engagement:** % who use it ≥3 times = target ≥15%
3. **Outcome:** % of palace opens that lead to `palace_navigated_to_prompt` within the same session = target ≥25%

If outcome <15% after 30 days → the graph is not solving the Memory Palace problem and we re-evaluate. If activation <20% → discoverability problem, we adjust the entry point UI.

---

## Sprint Breakdown

### Sprint 1 — Foundation (3-4 days)
- [ ] DB migration: `prompt_usage_events` table + RLS + backfill
- [ ] API: `POST /api/prompts/[id]/track-usage` + integration in existing usage points
- [ ] PostHog event scaffolding (no UI yet — ensures we can measure from day 1 of UI release)
- [ ] `computeNeighborhood()` in `graph-utils.ts` + unit tests

### Sprint 2 — Desktop sidebar (3-4 days)
- [ ] `MemoryPalaceSidebar` component
- [ ] `MiniGraph2D` component (SVG + d3-force)
- [ ] `LibraryContext` extension: `selectedPromptId`
- [ ] Hydration-safe collapse persistence
- [ ] Empty states + a11y

### Sprint 3 — Mobile drawer (2-3 days)
- [ ] `MemoryPalaceDrawer` component
- [ ] Animation polish (framer-motion stagger)
- [ ] "🕸️" trigger button on `PromptCard` (mobile only)

### Sprint 4 — Polish + measurement (2 days)
- [ ] Cross-device QA
- [ ] Performance profiling under N=500 prompts
- [ ] Analytics dashboard in PostHog (saved insight)
- [ ] Documentation update in `CLAUDE.md`

**Total estimate:** 10-13 working days.

---

## Out of Scope (explicit non-goals)

- ❌ Quality Auditor (separate future spec)
- ❌ Replacing the existing `/library` graph view (stays as-is)
- ❌ Showing palace to guests (requires user library)
- ❌ Cross-user discovery / "users who saved this also saved" (privacy concern, separate decision)
- ❌ Graph in the prompt-improver workflow (different surface, different job)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Co-occurrence signal too weak in first weeks (sparse usage data) | High | Medium | Backfill from `last_used_at`; weight similarity higher (0.7) until 30 days of data accumulate |
| Sidebar feels cluttered on smaller laptops (<1280px) | Medium | Medium | Auto-collapse below 1280px viewport, opt-in expand |
| Mobile drawer animation janky on low-end Android | Medium | Low | `prefers-reduced-motion` honored; fallback to instant slide |
| Users don't understand edge meanings | Medium | High | Tooltips on hover; legend in header; first-visit micro-tour (3 steps) |
| Performance regression in big graph view from shared `graph-utils` changes | Low | High | All new logic in new exports; existing exports untouched; regression test |

---

## Open Items (resolve in plan, not spec)

- Exact tooltip copy for edge reasons (Hebrew strings)
- Whether to show edge weights numerically or just visually
- Animation tuning constants (will iterate after first user testing)

---

## Spec Self-Review

- ✅ No placeholders / TBDs
- ✅ Internal consistency: architecture diagram matches component specs matches data model
- ✅ Scope: single feature, single sprint sequence, ~10-13 days
- ✅ Ambiguity: each requirement has one interpretation
- ✅ Analytics is wired in from Sprint 1, not bolted on later
- ✅ Empty states + accessibility + reduced-motion + RTL all covered
