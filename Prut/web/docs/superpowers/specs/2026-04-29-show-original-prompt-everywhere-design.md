# Show Original Prompt — History + Personal Library

**Date:** 2026-04-29
**Status:** Design approved, awaiting implementation plan
**Owner:** Gal Sasson

## Problem

A user who enhances a prompt loses easy visibility of what they originally typed. The "before" text is currently only available in two places:

- **History view** — primary body of each card already shows `original`, but the *enhanced* output is invisible (only reachable via Restore/Copy/Export).
- **Personal library** — `original_prompt` column exists (migration `20260428000000`) and a collapsible toggle is wired up in `PersonalLibraryPromptCard.tsx`, but **only new saves populate the column**. Every prompt saved before 2026-04-28 has `original_prompt = NULL`, so the toggle doesn't render — making the feature look broken to long-time users.

We want users to see "before vs after" on every saved prompt and every history row, with consistent collapsible UX.

## Goals

1. **Backfill** existing `personal_library` rows with their original prompt where determinable.
2. **Forward-link** new personal_library rows to their source history row so the data never goes missing again.
3. **History card** gains a collapsible toggle to reveal the enhanced output, mirroring the personal-library toggle UX.

## Non-goals

- Re-enhancing or regenerating prompts with new "before" snapshots.
- Surfacing diffs / inline highlights between before and after (future work).
- Backfilling history rows themselves — `history` table already stores both `original` and `enhanced`.

## Architecture

### 1. Database (`supabase/migrations/20260429000000_personal_library_source_history.sql`)

```sql
-- Forward-linking: personal_library rows track their origin in history.
ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS source_history_id uuid
    REFERENCES history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS personal_library_source_history_id_idx
  ON personal_library (source_history_id)
  WHERE source_history_id IS NOT NULL;

-- Best-effort backfill: match by exact (user_id, enhanced text).
-- Rows without a unique match stay NULL — UI handles that gracefully.
WITH matches AS (
  SELECT DISTINCT ON (pl.id)
    pl.id AS pl_id,
    h.id AS history_id,
    h.original AS original_text
  FROM personal_library pl
  JOIN history h
    ON h.user_id = pl.user_id
   AND h.enhanced = pl.prompt
  WHERE pl.original_prompt IS NULL
  ORDER BY pl.id, h.created_at DESC
)
UPDATE personal_library pl
SET
  original_prompt = m.original_text,
  source_history_id = m.history_id
FROM matches m
WHERE pl.id = m.pl_id
  AND pl.original_prompt IS NULL;
```

`DISTINCT ON (pl.id)` with `ORDER BY h.created_at DESC` ensures one match per personal_library row when multiple history rows share the same enhanced text — picks the most recent. The `WHERE pl.original_prompt IS NULL` guard makes the migration idempotent.

### 2. Insert path (`src/hooks/usePromptMutations.ts`)

The `personal-library` route has only a GET handler; inserts happen client-side via `supabase.from('personal_library').insert(...)` inside `usePromptMutations.addPrompt`. The current `insertData` object enumerates fields explicitly and silently drops both `original_prompt` and (the new) `source_history_id` — which is why the existing toggle never renders for new saves either.

Fix: add both fields to `insertData`. Add `source_history_id?: string` to `PersonalPrompt` in `src/lib/types.ts`. Add the same field to `useLibraryFetch`'s `SELECT` projection so the value round-trips.

RLS already restricts inserts to `user_id = auth.uid()`. Postgres FK validates the history row exists, but cross-user references are not blocked at the DB layer — RLS on `history` blocks any read attempt, so a dangling reference is the worst case (acceptable; UI degrades gracefully when the linked history row is unreadable).

GET response: `useLibraryFetch.ts` currently selects an explicit column list (`id, title, prompt, ...`) — must add `original_prompt, source_history_id` to it.

### 3. Save-to-personal flow (`src/app/HomeClient.tsx`)

Wherever `onSaveToPersonal(item: HistoryItem)` is currently resolved, the POST body must include:

```ts
{
  prompt: item.enhanced,
  original_prompt: item.original,
  source_history_id: item.id,
  // ... existing fields (category, tags, etc.)
}
```

This is a single call site change.

### 4. History card UI (`src/components/features/history/HistoryPanel.tsx`)

Component-local state for which items are expanded:

```tsx
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
const toggleExpanded = (id: string) =>
  setExpandedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
```

Inside each card, between the original text (line 298–300) and the action buttons row (line 301), insert:

```tsx
<div className="mt-2" onClick={(e) => e.stopPropagation()}>
  <button
    onClick={() => toggleExpanded(item.id)}
    className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
    dir="rtl"
    aria-expanded={expandedIds.has(item.id)}
  >
    {expandedIds.has(item.id)
      ? <ChevronDown className="w-3.5 h-3.5" />
      : <ChevronRight className="w-3.5 h-3.5" />}
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

`stopPropagation` is required because the card itself is a clickable Restore target (line 228–231).

## Data flow

```
[New save from history]
  User clicks "Save to personal"
    → HomeClient.handleSaveToPersonal(item)
    → POST /api/personal-library {
        prompt: item.enhanced,
        original_prompt: item.original,
        source_history_id: item.id,
        ...
      }
    → INSERT
    → Personal library card renders existing collapsible toggle (already shipped)

[Old save, post-migration]
  Migration backfilled original_prompt
    → Personal library card renders existing collapsible toggle

[History row]
  User clicks "הצג פלט משודרג"
    → toggleExpanded(item.id)
    → Enhanced text rendered inline, RTL, muted styling
```

## Error handling

| Scenario                                       | Behavior                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Backfill cannot find a match                   | Row stays `NULL`, toggle silently absent. No error.                 |
| User deletes a history row that's referenced   | FK `ON DELETE SET NULL` clears `source_history_id`. Toggle still renders if `original_prompt` was already populated. |
| API call without `source_history_id`           | Field stays NULL. Backwards compatible with all existing clients.   |
| Migration re-run                               | Idempotent (`WHERE original_prompt IS NULL`).                       |

## Testing

**Migration**
- Seed two users (A, B) with overlapping enhanced text in their respective history.
- Insert a personal_library row for user A whose `prompt` matches an enhanced text from user B's history.
- Run migration. Assert: A's personal_library row gets *only* A's history match (or NULL), never B's.

**API**
- POST with valid `source_history_id` and `original_prompt` → row persists both.
- POST with bogus `source_history_id` (random UUID) → FK violation OR persists NULL after `ON DELETE SET NULL` resolves; document whichever Postgres does.

**UI**
- Vitest snapshot: history card with collapsed enhanced block.
- Vitest interaction: click toggle → expanded state + `aria-expanded="true"` + enhanced text visible.
- Click on the enhanced block does not bubble to the card-level Restore handler.

## Rollout

Single PR, single migration, no feature flag. The feature is additive everywhere:

- Old API clients unaffected (new field optional).
- Personal library cards without backfill match continue to render as before.
- History cards with this PR show a new toggle; without it, no toggle. Both states are valid.

## Open questions

None at design time.

## References

- Existing personal-library migration: `supabase/migrations/20260428000000_original_prompt_personal_library.sql`
- Existing personal-library card UI: `src/components/views/personal-library/PersonalLibraryPromptCard.tsx:713-737`
- Prior plan: `docs/superpowers/plans/2026-04-28-original-prompt-in-library.md`
