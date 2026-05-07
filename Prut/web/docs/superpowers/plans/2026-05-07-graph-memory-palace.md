# Graph Memory Palace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the prompt graph from a destination view into a contextual Memory Palace — desktop sidebar + mobile drawer that show a mini-graph of the selected prompt's neighborhood.

**Architecture:** Three components share one engine (`computeNeighborhood`) and one data source (`prompt_usage_events`). Desktop renders a collapsible sidebar inside `PersonalLibraryView`; mobile renders a 50% bottom drawer triggered from each `PromptCard`. The mini-graph is 2D SVG with d3-force layout (≤20 nodes). Analytics ships in Sprint 1 before any UI is exposed.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Supabase (Postgres + RLS) · d3-force · framer-motion · PostHog · Vitest

**Spec:** `docs/superpowers/specs/2026-05-07-graph-memory-palace-design.md`

---

## File Structure

### New files
```
src/components/features/library/memory-palace/
├── MemoryPalaceSidebar.tsx        # desktop, ~250 LOC
├── MemoryPalaceDrawer.tsx         # mobile, ~180 LOC
├── MiniGraph2D.tsx                # shared SVG renderer, ~300 LOC
├── PalaceNeighborList.tsx         # accessible neighbor list, ~80 LOC
├── usePalaceState.ts              # selected prompt + collapse state, ~60 LOC
├── palace-analytics.ts            # typed PostHog event helpers, ~100 LOC
└── __tests__/
    ├── MiniGraph2D.test.tsx
    ├── usePalaceState.test.ts
    └── palace-analytics.test.ts

src/lib/usage/
├── track-usage.ts                 # client helper: POST /api/prompts/[id]/track-usage
├── usage-types.ts                 # PromptUsageEvent type
└── __tests__/
    └── track-usage.test.ts

src/app/api/prompts/[id]/track-usage/
└── route.ts                       # POST handler, ~50 LOC

supabase/migrations/
└── 20260507120000_prompt_usage_events.sql

src/components/features/library/__tests__/
└── computeNeighborhood.test.ts    # engine unit tests
```

### Modified files
```
src/components/features/library/graph-utils.ts          # +computeNeighborhood, +types
src/components/features/library/PromptCard.tsx          # +"🕸️" mobile button, +track-usage on use/copy
src/components/views/PersonalLibraryView.tsx            # mount MemoryPalaceSidebar (desktop only)
src/lib/analytics.ts                                    # +palace_* event helpers
src/context/LibraryContext.tsx                          # +selectedPromptId, +setSelectedPromptId
CLAUDE.md                                               # document the new feature
```

### Files NOT touched (out of scope)
```
src/components/features/library/PromptGraphView.tsx     # big graph view stays as-is
src/components/features/library/GraphInsightOverlay.tsx # belongs to 2026-05-02 spec
```

---

## Sprint 1 — Foundation

### Task 1: DB migration for usage events

**Files:**
- Create: `supabase/migrations/20260507120000_prompt_usage_events.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260507120000_prompt_usage_events.sql`:

```sql
-- Memory Palace: track when prompts are used so we can compute co-occurrence
CREATE TABLE IF NOT EXISTS public.prompt_usage_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id    uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  used_at      timestamptz NOT NULL DEFAULT now(),
  session_id   text,
  source       text NOT NULL CHECK (source IN ('library', 'graph', 'search', 'chain'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_usage_user_time
  ON public.prompt_usage_events (user_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_usage_prompt
  ON public.prompt_usage_events (prompt_id);

ALTER TABLE public.prompt_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own events"
  ON public.prompt_usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own events"
  ON public.prompt_usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Backfill: one synthetic event per existing prompt at last_used_at (or created_at if null)
INSERT INTO public.prompt_usage_events (user_id, prompt_id, used_at, source)
SELECT user_id, id, COALESCE(last_used_at, created_at), 'library'
FROM public.prompts
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply via Supabase MCP**

```
mcp__supabase__apply_migration with name="prompt_usage_events"
```

Expected: success, table appears in `list_tables`.

- [ ] **Step 3: Verify backfill ran**

Run via `mcp__supabase__execute_sql`:

```sql
SELECT COUNT(*) FROM public.prompt_usage_events;
```

Expected: count > 0 if there are existing prompts.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260507120000_prompt_usage_events.sql
git commit -m "feat(palace): add prompt_usage_events table with RLS + backfill"
```

---

### Task 2: TypeScript types for usage events

**Files:**
- Create: `src/lib/usage/usage-types.ts`

- [ ] **Step 1: Write the type module**

```ts
// src/lib/usage/usage-types.ts
export type UsageSource = "library" | "graph" | "search" | "chain";

export interface PromptUsageEvent {
  id: string;
  user_id: string;
  prompt_id: string;
  used_at: string; // ISO timestamp
  session_id: string | null;
  source: UsageSource;
}

export interface TrackUsagePayload {
  source: UsageSource;
  session_id?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/usage/usage-types.ts
git commit -m "feat(palace): add PromptUsageEvent type"
```

---

### Task 3: Client tracker — `trackUsage`

**Files:**
- Create: `src/lib/usage/track-usage.ts`
- Test: `src/lib/usage/__tests__/track-usage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/usage/__tests__/track-usage.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackUsage, getSessionId } from "../track-usage";

describe("track-usage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("getSessionId returns a stable UUID per session", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("trackUsage POSTs to /api/prompts/:id/track-usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    await trackUsage("prompt-123", "library");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/prompts/prompt-123/track-usage",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.source).toBe("library");
    expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("trackUsage swallows errors silently", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    await expect(trackUsage("p", "library")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/usage/__tests__/track-usage.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/usage/track-usage.ts
import type { UsageSource } from "./usage-types";

const SESSION_KEY = "peroot_palace_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Fire-and-forget usage tracker. Errors are swallowed: usage tracking must
 * never break a user-facing flow.
 */
export async function trackUsage(
  promptId: string,
  source: UsageSource,
): Promise<void> {
  try {
    await fetch(`/api/prompts/${promptId}/track-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, session_id: getSessionId() }),
      keepalive: true,
    });
  } catch {
    // intentional: usage tracking is best-effort
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/usage/__tests__/track-usage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/usage/track-usage.ts src/lib/usage/__tests__/track-usage.test.ts
git commit -m "feat(palace): add trackUsage client helper with session ID"
```

---

### Task 4: API route — POST /api/prompts/[id]/track-usage

**Files:**
- Create: `src/app/api/prompts/[id]/track-usage/route.ts`

- [ ] **Step 1: Implement the route**

```ts
// src/app/api/prompts/[id]/track-usage/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const BodySchema = z.object({
  source: z.enum(["library", "graph", "search", "chain"]),
  session_id: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parse = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("prompt_usage_events").insert({
    user_id: user.id,
    prompt_id: id,
    source: parse.data.source,
    session_id: parse.data.session_id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
# In another shell, with a logged-in cookie:
curl -X POST http://localhost:3000/api/prompts/<real-id>/track-usage \
  -H "Content-Type: application/json" \
  -d '{"source":"library"}' \
  --cookie "<auth cookie>"
```

Expected: `{"ok":true}` on success, `{"error":"unauthorized"}` without cookie.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prompts/[id]/track-usage/route.ts
git commit -m "feat(palace): POST /api/prompts/:id/track-usage endpoint"
```

---

### Task 5: Wire trackUsage into existing usage points

**Files:**
- Modify: `src/components/features/library/PromptCard.tsx`

- [ ] **Step 1: Find existing handlers**

```bash
grep -nE "onUsePrompt|onCopy" src/components/features/library/PromptCard.tsx
```

- [ ] **Step 2: Wrap handlers to also track**

In `PromptCard.tsx`, locate the JSX `onClick` handlers for `onUsePrompt` and `onCopy`. Replace each with a wrapped version:

```tsx
import { trackUsage } from "@/lib/usage/track-usage";

// inside component:
const handleUse = () => {
  trackUsage(prompt.id, "library");
  onUsePrompt();
};
const handleCopy = () => {
  trackUsage(prompt.id, "library");
  onCopy();
};
```

Replace `onClick={onUsePrompt}` → `onClick={handleUse}` and `onClick={onCopy}` → `onClick={handleCopy}` everywhere in this file (4 occurrences total: desktop hover, mobile bottom, expanded use, expanded copy).

- [ ] **Step 3: Verify type check passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/library/PromptCard.tsx
git commit -m "feat(palace): emit usage events from library card actions"
```

---

### Task 6: Analytics event helpers

**Files:**
- Create: `src/components/features/library/memory-palace/palace-analytics.ts`
- Test: `src/components/features/library/memory-palace/__tests__/palace-analytics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/features/library/memory-palace/__tests__/palace-analytics.test.ts
import { describe, it, expect, vi } from "vitest";
import * as analyticsModule from "@/lib/analytics";
import {
  trackPalaceOpened,
  trackPalaceNodeClicked,
  trackPalaceNavigated,
} from "../palace-analytics";

describe("palace-analytics", () => {
  it("trackPalaceOpened captures palace_sidebar_opened with viewport", () => {
    const spy = vi.spyOn(analyticsModule.analytics!, "capture").mockImplementation(() => undefined as never);
    trackPalaceOpened({ viewport: "desktop", promptCount: 42 });
    expect(spy).toHaveBeenCalledWith("palace_sidebar_opened", {
      viewport: "desktop",
      prompt_count: 42,
    });
  });

  it("trackPalaceNodeClicked captures edge_type and hop_index", () => {
    const spy = vi.spyOn(analyticsModule.analytics!, "capture").mockImplementation(() => undefined as never);
    trackPalaceNodeClicked({
      fromId: "a",
      toId: "b",
      edgeType: "similarity",
      hopIndex: 1,
    });
    expect(spy).toHaveBeenCalledWith("palace_node_clicked", {
      from_id: "a",
      to_id: "b",
      edge_type: "similarity",
      hop_index: 1,
    });
  });

  it("trackPalaceNavigated marks success metric", () => {
    const spy = vi.spyOn(analyticsModule.analytics!, "capture").mockImplementation(() => undefined as never);
    trackPalaceNavigated({ promptId: "p", fromNeighbor: true });
    expect(spy).toHaveBeenCalledWith("palace_navigated_to_prompt", {
      via: "palace",
      from_neighbor: true,
      prompt_id: "p",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/features/library/memory-palace/__tests__/palace-analytics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/components/features/library/memory-palace/palace-analytics.ts
import { analytics } from "@/lib/analytics";

type Viewport = "desktop" | "mobile";
type EdgeType = "similarity" | "cooccurrence" | "both";

function capture(event: string, props: Record<string, unknown>): void {
  if (typeof window !== "undefined" && analytics) {
    analytics.capture(event, props);
  }
}

export function trackPalaceOpened(opts: { viewport: Viewport; promptCount: number }): void {
  capture("palace_sidebar_opened", {
    viewport: opts.viewport,
    prompt_count: opts.promptCount,
  });
}

export function trackPalaceCollapsed(): void {
  capture("palace_sidebar_collapsed", {});
}

export function trackPalaceDrawerOpened(opts: { promptId: string }): void {
  capture("palace_drawer_opened", {
    prompt_id: opts.promptId,
    entry: "card_button",
  });
}

export function trackPalaceNodeClicked(opts: {
  fromId: string;
  toId: string;
  edgeType: EdgeType;
  hopIndex: number;
}): void {
  capture("palace_node_clicked", {
    from_id: opts.fromId,
    to_id: opts.toId,
    edge_type: opts.edgeType,
    hop_index: opts.hopIndex,
  });
}

export function trackPalaceNodeDoubleClicked(opts: { promptId: string }): void {
  capture("palace_node_double_clicked", { prompt_id: opts.promptId });
}

export function trackPalaceNavigated(opts: {
  promptId: string;
  fromNeighbor: boolean;
}): void {
  capture("palace_navigated_to_prompt", {
    via: "palace",
    from_neighbor: opts.fromNeighbor,
    prompt_id: opts.promptId,
  });
}

export function trackPalaceEmpty(reason: "no_selection" | "no_neighbors" | "too_few_prompts"): void {
  capture("palace_empty_state_shown", { reason });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/features/library/memory-palace/__tests__/palace-analytics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/library/memory-palace/palace-analytics.ts \
        src/components/features/library/memory-palace/__tests__/palace-analytics.test.ts
git commit -m "feat(palace): typed PostHog event helpers"
```

---

### Task 7: `computeNeighborhood` engine

**Files:**
- Modify: `src/components/features/library/graph-utils.ts`
- Test: `src/components/features/library/__tests__/computeNeighborhood.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/features/library/__tests__/computeNeighborhood.test.ts
import { describe, it, expect } from "vitest";
import { computeNeighborhood } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";

const mkPrompt = (id: string, title: string, prompt: string, tags: string[] = []): PersonalPrompt => ({
  id,
  user_id: "u1",
  title,
  prompt,
  use_case: "",
  category: "general",
  tags,
  variables: [],
  capability_mode: "STANDARD",
  is_template: false,
  popularity: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  last_used_at: null,
} as unknown as PersonalPrompt);

describe("computeNeighborhood", () => {
  it("returns center node + ranked neighbors capped at maxNeighbors", () => {
    const prompts = [
      mkPrompt("c", "linkedin post launch", "write linkedin announcement"),
      mkPrompt("a", "linkedin announcement template", "post on linkedin about launch"),
      mkPrompt("b", "twitter thread", "thread on twitter"),
      mkPrompt("d", "facebook update", "facebook post about launch"),
    ];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      prompts,
      usageEvents: [],
      maxNeighbors: 2,
    });
    expect(nodes[0].id).toBe("c");
    expect(nodes).toHaveLength(3); // 1 center + 2 neighbors
    expect(nodes.find((n) => n.id === "a")).toBeDefined(); // most similar
    expect(links.every((l) => l.source === "c" || l.target === "c")).toBe(true);
  });

  it("co-occurrence boosts neighbors used in the same 24h window", () => {
    const prompts = [
      mkPrompt("c", "x", "y"),
      mkPrompt("a", "totally unrelated", "blah"),
      mkPrompt("b", "also unrelated", "blah blah"),
    ];
    const usageEvents: PromptUsageEvent[] = [
      { id: "1", user_id: "u1", prompt_id: "c", used_at: "2026-05-07T10:00:00Z", session_id: null, source: "library" },
      { id: "2", user_id: "u1", prompt_id: "a", used_at: "2026-05-07T11:00:00Z", session_id: null, source: "library" },
      { id: "3", user_id: "u1", prompt_id: "c", used_at: "2026-05-07T12:00:00Z", session_id: null, source: "library" },
      { id: "4", user_id: "u1", prompt_id: "a", used_at: "2026-05-07T13:00:00Z", session_id: null, source: "library" },
    ];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      prompts,
      usageEvents,
      maxNeighbors: 1,
    });
    expect(nodes.find((n) => n.id === "a")).toBeDefined();
    expect(nodes.find((n) => n.id === "b")).toBeUndefined();
    const aLink = links.find((l) => l.source === "c" && l.target === "a");
    expect(aLink?.type).toMatch(/cooccurrence|both/);
  });

  it("returns only center when prompt has no neighbors", () => {
    const prompts = [mkPrompt("c", "alone", "completely alone")];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      prompts,
      usageEvents: [],
    });
    expect(nodes).toHaveLength(1);
    expect(links).toHaveLength(0);
  });

  it("returns empty when centerId not found", () => {
    const { nodes } = computeNeighborhood({
      centerId: "missing",
      prompts: [],
      usageEvents: [],
    });
    expect(nodes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/features/library/__tests__/computeNeighborhood.test.ts
```

Expected: FAIL — `computeNeighborhood` not exported.

- [ ] **Step 3: Implement**

Append to `src/components/features/library/graph-utils.ts`:

```ts
import type { PromptUsageEvent } from "@/lib/usage/usage-types";

export interface NeighborhoodOptions {
  centerId: string;
  prompts: PersonalPrompt[];
  usageEvents: PromptUsageEvent[];
  maxNeighbors?: number;
  similarityWeight?: number;
  cooccurrenceWeight?: number;
}

const COOCCURRENCE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SIMILARITY_THRESHOLD = 0.15;
const COOCCURRENCE_THRESHOLD = 0.1;

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function tokensFor(p: PersonalPrompt): Set<string> {
  // Reuse internal tokenize — already strips Hebrew stopwords
  const text = `${p.title} ${p.prompt} ${(p.tags ?? []).join(" ")}`;
  return new Set(tokenize(text));
}

function computeCooccurrence(
  centerId: string,
  events: PromptUsageEvent[],
): Map<string, number> {
  const counts = new Map<string, number>();
  const centerEvents = events.filter((e) => e.prompt_id === centerId);
  if (centerEvents.length === 0) return counts;

  for (const ce of centerEvents) {
    const ct = new Date(ce.used_at).getTime();
    for (const e of events) {
      if (e.prompt_id === centerId) continue;
      const et = new Date(e.used_at).getTime();
      if (Math.abs(et - ct) <= COOCCURRENCE_WINDOW_MS) {
        counts.set(e.prompt_id, (counts.get(e.prompt_id) ?? 0) + 1);
      }
    }
  }

  // Normalize to [0,1]
  const max = Math.max(0, ...counts.values());
  if (max === 0) return counts;
  for (const [k, v] of counts) counts.set(k, v / max);
  return counts;
}

export function computeNeighborhood(opts: NeighborhoodOptions): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const {
    centerId,
    prompts,
    usageEvents,
    maxNeighbors = 19,
    similarityWeight = 0.6,
    cooccurrenceWeight = 0.4,
  } = opts;

  const center = prompts.find((p) => p.id === centerId);
  if (!center) return { nodes: [], links: [] };

  const centerTokens = tokensFor(center);
  const cooc = computeCooccurrence(centerId, usageEvents);

  type Scored = { id: string; sim: number; co: number; total: number };
  const scored: Scored[] = [];
  for (const p of prompts) {
    if (p.id === centerId) continue;
    const sim = jaccard(centerTokens, tokensFor(p));
    const co = cooc.get(p.id) ?? 0;
    const total = sim * similarityWeight + co * cooccurrenceWeight;
    if (total > 0) scored.push({ id: p.id, sim, co, total });
  }
  scored.sort((a, b) => b.total - a.total);
  const top = scored.slice(0, maxNeighbors);

  const nodes: GraphNode[] = [
    { id: center.id, prompt: center, isCenter: true } as GraphNode,
    ...top
      .map((s) => prompts.find((p) => p.id === s.id))
      .filter((p): p is PersonalPrompt => Boolean(p))
      .map((p) => ({ id: p.id, prompt: p, isCenter: false }) as GraphNode),
  ];

  const links: GraphLink[] = [];
  for (const s of top) {
    const simPass = s.sim >= SIMILARITY_THRESHOLD;
    const coPass = s.co >= COOCCURRENCE_THRESHOLD;
    let type: GraphLink["type"];
    if (simPass && coPass) type = "both" as GraphLink["type"];
    else if (coPass) type = "cooccurrence" as GraphLink["type"];
    else type = "similarity" as GraphLink["type"];

    links.push({
      source: centerId,
      target: s.id,
      type,
      weight: s.total,
    } as GraphLink);
  }

  return { nodes, links };
}
```

Also extend the `GraphLink["type"]` union in this file to include `"cooccurrence" | "both"` if not already present. Add an `isCenter?: boolean` optional field to `GraphNode`.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/features/library/__tests__/computeNeighborhood.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Run full test suite to ensure no regressions**

```bash
npx vitest run src/components/features/library/__tests__/
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/library/graph-utils.ts \
        src/components/features/library/__tests__/computeNeighborhood.test.ts
git commit -m "feat(palace): computeNeighborhood engine (similarity + co-occurrence)"
```

---

## Sprint 2 — Desktop sidebar

### Task 8: `usePalaceState` hook

**Files:**
- Create: `src/components/features/library/memory-palace/usePalaceState.ts`
- Test: `src/components/features/library/memory-palace/__tests__/usePalaceState.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/components/features/library/memory-palace/__tests__/usePalaceState.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePalaceState } from "../usePalaceState";

describe("usePalaceState", () => {
  beforeEach(() => localStorage.clear());

  it("starts not collapsed (hydration-safe)", () => {
    const { result } = renderHook(() => usePalaceState());
    expect(result.current.isCollapsed).toBe(false);
  });

  it("toggleCollapsed flips state and persists", () => {
    const { result } = renderHook(() => usePalaceState());
    act(() => result.current.toggleCollapsed());
    expect(result.current.isCollapsed).toBe(true);
    expect(localStorage.getItem("peroot_palace_collapsed")).toBe("true");
  });

  it("restores persisted collapsed state on mount", async () => {
    localStorage.setItem("peroot_palace_collapsed", "true");
    const { result } = renderHook(() => usePalaceState());
    // post-mount effect runs
    await act(() => Promise.resolve());
    expect(result.current.isCollapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx vitest run src/components/features/library/memory-palace/__tests__/usePalaceState.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/components/features/library/memory-palace/usePalaceState.ts
"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "peroot_palace_collapsed";

export function usePalaceState() {
  // Always start false on server + first client render to avoid hydration mismatch
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "true") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsCollapsed(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return { isCollapsed, toggleCollapsed };
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/features/library/memory-palace/usePalaceState.ts \
        src/components/features/library/memory-palace/__tests__/usePalaceState.test.ts
git commit -m "feat(palace): usePalaceState hook with hydration-safe collapse"
```

---

### Task 9: `MiniGraph2D` SVG renderer

**Files:**
- Create: `src/components/features/library/memory-palace/MiniGraph2D.tsx`
- Test: `src/components/features/library/memory-palace/__tests__/MiniGraph2D.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/features/library/memory-palace/__tests__/MiniGraph2D.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MiniGraph2D } from "../MiniGraph2D";
import type { GraphNode, GraphLink } from "../../graph-utils";

const nodes = [
  { id: "c", isCenter: true, prompt: { id: "c", title: "Center", category: "general" } },
  { id: "a", isCenter: false, prompt: { id: "a", title: "Neighbor A", category: "general" } },
] as unknown as GraphNode[];

const links = [
  { source: "c", target: "a", type: "similarity", weight: 0.5 },
] as unknown as GraphLink[];

describe("MiniGraph2D", () => {
  it("renders one circle per node", () => {
    const { container } = render(
      <MiniGraph2D nodes={nodes} links={links} onNodeClick={() => {}} onNodeDoubleClick={() => {}} />,
    );
    expect(container.querySelectorAll("circle").length).toBe(2);
  });

  it("calls onNodeClick when a neighbor is clicked", () => {
    const onClick = vi.fn();
    render(
      <MiniGraph2D nodes={nodes} links={links} onNodeClick={onClick} onNodeDoubleClick={() => {}} />,
    );
    const neighbor = screen.getByLabelText(/Neighbor A/i);
    fireEvent.click(neighbor);
    expect(onClick).toHaveBeenCalledWith("a");
  });

  it("renders empty state when nodes is empty", () => {
    render(<MiniGraph2D nodes={[]} links={[]} onNodeClick={() => {}} onNodeDoubleClick={() => {}} />);
    expect(screen.getByText(/בחר פרומפט/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/features/library/memory-palace/MiniGraph2D.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3-force";
import type { GraphNode, GraphLink } from "../graph-utils";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
}

interface Positioned {
  id: string;
  x: number;
  y: number;
  isCenter: boolean;
  title: string;
  category: string;
}

const NODE_RADIUS_CENTER = 16;
const NODE_RADIUS_NEIGHBOR = 10;

function getCategoryColor(cat: string): string {
  // Stable hash → HSL
  let h = 0;
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

export function MiniGraph2D({
  nodes,
  links,
  width = 280,
  height = 280,
  onNodeClick,
  onNodeDoubleClick,
}: Props) {
  const [positions, setPositions] = useState<Positioned[]>([]);
  const ranOnce = useRef(false);

  // d3-force simulation: 100 ticks then freeze
  useEffect(() => {
    if (nodes.length === 0) {
      setPositions([]);
      return;
    }
    type Sim = { id: string; x?: number; y?: number; fx?: number; fy?: number };
    const simNodes: Sim[] = nodes.map((n) => ({
      id: n.id,
      ...(n.isCenter ? { fx: width / 2, fy: height / 2 } : {}),
    }));
    const simLinks = links.map((l) => ({
      source: typeof l.source === "string" ? l.source : (l.source as { id: string }).id,
      target: typeof l.target === "string" ? l.target : (l.target as { id: string }).id,
    }));

    const sim = d3
      .forceSimulation(simNodes as never)
      .force("charge", d3.forceManyBody().strength(-150))
      .force("link", d3.forceLink(simLinks).id((d: never) => (d as Sim).id).distance(80))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .stop();

    for (let i = 0; i < 100; i++) sim.tick();

    const result: Positioned[] = simNodes.map((s) => {
      const meta = nodes.find((n) => n.id === s.id)!;
      return {
        id: s.id,
        x: s.x ?? width / 2,
        y: s.y ?? height / 2,
        isCenter: !!meta.isCenter,
        title: meta.prompt?.title ?? "",
        category: meta.prompt?.category ?? "general",
      };
    });
    setPositions(result);
    ranOnce.current = true;
  }, [nodes, links, width, height]);

  const linkPaths = useMemo(() => {
    if (positions.length === 0) return [];
    const byId = new Map(positions.map((p) => [p.id, p]));
    return links
      .map((l) => {
        const sId = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
        const tId = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
        const s = byId.get(sId);
        const t = byId.get(tId);
        if (!s || !t) return null;
        return { sId, tId, s, t, type: l.type };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [positions, links]);

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-(--text-muted)"
        style={{ width, height }}
      >
        בחר פרומפט בספרייה כדי לראות את השכונה שלו
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="גרף שכנים של הפרומפט הנבחר"
      className="select-none"
    >
      {linkPaths.map((l, i) => (
        <line
          key={i}
          x1={l.s.x}
          y1={l.s.y}
          x2={l.t.x}
          y2={l.t.y}
          stroke={l.type === "cooccurrence" ? "#60a5fa" : "#94a3b8"}
          strokeWidth={1.5}
          strokeDasharray={l.type === "cooccurrence" || l.type === "both" ? "4 3" : "0"}
          opacity={0.6}
        />
      ))}
      {positions.map((p) => (
        <g
          key={p.id}
          role="button"
          aria-label={p.title}
          tabIndex={0}
          transform={`translate(${p.x},${p.y})`}
          onClick={() => onNodeClick(p.id)}
          onDoubleClick={() => onNodeDoubleClick(p.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.shiftKey ? onNodeDoubleClick(p.id) : onNodeClick(p.id);
            }
          }}
          style={{ cursor: "pointer", outline: "none" }}
        >
          <circle
            r={p.isCenter ? NODE_RADIUS_CENTER : NODE_RADIUS_NEIGHBOR}
            fill={p.isCenter ? "#fbbf24" : getCategoryColor(p.category)}
            stroke={p.isCenter ? "#f59e0b" : "rgba(255,255,255,0.4)"}
            strokeWidth={p.isCenter ? 3 : 1}
          />
          <title>{p.title}</title>
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx vitest run src/components/features/library/memory-palace/__tests__/MiniGraph2D.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/library/memory-palace/MiniGraph2D.tsx \
        src/components/features/library/memory-palace/__tests__/MiniGraph2D.test.tsx
git commit -m "feat(palace): MiniGraph2D SVG renderer with d3-force layout"
```

---

### Task 10: `PalaceNeighborList` (a11y fallback list)

**Files:**
- Create: `src/components/features/library/memory-palace/PalaceNeighborList.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/features/library/memory-palace/PalaceNeighborList.tsx
"use client";
import type { GraphNode, GraphLink } from "../graph-utils";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (id: string) => void;
}

const REASON_LABEL: Record<string, string> = {
  similarity: "דמיון תוכן",
  cooccurrence: "שימוש משותף",
  both: "דמיון + שימוש משותף",
};

export function PalaceNeighborList({ nodes, links, onSelect }: Props) {
  const neighbors = nodes.filter((n) => !n.isCenter);
  const reasonByTarget = new Map<string, string>();
  for (const l of links) {
    const tId = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
    reasonByTarget.set(tId, REASON_LABEL[l.type as string] ?? "קשור");
  }
  if (neighbors.length === 0) return null;

  return (
    <ul className="space-y-1 mt-3" dir="rtl" aria-label="רשימת שכנים">
      {neighbors.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => onSelect(n.id)}
            className="w-full text-right p-2 rounded-lg hover:bg-white/5 text-sm flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-amber-400/50"
          >
            <span className="truncate flex-1 text-(--text-primary)">{n.prompt?.title}</span>
            <span className="text-[10px] text-(--text-muted) shrink-0">
              {reasonByTarget.get(n.id) ?? ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/memory-palace/PalaceNeighborList.tsx
git commit -m "feat(palace): accessible neighbor list (keyboard + screen reader)"
```

---

### Task 11: `LibraryContext` extension — `selectedPromptId`

**Files:**
- Modify: `src/context/LibraryContext.tsx`

- [ ] **Step 1: Read existing context**

```bash
grep -n "createContext\|export\|interface" src/context/LibraryContext.tsx | head -30
```

- [ ] **Step 2: Add selectedPromptId state**

In `LibraryContext.tsx`, locate the provider. Add to the context interface:

```ts
interface LibraryContextValue {
  // ...existing fields
  selectedPromptId: string | null;
  setSelectedPromptId: (id: string | null) => void;
}
```

In the provider body:

```tsx
const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
```

Add to the `value` object passed to `LibraryContext.Provider`.

- [ ] **Step 3: Type check**

```bash
npm run typecheck
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/context/LibraryContext.tsx
git commit -m "feat(palace): add selectedPromptId to LibraryContext"
```

---

### Task 12: `MemoryPalaceSidebar` component

**Files:**
- Create: `src/components/features/library/memory-palace/MemoryPalaceSidebar.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/features/library/memory-palace/MemoryPalaceSidebar.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Network } from "lucide-react";
import { computeNeighborhood, type GraphNode, type GraphLink } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";
import { MiniGraph2D } from "./MiniGraph2D";
import { PalaceNeighborList } from "./PalaceNeighborList";
import { usePalaceState } from "./usePalaceState";
import {
  trackPalaceOpened,
  trackPalaceCollapsed,
  trackPalaceNodeClicked,
  trackPalaceNodeDoubleClicked,
  trackPalaceNavigated,
  trackPalaceEmpty,
} from "./palace-analytics";

interface Props {
  prompts: PersonalPrompt[];
  selectedPromptId: string | null;
  onSelectPrompt: (id: string) => void;
  onOpenPrompt: (id: string) => void;
}

const MIN_PROMPTS = 5;

export function MemoryPalaceSidebar({
  prompts,
  selectedPromptId,
  onSelectPrompt,
  onOpenPrompt,
}: Props) {
  const { isCollapsed, toggleCollapsed } = usePalaceState();
  const [usageEvents, setUsageEvents] = useState<PromptUsageEvent[]>([]);
  const [hopIndex, setHopIndex] = useState(0);

  // Lazy-load usage events on first expand
  useEffect(() => {
    if (isCollapsed || usageEvents.length > 0) return;
    fetch("/api/prompts/usage-events")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => setUsageEvents(d.events ?? []))
      .catch(() => setUsageEvents([]));
  }, [isCollapsed, usageEvents.length]);

  // Track sidebar opened once per session per viewport
  useEffect(() => {
    if (!isCollapsed) {
      trackPalaceOpened({ viewport: "desktop", promptCount: prompts.length });
    }
  }, [isCollapsed, prompts.length]);

  const { nodes, links } = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    if (!selectedPromptId) return { nodes: [], links: [] };
    return computeNeighborhood({
      centerId: selectedPromptId,
      prompts,
      usageEvents,
    });
  }, [selectedPromptId, prompts, usageEvents]);

  // Diagnostic empty-state events
  useEffect(() => {
    if (isCollapsed) return;
    if (prompts.length < MIN_PROMPTS) trackPalaceEmpty("too_few_prompts");
    else if (!selectedPromptId) trackPalaceEmpty("no_selection");
    else if (nodes.length === 1) trackPalaceEmpty("no_neighbors");
  }, [isCollapsed, prompts.length, selectedPromptId, nodes.length]);

  if (prompts.length < MIN_PROMPTS) return null;

  const handleNodeClick = (id: string) => {
    if (id === selectedPromptId) return;
    const linkToTarget = links.find(
      (l) => (typeof l.target === "string" ? l.target : (l.target as { id: string }).id) === id,
    );
    trackPalaceNodeClicked({
      fromId: selectedPromptId ?? "",
      toId: id,
      edgeType: (linkToTarget?.type as "similarity" | "cooccurrence" | "both") ?? "similarity",
      hopIndex: hopIndex + 1,
    });
    setHopIndex((h) => h + 1);
    onSelectPrompt(id);
  };

  const handleNodeDoubleClick = (id: string) => {
    trackPalaceNodeDoubleClicked({ promptId: id });
    trackPalaceNavigated({ promptId: id, fromNeighbor: id !== selectedPromptId });
    onOpenPrompt(id);
  };

  const handleToggle = () => {
    if (!isCollapsed) trackPalaceCollapsed();
    toggleCollapsed();
  };

  return (
    <aside
      dir="rtl"
      className="hidden lg:flex flex-col border-s border-(--glass-border) bg-black/20 transition-all duration-200"
      style={{ width: isCollapsed ? 32 : 320 }}
      aria-label="Memory Palace — שכנים של הפרומפט הנבחר"
    >
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 hover:bg-white/5 transition-colors flex items-center gap-2 text-(--text-muted) cursor-pointer"
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {!isCollapsed && (
          <>
            <Network className="w-4 h-4" />
            <span className="text-sm font-medium">קרבה</span>
          </>
        )}
      </button>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <MiniGraph2D
            nodes={nodes}
            links={links}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
          <PalaceNeighborList nodes={nodes} links={links} onSelect={handleNodeClick} />
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/memory-palace/MemoryPalaceSidebar.tsx
git commit -m "feat(palace): MemoryPalaceSidebar with collapse + analytics"
```

---

### Task 13: API endpoint to read usage events

**Files:**
- Create: `src/app/api/prompts/usage-events/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/prompts/usage-events/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ events: [] }, { status: 401 });
  }
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("prompt_usage_events")
    .select("id, user_id, prompt_id, used_at, session_id, source")
    .eq("user_id", user.id)
    .gte("used_at", since)
    .order("used_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ events: [] }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
```

- [ ] **Step 2: Smoke test (logged in)**

```bash
curl http://localhost:3000/api/prompts/usage-events --cookie "<auth>"
```

Expected: `{"events":[...]}`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prompts/usage-events/route.ts
git commit -m "feat(palace): GET /api/prompts/usage-events (90d window)"
```

---

### Task 14: Mount sidebar in `PersonalLibraryView`

**Files:**
- Modify: `src/components/views/PersonalLibraryView.tsx`

- [ ] **Step 1: Locate the layout**

```bash
grep -n "filteredPersonalLibrary\|return\s*(" src/components/views/PersonalLibraryView.tsx | head -10
```

- [ ] **Step 2: Wrap the existing grid in a flex row**

Find the top-level returned element. Wrap the content in a flex container with the sidebar adjacent. Use `useLibrary()` for `selectedPromptId` and `setSelectedPromptId` (added in Task 11). Add a hook into existing card-click handler to set `selectedPromptId`.

```tsx
import { MemoryPalaceSidebar } from "@/components/features/library/memory-palace/MemoryPalaceSidebar";
import { useLibrary } from "@/context/LibraryContext";

// inside component:
const { selectedPromptId, setSelectedPromptId } = useLibrary();

// in return JSX, wrap top-level:
return (
  <div className="flex w-full">
    <div className="flex-1 min-w-0">
      {/* ...existing grid/list/header here... */}
    </div>
    <MemoryPalaceSidebar
      prompts={filteredPersonalLibrary}
      selectedPromptId={selectedPromptId}
      onSelectPrompt={setSelectedPromptId}
      onOpenPrompt={(id) => {
        // open existing PromptNodeCard modal — locate the existing setter, e.g.:
        setNodeCardPromptId(id);
      }}
    />
  </div>
);
```

Also: in the existing card click handler (the one that currently expands the card), add `setSelectedPromptId(prompt.id)`.

- [ ] **Step 3: Type check + run dev server**

```bash
npm run typecheck && npm run dev
```

Manually verify on `http://localhost:3000/library`:
- Sidebar visible on lg viewports
- Click on prompt → sidebar shows neighbors
- Toggle button collapses to 32px
- Below 1024px viewport sidebar hidden via `lg:flex`

- [ ] **Step 4: Commit**

```bash
git add src/components/views/PersonalLibraryView.tsx
git commit -m "feat(palace): mount MemoryPalaceSidebar in personal library"
```

---

## Sprint 3 — Mobile drawer

### Task 15: `MemoryPalaceDrawer` component

**Files:**
- Create: `src/components/features/library/memory-palace/MemoryPalaceDrawer.tsx`

- [ ] **Step 1: Verify framer-motion is installed**

```bash
grep '"framer-motion"' package.json
```

If missing: `npm install framer-motion`. Commit `package.json` + lockfile separately.

- [ ] **Step 2: Implement**

```tsx
// src/components/features/library/memory-palace/MemoryPalaceDrawer.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { computeNeighborhood, type GraphNode, type GraphLink } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";
import { MiniGraph2D } from "./MiniGraph2D";
import { PalaceNeighborList } from "./PalaceNeighborList";
import {
  trackPalaceDrawerOpened,
  trackPalaceNodeClicked,
  trackPalaceNodeDoubleClicked,
  trackPalaceNavigated,
} from "./palace-analytics";

interface Props {
  open: boolean;
  centerPromptId: string | null;
  prompts: PersonalPrompt[];
  onClose: () => void;
  onOpenPrompt: (id: string) => void;
}

export function MemoryPalaceDrawer({
  open,
  centerPromptId,
  prompts,
  onClose,
  onOpenPrompt,
}: Props) {
  const [usageEvents, setUsageEvents] = useState<PromptUsageEvent[]>([]);
  const [activeId, setActiveId] = useState<string | null>(centerPromptId);

  useEffect(() => setActiveId(centerPromptId), [centerPromptId]);

  useEffect(() => {
    if (!open) return;
    if (centerPromptId) trackPalaceDrawerOpened({ promptId: centerPromptId });
    if (usageEvents.length > 0) return;
    fetch("/api/prompts/usage-events")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => setUsageEvents(d.events ?? []))
      .catch(() => setUsageEvents([]));
  }, [open, centerPromptId, usageEvents.length]);

  const { nodes, links } = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    if (!activeId) return { nodes: [], links: [] };
    return computeNeighborhood({ centerId: activeId, prompts, usageEvents });
  }, [activeId, prompts, usageEvents]);

  const handleNodeClick = (id: string) => {
    if (id === activeId) return;
    const linkToTarget = links.find(
      (l) => (typeof l.target === "string" ? l.target : (l.target as { id: string }).id) === id,
    );
    trackPalaceNodeClicked({
      fromId: activeId ?? "",
      toId: id,
      edgeType: (linkToTarget?.type as "similarity" | "cooccurrence" | "both") ?? "similarity",
      hopIndex: 1,
    });
    setActiveId(id);
  };

  const handleDoubleClick = (id: string) => {
    trackPalaceNodeDoubleClicked({ promptId: id });
    trackPalaceNavigated({ promptId: id, fromNeighbor: id !== centerPromptId });
    onOpenPrompt(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            dir="rtl"
            role="dialog"
            aria-label="Memory Palace"
            className="fixed bottom-0 inset-x-0 z-50 bg-(--surface-1) rounded-t-3xl border-t border-(--glass-border) md:hidden"
            style={{ height: "50vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
          >
            <div className="flex items-center justify-between p-3 border-b border-(--glass-border)">
              <span className="text-sm font-medium">קרבה</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <motion.div
              className="p-4 overflow-y-auto h-[calc(100%-48px)]"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1 },
                }}
                transition={{ duration: 0.25 }}
              >
                <MiniGraph2D
                  nodes={nodes}
                  links={links}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleDoubleClick}
                />
              </motion.div>
              <PalaceNeighborList nodes={nodes} links={links} onSelect={handleNodeClick} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Type check**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/library/memory-palace/MemoryPalaceDrawer.tsx
git commit -m "feat(palace): mobile drawer with framer-motion stagger reveal"
```

---

### Task 16: "🕸️" trigger button on `PromptCard` (mobile)

**Files:**
- Modify: `src/components/features/library/PromptCard.tsx`

- [ ] **Step 1: Add prop + button**

In `PromptCardProps`, add:

```ts
onShowConnections?: () => void;
```

In the JSX, locate the mobile quick actions block (`md:hidden` near the bottom of the compact section). Add a third button before the existing "השתמש":

```tsx
{onShowConnections && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onShowConnections();
    }}
    className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg border border-(--glass-border) text-(--text-muted) text-xs hover:bg-white/10 transition-colors"
    aria-label="הצג קשרים"
    title="הצג קשרים"
  >
    <Network className="w-3.5 h-3.5" />
    קשרים
  </button>
)}
```

Import `Network` from `lucide-react` (already imported nearby).

- [ ] **Step 2: Type check**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/PromptCard.tsx
git commit -m "feat(palace): add mobile 'connections' button on PromptCard"
```

---

### Task 17: Wire drawer into `PersonalLibraryView`

**Files:**
- Modify: `src/components/views/PersonalLibraryView.tsx`

- [ ] **Step 1: Add drawer state + render**

Inside the component:

```tsx
import { MemoryPalaceDrawer } from "@/components/features/library/memory-palace/MemoryPalaceDrawer";

const [drawerCenter, setDrawerCenter] = useState<string | null>(null);

// pass to PromptCard:
<PromptCard
  // ...existing props
  onShowConnections={() => setDrawerCenter(prompt.id)}
/>

// render drawer at component root:
<MemoryPalaceDrawer
  open={drawerCenter !== null}
  centerPromptId={drawerCenter}
  prompts={filteredPersonalLibrary}
  onClose={() => setDrawerCenter(null)}
  onOpenPrompt={(id) => setNodeCardPromptId(id)}
/>
```

- [ ] **Step 2: Manual verification**

```bash
npm run dev
```

On a phone-sized viewport (DevTools device emulator):
- Tap "🕸️ קשרים" on a card → drawer slides up
- Mini-graph appears with stagger
- Tap a neighbor → graph re-centers
- Double-tap → drawer closes, full prompt modal opens

- [ ] **Step 3: Commit**

```bash
git add src/components/views/PersonalLibraryView.tsx
git commit -m "feat(palace): wire MemoryPalaceDrawer into PersonalLibraryView"
```

---

## Sprint 4 — Polish + measurement

### Task 18: `prefers-reduced-motion` support

**Files:**
- Modify: `src/components/features/library/memory-palace/MemoryPalaceDrawer.tsx`

- [ ] **Step 1: Add reduced-motion detection**

At the top of `MemoryPalaceDrawer.tsx`, add:

```tsx
import { useReducedMotion } from "framer-motion";

// inside component:
const reduceMotion = useReducedMotion();
```

Replace the spring transition with a conditional:

```tsx
transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 360, damping: 32 }}
```

And the stagger:

```tsx
variants={{
  hidden: {},
  visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } },
}}
```

- [ ] **Step 2: Verify in OS settings**

Enable "Reduce motion" in OS settings and verify drawer opens instantly without stagger.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/memory-palace/MemoryPalaceDrawer.tsx
git commit -m "feat(palace): honor prefers-reduced-motion in drawer animation"
```

---

### Task 19: Performance check at N=500

**Files:** none (validation only)

- [ ] **Step 1: Seed 500 prompts in dev DB**

Via Supabase SQL editor or `mcp__supabase__execute_sql`:

```sql
INSERT INTO public.prompts (user_id, title, prompt, use_case, category, tags, capability_mode, is_template)
SELECT
  '<your test user uuid>',
  'Test prompt ' || g,
  'Sample prompt body about topic ' || (g % 20),
  'use case ' || (g % 10),
  'general',
  ARRAY['tag-' || (g % 5)],
  'STANDARD',
  false
FROM generate_series(1, 500) g;
```

- [ ] **Step 2: Open library + sidebar, check performance**

Open `/library`, expand sidebar, click various prompts. Open Chrome DevTools → Performance → record 5 seconds of clicking.

Acceptance:
- Time from click → graph rendered: <150ms (P95)
- No long task >100ms

If failure: profile `computeNeighborhood`, consider memoizing `tokensFor` per prompt.

- [ ] **Step 3: Clean up test data**

```sql
DELETE FROM public.prompts WHERE title LIKE 'Test prompt %';
```

- [ ] **Step 4: Commit any optimizations made**

If a perf fix was needed, commit with:

```bash
git commit -m "perf(palace): memoize tokenization in computeNeighborhood"
```

---

### Task 20: Documentation update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add Memory Palace section**

In `CLAUDE.md`, after the "Personal Library Architecture" section, append:

```markdown

## Memory Palace (Graph Sidebar/Drawer)
- **Desktop:** `MemoryPalaceSidebar` mounted inside `PersonalLibraryView`, collapsible, persisted via `peroot_palace_collapsed` localStorage key
- **Mobile:** `MemoryPalaceDrawer` triggered by 🕸️ button on each `PromptCard`, 50vh height, framer-motion stagger reveal
- **Engine:** `computeNeighborhood()` in `graph-utils.ts` — combines Jaccard similarity (60%) + 24h co-occurrence (40%), max 19 neighbors
- **Data:** `prompt_usage_events` table tracks every prompt use; backfilled from `last_used_at` on migration; 90d retention window
- **Analytics (release blocker):** PostHog events in `memory-palace/palace-analytics.ts` — success metric is `palace_navigated_to_prompt` (target ≥25% of opens)
- **Hidden when:** user has <5 prompts (graph needs critical mass)
- **Spec:** `docs/superpowers/specs/2026-05-07-graph-memory-palace-design.md`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Memory Palace feature in CLAUDE.md"
```

---

### Task 21: Create PostHog dashboard

**Files:** none (PostHog UI work, manual)

- [ ] **Step 1: In PostHog UI, create insight**

Funnel:
1. `palace_sidebar_opened` OR `palace_drawer_opened`
2. `palace_node_clicked`
3. `palace_navigated_to_prompt`

Time window: 30 days. Breakdown by `viewport`.

- [ ] **Step 2: Create saved cohort**

"Palace power users" — users with ≥3 `palace_navigated_to_prompt` in 30 days.

- [ ] **Step 3: Document the dashboard URL**

Add to `CLAUDE.md` Memory Palace section:

```markdown
- **Dashboard:** [PostHog → Memory Palace](https://app.posthog.com/...)
```

- [ ] **Step 4: Commit doc update**

```bash
git add CLAUDE.md
git commit -m "docs(palace): link PostHog dashboard"
```

---

## Final checks

- [ ] **Run full test suite**

```bash
npm run test
```

All green.

- [ ] **Run typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Both clean.

- [ ] **Production build**

```bash
npm run build
```

Succeeds with no warnings about server/client component boundaries or missing types.

- [ ] **Manual cross-device QA checklist**

- Desktop ≥1280px: sidebar visible, expand/collapse smooth, click → graph updates
- Tablet 768px–1279px: sidebar hidden (lg breakpoint), drawer not yet wired here (acceptable, drawer is mobile-only)
- Mobile <768px: 🕸️ button visible, drawer opens to 50vh, animations smooth, double-tap opens prompt
- Reduced motion ON: drawer opens instantly, no stagger
- Empty library (<5 prompts): no sidebar visible
- Brand new account: tracks first usage event, neighbors appear after 2-3 usages
