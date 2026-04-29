# Show Original Prompt Everywhere — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every personal-library card and history card surface the user's original prompt via a collapsible toggle, with backfill for legacy rows.

**Architecture:** One Supabase migration adds `source_history_id` and backfills `original_prompt` via exact-match join on enhanced text. The client-side insert path (`usePromptMutations.addPrompt`) is fixed to actually persist both fields. History card UI gains a `useState`-managed collapsible block showing the enhanced output beneath the original.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + RLS), Tailwind 4, Vitest.

---

## File Structure

| File                                                      | Role                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `supabase/migrations/20260429000000_personal_library_source_history.sql` | New migration: add column + backfill          |
| `src/lib/types.ts`                                        | Add `source_history_id?: string` to `PersonalPrompt`       |
| `src/hooks/usePromptMutations.ts`                         | Persist `original_prompt` + `source_history_id` in insert  |
| `src/app/HomeClient.tsx`                                  | Pass `source_history_id` from history save call site       |
| `src/components/features/history/HistoryPanel.tsx`        | Add collapsible "show enhanced" toggle on cards            |
| `src/components/features/history/__tests__/HistoryPanel.test.tsx` | New: snapshot + interaction test for the toggle    |

---

## Task 1: Database migration — add column + backfill

**Files:**
- Create: `supabase/migrations/20260429000000_personal_library_source_history.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Forward-link personal_library rows to their source history row.
-- Plus best-effort backfill of original_prompt for legacy rows.

ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS source_history_id uuid
    REFERENCES history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS personal_library_source_history_id_idx
  ON personal_library (source_history_id)
  WHERE source_history_id IS NOT NULL;

-- Backfill: for each personal_library row missing original_prompt,
-- find the most recent history row owned by the same user whose
-- enhanced text exactly matches the saved prompt, and copy both
-- the original text and the source id over. Idempotent due to the
-- WHERE original_prompt IS NULL guard.
WITH matches AS (
  SELECT DISTINCT ON (pl.id)
    pl.id        AS pl_id,
    h.id         AS history_id,
    h.original   AS original_text
  FROM personal_library pl
  JOIN history h
    ON h.user_id = pl.user_id
   AND h.enhanced = pl.prompt
  WHERE pl.original_prompt IS NULL
  ORDER BY pl.id, h.created_at DESC
)
UPDATE personal_library pl
SET
  original_prompt   = m.original_text,
  source_history_id = m.history_id
FROM matches m
WHERE pl.id = m.pl_id
  AND pl.original_prompt IS NULL;
```

- [ ] **Step 2: Apply on a Supabase branch (not prod)**

Run via Cursor MCP: `mcp__supabase__create_branch` → `mcp__supabase__apply_migration` with the SQL above on the branch → `mcp__supabase__execute_sql` to validate (`SELECT count(*) FROM personal_library WHERE original_prompt IS NOT NULL;` should be ≥ pre-migration count).

Expected: migration applies without error; backfill count > 0 if user has any personal-library rows that were saved from history.

- [ ] **Step 3: Merge the branch**

`mcp__supabase__merge_branch` once verified.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260429000000_personal_library_source_history.sql
git commit -m "feat(db): backfill personal_library.original_prompt + source_history_id"
```

---

## Task 2: Type definition — add `source_history_id`

**Files:**
- Modify: `src/lib/types.ts:30-56`

- [ ] **Step 1: Add field to `PersonalPrompt` type**

Find the `PersonalPrompt` type (currently ends with `original_prompt?: string;` on line 55) and add `source_history_id?: string;` immediately after it:

```ts
export type PersonalPrompt = {
  // ... existing fields ...
  original_prompt?: string;
  source_history_id?: string;
};
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (the new field is optional so no consumer is forced to populate it).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "types: add source_history_id to PersonalPrompt"
```

---

## Task 3: Persist `original_prompt` + `source_history_id` in insert path

**Files:**
- Modify: `src/hooks/usePromptMutations.ts:70-83`

- [ ] **Step 1: Update `insertData` to include both fields**

Current block at lines 70–83:

```ts
const insertData = {
  user_id: user.id,
  title: prompt.title,
  prompt: prompt.prompt,
  prompt_style: prompt.prompt_style ?? null,
  category: prompt.category,
  personal_category: prompt.personal_category,
  use_case: prompt.use_case,
  source: prompt.source,
  sort_index: nextSortIndex,
  capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
  tags: prompt.tags || [],
  updated_at: new Date().toISOString(),
};
```

Replace with (additions on the last two lines before `updated_at`):

```ts
const insertData = {
  user_id: user.id,
  title: prompt.title,
  prompt: prompt.prompt,
  prompt_style: prompt.prompt_style ?? null,
  category: prompt.category,
  personal_category: prompt.personal_category,
  use_case: prompt.use_case,
  source: prompt.source,
  sort_index: nextSortIndex,
  capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
  tags: prompt.tags || [],
  original_prompt: prompt.original_prompt ?? null,
  source_history_id: prompt.source_history_id ?? null,
  updated_at: new Date().toISOString(),
};
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run mutations tests**

Run: `npx vitest run src/hooks/__tests__/usePromptMutations.test.ts`
Expected: PASS — the test does not pin the insert payload shape, so adding fields is safe.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePromptMutations.ts
git commit -m "fix(library): persist original_prompt and source_history_id on insert"
```

---

## Task 4: Pass `source_history_id` from history save call site

**Files:**
- Modify: `src/app/HomeClient.tsx:1005-1014`

- [ ] **Step 1: Add `source_history_id` to the addPrompt call**

Find the block:

```ts
addPrompt({
  title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
  prompt: item.enhanced,
  category: item.category,
  personal_category: PERSONAL_DEFAULT_CATEGORY,
  capability_mode: CapabilityMode.STANDARD,
  use_case: "נשמר מהיסטוריה",
  source: "manual",
  original_prompt: item.original,
});
```

Add `source_history_id: item.id,` right after `original_prompt`:

```ts
addPrompt({
  title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
  prompt: item.enhanced,
  category: item.category,
  personal_category: PERSONAL_DEFAULT_CATEGORY,
  capability_mode: CapabilityMode.STANDARD,
  use_case: "נשמר מהיסטוריה",
  source: "manual",
  original_prompt: item.original,
  source_history_id: item.id,
});
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/HomeClient.tsx
git commit -m "feat(library): link saved prompts to source history row"
```

---

## Task 5: History card collapsible toggle — failing test first

**Files:**
- Create: `src/components/features/history/__tests__/HistoryPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HistoryPanel } from "../HistoryPanel";
import type { HistoryItem } from "@/hooks/useHistory";

const item: HistoryItem = {
  id: "h-1",
  original: "before text",
  enhanced: "AFTER ENHANCED TEXT",
  tone: "",
  category: "General",
  title: undefined,
  source: "web",
  timestamp: Date.now(),
  // Minimal stub — DateBadge consumer only reads `createdAt` for compact mode.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: { id: "h-1", original: "before text", enhanced: "AFTER ENHANCED TEXT", category: "General", createdAt: new Date().toISOString() } as any,
};

describe("HistoryPanel — show-enhanced toggle", () => {
  it("hides the enhanced text by default and reveals it on toggle click", () => {
    const noop = vi.fn();
    render(
      <HistoryPanel
        history={[item]}
        isLoaded
        onClear={noop}
        onRestore={noop}
        onSaveToPersonal={noop}
        onCopy={noop}
      />,
    );

    expect(screen.queryByText("AFTER ENHANCED TEXT")).toBeNull();

    const toggle = screen.getByRole("button", { name: /הצג פלט משודרג/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByText("AFTER ENHANCED TEXT")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking the toggle does not bubble to the card-level Restore handler", () => {
    const onRestore = vi.fn();
    const noop = vi.fn();
    render(
      <HistoryPanel
        history={[item]}
        isLoaded
        onClear={noop}
        onRestore={onRestore}
        onSaveToPersonal={noop}
        onCopy={noop}
      />,
    );

    const toggle = screen.getByRole("button", { name: /הצג פלט משודרג/ });
    fireEvent.click(toggle);

    expect(onRestore).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/components/features/history/__tests__/HistoryPanel.test.tsx`
Expected: FAIL — no element with "הצג פלט משודרג" exists yet.

---

## Task 6: Implement the collapsible toggle

**Files:**
- Modify: `src/components/features/history/HistoryPanel.tsx:3, 64-65, 298-301`

- [ ] **Step 1: Add `ChevronRight` and `ChevronDown` to the lucide-react import**

Current import (line 3):

```ts
import { Trash2, ArrowRight, Plus, Copy, Search, Filter, Clock, Pencil, Check, X } from "lucide-react";
```

Replace with:

```ts
import { Trash2, ArrowRight, Plus, Copy, Search, Filter, Clock, Pencil, Check, X, ChevronRight, ChevronDown } from "lucide-react";
```

- [ ] **Step 2: Add expanded-ids state inside the component**

Just after `const [renameDraft, setRenameDraft] = useState("");` (line 69), add:

```tsx
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
const toggleExpanded = (id: string) =>
  setExpandedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
```

- [ ] **Step 3: Insert the toggle block between the original text and the action row**

Find the original-text paragraph (lines 298–300):

```tsx
<p className={cn("text-sm text-(--text-primary) leading-relaxed max-h-16 overflow-hidden", item.title ? "mt-1 text-xs text-(--text-muted)" : "mt-2")} dir="rtl">
  {item.original}
</p>
```

Immediately after that `</p>` and before the existing `<div className="mt-3 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>` action row, insert:

```tsx
<div className="mt-2" onClick={(e) => e.stopPropagation()}>
  <button
    onClick={() => toggleExpanded(item.id)}
    className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
    dir="rtl"
    aria-expanded={expandedIds.has(item.id)}
  >
    {expandedIds.has(item.id) ? (
      <ChevronDown className="w-3.5 h-3.5" />
    ) : (
      <ChevronRight className="w-3.5 h-3.5" />
    )}
    הצג פלט משודרג
  </button>
  {expandedIds.has(item.id) && (
    <div
      className="mt-2 me-2 text-xs text-(--text-secondary) leading-relaxed whitespace-pre-wrap border-s-2 border-(--glass-border) ps-3"
      dir="rtl"
    >
      {item.enhanced}
    </div>
  )}
</div>
```

- [ ] **Step 4: Run the failing tests and confirm they pass**

Run: `npx vitest run src/components/features/history/__tests__/HistoryPanel.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/history/HistoryPanel.tsx src/components/features/history/__tests__/HistoryPanel.test.tsx
git commit -m "feat(history): collapsible toggle to reveal enhanced output"
```

---

## Task 7: Verify, push

- [ ] **Step 1: Full preflight**

Run: `npm run preflight`
Expected: lint clean, typecheck clean, all 953+ tests pass (plus the 2 new HistoryPanel tests).

- [ ] **Step 2: Push**

Run: `git push origin main`
Expected: 4 commits pushed (`feat(db)`, `types`, `fix(library)`, `feat(history)`). The `feat(library)` HomeClient commit is the smallest one — fine to keep as its own commit for traceability.
