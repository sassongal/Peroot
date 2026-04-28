# Original Prompt in Personal Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the original user input ("before") alongside the improved prompt ("after") in the personal library, and surface it as a collapsible section on the expanded library card.

**Architecture:** Add a nullable `original_prompt` column to `personal_library` in Supabase. Pass `original_prompt` in the three `addPrompt` call sites in `HomeClient.tsx`. Render a `useState` toggle row in `PersonalLibraryPromptCard` when the field is present.

**Tech Stack:** Supabase SQL migration, TypeScript (`src/lib/types.ts`), React (`useState`), Tailwind 4.

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/20260428000000_original_prompt_personal_library.sql` | Create — ADD COLUMN migration |
| `src/lib/types.ts` | Modify — add `original_prompt?: string` to `PersonalPrompt` (line 54) |
| `src/app/HomeClient.tsx` | Modify — pass `original_prompt` in 3 `addPrompt` calls (lines 995, 1016, 1050) |
| `src/components/views/personal-library/PersonalLibraryPromptCard.tsx` | Modify — collapsible "before" section after SafeHtml block (after line 710); update `ExportPdfButton` (line 944) |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260428000000_original_prompt_personal_library.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add original_prompt to personal_library.
-- Nullable: existing rows have no "before"; card shows no toggle for them.
ALTER TABLE personal_library
  ADD COLUMN IF NOT EXISTS original_prompt text;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Run via `mcp__supabase__apply_migration` (or `supabase db push` if CLI is configured).

Expected: migration applied without error; column exists in `personal_library`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260428000000_original_prompt_personal_library.sql
git commit -m "feat(db): add original_prompt column to personal_library"
```

---

## Task 2: Add `original_prompt` to `PersonalPrompt` type

**Files:**
- Modify: `src/lib/types.ts:54`

- [ ] **Step 1: Add the field**

In `src/lib/types.ts`, find the end of `PersonalPrompt` (currently line 54: `template_variables?: string[];`). Add after it, before the closing `};`:

```ts
  original_prompt?: string;
```

Result after edit (lines 54-56):
```ts
  template_variables?: string[];
  original_prompt?: string;
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add original_prompt to PersonalPrompt"
```

---

## Task 3: Pass `original_prompt` in the three save call sites

**Files:**
- Modify: `src/app/HomeClient.tsx` (lines 995–1003, 1016–1024, 1050–1058)

- [ ] **Step 1: Update `addPersonalPromptFromHistory` (line 995)**

Find the `addPrompt({...})` call inside `addPersonalPromptFromHistory`. Add `original_prompt` after `source: "manual"`:

Before:
```ts
      addPrompt({
        title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
        prompt: item.enhanced,
        category: item.category,
        personal_category: PERSONAL_DEFAULT_CATEGORY,
        capability_mode: CapabilityMode.STANDARD,
        use_case: "נשמר מהיסטוריה",
        source: "manual",
      });
```

After:
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

- [ ] **Step 2: Update `saveCompletionToPersonal` (line 1016)**

Find the `addPrompt({...})` call inside `saveCompletionToPersonal`. Add `original_prompt` after `source: "manual"`:

Before:
```ts
    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual",
    });
```

After:
```ts
    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual",
      original_prompt: ps.input,
    });
```

- [ ] **Step 3: Update `saveCompletionAsFavorite` (line 1050)**

Find the `addPrompt({...})` call inside `saveCompletionAsFavorite`. Add `original_prompt` after `source: "manual"`:

Before:
```ts
    const newId = await addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual",
    });
```

After:
```ts
    const newId = await addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual",
      original_prompt: ps.input,
    });
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `addPrompt` complains about `original_prompt` not being in its parameter type, check `useLibrary.ts` / `usePromptMutations.ts` — the field passes through to Supabase as a spread, so it should just work once `PersonalPrompt` is updated.

- [ ] **Step 5: Commit**

```bash
git add src/app/HomeClient.tsx
git commit -m "feat(library): pass original_prompt in all three addPrompt call sites"
```

---

## Task 4: Collapsible "before" section in `PersonalLibraryPromptCard`

**Files:**
- Modify: `src/components/views/personal-library/PersonalLibraryPromptCard.tsx`

- [ ] **Step 1: Add `showOriginal` state**

Near the top of the component function, find the other `useState` declarations. Add:

```ts
const [showOriginal, setShowOriginal] = useState(false);
```

- [ ] **Step 2: Add the collapsible row after the SafeHtml block**

In the expanded content section, the `SafeHtml` block ends at line 710 (just before the tags section at line 712). Insert the following block between `</SafeHtml>` and the tags `{/* Tags */}` comment:

```tsx
              {/* Original prompt ("before") — only shown when stored */}
              {prompt.original_prompt && (
                <div>
                  <button
                    onClick={() => setShowOriginal((v) => !v)}
                    className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
                    dir="rtl"
                  >
                    {showOriginal ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronLeft className="w-3.5 h-3.5" />
                    )}
                    הצג פרומפט מקורי
                  </button>
                  {showOriginal && (
                    <div
                      className="mt-2 me-2 text-xs text-(--text-muted) leading-relaxed whitespace-pre-wrap border-s-2 border-(--glass-border) ps-3"
                      dir="rtl"
                    >
                      {prompt.original_prompt}
                    </div>
                  )}
                </div>
              )}
```

- [ ] **Step 3: Add `ChevronLeft` to the lucide-react import**

Find the lucide-react import at the top of the file. It already imports `ChevronDown`. Add `ChevronLeft` to the same import:

Before:
```ts
import { ..., ChevronDown, ... } from "lucide-react";
```

After:
```ts
import { ..., ChevronDown, ChevronLeft, ... } from "lucide-react";
```

(If `ChevronLeft` is already imported, skip this step.)

- [ ] **Step 4: Update `ExportPdfButton` to pass `original_prompt` as `original`**

Find `ExportPdfButton` at line 944. Currently:
```tsx
                <ExportPdfButton
                  title={prompt.title || prompt.prompt.slice(0, 60)}
                  original={prompt.prompt}
                  enhanced={prompt.prompt}
```

Change to:
```tsx
                <ExportPdfButton
                  title={prompt.title || prompt.prompt.slice(0, 60)}
                  original={prompt.original_prompt || prompt.prompt}
                  enhanced={prompt.prompt}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/views/personal-library/PersonalLibraryPromptCard.tsx
git commit -m "feat(library): add collapsible original-prompt section to library card"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test new saves**

1. Improve a prompt in the main UI.
2. Click save (or star-save).
3. Open the personal library → expand the saved card.
4. Verify "הצג פרומפט מקורי" toggle appears at the bottom of the expanded content.
5. Click it → verify the original input text appears in muted style with a left border.
6. Click again → verify it collapses.

- [ ] **Step 3: Test save-from-history**

1. Open the history panel.
2. Save an item to the library.
3. Same expansion/toggle check as above.

- [ ] **Step 4: Test existing entries (no original)**

Open a card that was saved before this deploy. Verify NO toggle row appears (since `original_prompt` is NULL).

- [ ] **Step 5: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix(library): <describe any fixup>"
```
