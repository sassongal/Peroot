# Design: Original Prompt ("Before") in Personal Library

**Date:** 2026-04-28
**Status:** Approved

---

## Problem

When a user saves a prompt improvement result to their personal library, only the improved ("after") prompt is stored. The original input ("before") is used only to derive the title and is then discarded. The admin `prompts-feed` view already shows both before and after (from the `history` table), but users have no way to see what they originally typed from inside their library.

---

## Goal

Store the original input alongside the improved result in the personal library, and surface it as an optional collapsible section on the library card.

---

## Out of Scope

- Context attachments (files, URLs, images) — transient, not stored with library entries
- Admin prompts-feed changes — already shows both fields from `history`
- Public library prompts — no "before" concept there

---

## Database

**Migration:** Add a single nullable column to `personal_library`:

```sql
ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS original_prompt text;
```

Nullable — all existing rows silently have no "before" and the card shows nothing extra for them.

---

## Type Change

`PersonalPrompt` in `src/lib/types.ts`:

```ts
original_prompt?: string;
```

---

## Save Flow

Three call sites in `src/app/HomeClient.tsx` need to pass the original:

| Function | Source of original |
|---|---|
| `saveCompletionToPersonal` | `ps.input` |
| `saveCompletionAsFavorite` | `ps.input` |
| `addPersonalPromptFromHistory` | `item.original` |

Each call to `addPrompt({...})` gains `original_prompt: ps.input` (or `item.original`).

The `addPrompt` mutation in `useLibrary` / `usePromptMutations` already passes all fields through to Supabase — no change needed there beyond the type.

---

## UI — Library Card

**File:** `src/components/views/personal-library/PersonalLibraryPromptCard.tsx`

When `prompt.original_prompt` is present, render a small toggle row at the bottom of the card:

- Collapsed (default): a muted text button "הצג פרומפט מקורי ←" with a chevron
- Expanded: the original text rendered in a smaller, muted style, visually distinct from the improved prompt (e.g. slightly indented, `text-muted` color, `text-xs` or `text-sm`)
- Toggle is purely local state (`useState(false)`) — no network call

This is the only UI change. No new modal, no new route, no new API.

---

## Data Flow

```
User hits save
  → saveCompletionToPersonal()
    → addPrompt({ prompt: ps.completion, original_prompt: ps.input, ... })
      → Supabase INSERT into personal_library (original_prompt stored)
        → PersonalLibraryPromptCard renders collapsible "before" row
```

---

## Migration Strategy

- Backward-compatible: `original_prompt` is nullable, RLS unchanged
- Existing library entries: `original_prompt` is NULL → card shows no toggle
- New saves after deploy: `original_prompt` populated → toggle appears

---

## Files to Change

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDD_original_prompt_personal_library.sql` | ADD COLUMN |
| `src/lib/types.ts` | Add `original_prompt?: string` to PersonalPrompt |
| `src/app/HomeClient.tsx` | Pass `original_prompt` in 3 `addPrompt` calls |
| `src/components/views/personal-library/PersonalLibraryPromptCard.tsx` | Collapsible "before" section |
