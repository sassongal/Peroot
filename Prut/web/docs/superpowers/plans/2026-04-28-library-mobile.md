# Personal Library Mobile UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix horizontal overflow on mobile and add a persistent bottom navigation bar with FAB, sticky header, long-press selection, and RTL-correct dropdown positioning.

**Architecture:** Four independent changes applied in sequence — overflow fix (2 lines), new `LibraryBottomNav` component wired into `PersonalLibraryView`, header quick-tabs removal + sticky, and card-level UX patches. `LibraryBottomNav` reads context directly (same pattern as `PersonalLibraryHeader`) to avoid prop drilling.

**Tech Stack:** React 19, Next.js 16 App Router, Tailwind 4, Lucide icons, `useLibraryContext` for shared state.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/components/views/PersonalLibraryView.tsx` |
| Modify | `src/components/views/personal-library/PersonalLibraryHeader.tsx` |
| Modify | `src/components/views/personal-library/PersonalLibraryPromptCard.tsx` |
| Create | `src/components/features/library/LibraryBottomNav.tsx` |

---

## Task 1: Fix horizontal overflow

**Files:**
- Modify: `src/components/views/PersonalLibraryView.tsx:798-800`
- Modify: `src/components/views/personal-library/PersonalLibraryHeader.tsx:72`

### Root cause
The header has two rows with `w-max` children inside `overflow-x-auto` containers. The parent `glass-card` div does not clip overflow, so `w-max` content bleeds into page-level horizontal scroll.

- [ ] **Step 1: Add `overflow-x-hidden` to the view root div**

In `src/components/views/PersonalLibraryView.tsx`, find the root `<div>` at line ~798:

```tsx
// Before
<div
  className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 md:pb-0"
  dir="rtl"
>

// After
<div
  className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 md:pb-0 overflow-x-hidden"
  dir="rtl"
>
```

- [ ] **Step 2: Add `overflow-x-hidden` to the header glass-card**

In `src/components/views/personal-library/PersonalLibraryHeader.tsx`, find the outer return div at line ~72:

```tsx
// Before
<div className="glass-card px-4 md:px-6 py-4 rounded-2xl border border-(--glass-border) bg-black/40 mb-4">

// After
<div className="glass-card px-4 md:px-6 py-4 rounded-2xl border border-(--glass-border) bg-black/40 mb-4 overflow-x-hidden">
```

- [ ] **Step 3: Verify fix**

Start the dev server: `npm run dev`

Open `http://localhost:3000`, navigate to the personal library, and resize the browser to 375px width. There should be no horizontal scrollbar and no ability to scroll right.

- [ ] **Step 4: Commit**

```bash
git add src/components/views/PersonalLibraryView.tsx src/components/views/personal-library/PersonalLibraryHeader.tsx
git commit -m "fix(library): clip horizontal overflow on mobile"
```

---

## Task 2: Create LibraryBottomNav component

**Files:**
- Create: `src/components/features/library/LibraryBottomNav.tsx`

This is the new fixed bottom navigation bar — mobile only. It reads folder state from `useLibraryContext` (same pattern as `PersonalLibraryHeader`). It receives `folderCounts`, `effectiveFolder`, `setFolder`, `setSidebarOpen` via the `shared` prop, and calls `setViewMode` from context.

- [ ] **Step 1: Create the file**

Create `src/components/features/library/LibraryBottomNav.tsx` with the following content:

```tsx
"use client";

import { BookOpen, Star, Pin, FolderOpen, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibraryContext } from "@/context/LibraryContext";
import type { PersonalLibrarySharedState } from "@/components/views/personal-library/types";

interface LibraryBottomNavProps {
  shared: Pick<
    PersonalLibrarySharedState,
    "effectiveFolder" | "folderCounts" | "setFolder" | "setSidebarOpen"
  >;
}

const NAV_TABS = [
  { key: "all", label: "הכל", icon: BookOpen },
  { key: "favorites", label: "מועדפים", icon: Star },
  { key: "pinned", label: "מוצמדים", icon: Pin },
] as const;

export function LibraryBottomNav({ shared }: LibraryBottomNavProps) {
  const { effectiveFolder, folderCounts, setFolder, setSidebarOpen } = shared;
  const { setViewMode } = useLibraryContext();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-md border-t border-(--glass-border)"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="ניווט ספרייה"
      dir="rtl"
    >
      <div className="flex items-center justify-around px-2 h-14">

        {/* Left tabs: הכל + מועדפים */}
        {NAV_TABS.slice(0, 2).map(({ key, label, icon: Icon }) => {
          const isActive = effectiveFolder === key;
          const count = folderCounts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFolder(key)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg transition-colors",
                isActive ? "text-amber-500 dark:text-amber-400" : "text-(--text-muted)",
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] tabular-nums bg-amber-500 text-black font-bold rounded-full px-1 min-w-[14px] text-center leading-[14px]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}

        {/* Center FAB — new prompt */}
        <button
          onClick={() => setViewMode("home")}
          aria-label="פרומפט חדש"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-yellow-300 hover:bg-yellow-200 active:scale-95 shadow-lg shadow-yellow-400/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 -mt-4"
        >
          <Sparkles className="absolute w-6 h-6 text-yellow-700" />
          <Plus className="absolute w-6 h-6 text-black translate-x-0.5 translate-y-0.5" strokeWidth={2.5} />
        </button>

        {/* Right tabs: מוצמדים + תיקיות */}
        {NAV_TABS.slice(2).map(({ key, label, icon: Icon }) => {
          const isActive = effectiveFolder === key;
          const count = folderCounts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFolder(key)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg transition-colors",
                isActive ? "text-amber-500 dark:text-amber-400" : "text-(--text-muted)",
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] tabular-nums bg-amber-500 text-black font-bold rounded-full px-1 min-w-[14px] text-center leading-[14px]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}

        {/* Folders button — opens sidebar drawer */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center text-(--text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg transition-colors"
          aria-label="פתח תיקיות"
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium">תיקיות</span>
        </button>

      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `LibraryBottomNav.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/library/LibraryBottomNav.tsx
git commit -m "feat(library): add LibraryBottomNav component with FAB"
```

---

## Task 3: Wire LibraryBottomNav into PersonalLibraryView

**Files:**
- Modify: `src/components/views/PersonalLibraryView.tsx`

- [ ] **Step 1: Add import**

At the top of `src/components/views/PersonalLibraryView.tsx`, after the existing library imports, add:

```tsx
import { LibraryBottomNav } from "@/components/features/library/LibraryBottomNav";
```

- [ ] **Step 2: Render LibraryBottomNav before closing the root div**

Find the closing section of the return statement (around line ~853):

```tsx
      {/* Modals, floating bars, context menus */}
      <PersonalLibraryModals shared={shared} />
    </div>
```

Replace with:

```tsx
      {/* Modals, floating bars, context menus */}
      <PersonalLibraryModals shared={shared} />

      {/* Mobile bottom navigation */}
      <LibraryBottomNav shared={shared} />
    </div>
```

- [ ] **Step 3: Verify in browser at 375px**

Run `npm run dev`, navigate to the personal library. At mobile width:
- Bottom bar is visible with 4 tabs + FAB
- Tapping "הכל" / "מועדפים" / "מוצמדים" switches the folder
- Tapping FAB navigates to the home/input view
- Tapping "תיקיות" opens the sidebar drawer

- [ ] **Step 4: Commit**

```bash
git add src/components/views/PersonalLibraryView.tsx
git commit -m "feat(library): render LibraryBottomNav in PersonalLibraryView"
```

---

## Task 4: Header — remove mobile quick tabs + add sticky

**Files:**
- Modify: `src/components/views/personal-library/PersonalLibraryHeader.tsx`

The quick tabs row in the header (`mobileQuickTabs` and its render block) is replaced by the bottom nav. The header becomes sticky on mobile so search stays accessible during scroll.

- [ ] **Step 1: Remove the `mobileQuickTabs` constant**

Find and delete lines ~63–69 (the `mobileQuickTabs` array):

```tsx
// DELETE THIS BLOCK entirely:
const mobileQuickTabs = [
  { key: "all", label: "הכל", icon: BookOpen },
  { key: "favorites", label: "מועדפים", icon: Star },
  { key: "pinned", label: "מוצמדים", icon: Pin },
  { key: "templates", label: "תבניות", icon: LayoutTemplate },
] as const;
```

- [ ] **Step 2: Remove the quick tabs render block**

Find and delete lines ~173–232 (the entire `{/* Mobile quick tabs */}` div):

```tsx
// DELETE THIS BLOCK entirely:
      {/* Mobile quick tabs — virtual folders + "full library" chip.
          Horizontally scrollable, never wraps, hidden on md+. */}
      <div className="md:hidden -mx-4 px-4 mb-3 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 w-max">
          {mobileQuickTabs.map(...)}
          ...
          <button onClick={() => setViewMode("library")} ...>
            <BookOpen className="w-3.5 h-3.5" />
            <span>ספרייה מלאה</span>
          </button>
        </div>
      </div>
```

(Delete everything from the `{/* Mobile quick tabs */}` comment down through the closing `</div>` of that block, inclusive.)

- [ ] **Step 3: Remove unused imports**

Since `LayoutTemplate` was only used by `mobileQuickTabs`, remove it from the lucide import at the top:

```tsx
// Before
import {
  BookOpen,
  Plus,
  Star,
  Pin,
  LayoutTemplate,
  CheckSquare,
  Upload,
  History,
  Sparkles,
  Menu,
  Info,
  LayoutGrid,
  Network,
} from "lucide-react";

// After
import {
  BookOpen,
  Plus,
  Star,
  Pin,
  CheckSquare,
  Upload,
  History,
  Sparkles,
  Menu,
  Info,
  LayoutGrid,
  Network,
} from "lucide-react";
```

- [ ] **Step 4: Make the header sticky on mobile**

Find the outer return div at line ~72 (now with `overflow-x-hidden` from Task 1):

```tsx
// Before
<div className="glass-card px-4 md:px-6 py-4 rounded-2xl border border-(--glass-border) bg-black/40 mb-4 overflow-x-hidden">

// After
<div className="glass-card px-4 md:px-6 py-4 rounded-2xl border border-(--glass-border) bg-black/40 mb-4 overflow-x-hidden sticky top-0 z-20 md:static bg-[#0A0A0F]/90 md:bg-black/40 backdrop-blur-md md:backdrop-blur-none">
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. Then in browser at 375px: the header should no longer show the folder pill tabs, and should stick at the top when scrolling through prompts.

- [ ] **Step 6: Commit**

```bash
git add src/components/views/personal-library/PersonalLibraryHeader.tsx
git commit -m "refactor(library): remove mobile quick tabs (replaced by bottom nav); make header sticky on mobile"
```

---

## Task 5: Card — long-press selection + dropdown RTL fix

**Files:**
- Modify: `src/components/views/personal-library/PersonalLibraryPromptCard.tsx`

Two independent fixes in one card file:
1. Long-press (500ms) on a card row enters selection mode and selects that card.
2. The `⋯` dropdown anchors to `right-0` instead of `left-0` so it opens leftward (correct for RTL) and stays in viewport.

- [ ] **Step 1: Add `useRef` import**

At the top of `PersonalLibraryPromptCard.tsx`, `useRef` needs to be imported. Find the React imports line:

```tsx
// Before (first line after "use client")
import {
    Star, ArrowRight, Plus, Copy, Pencil, Check, X,
    ...
```

The component already has React hooks. Find the line importing from React (likely implicit via Next.js). Add `useRef` to the imports from `"react"` — or if there's no explicit React import, add one:

```tsx
import { useRef } from "react";
```

Place this after the existing `"use client"` line and before the lucide imports.

- [ ] **Step 2: Add long-press timer ref inside the component**

Inside `PersonalLibraryPromptCard`, after the existing `const` declarations (around line ~110, after `const hasVariables = ...`), add:

```tsx
const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handlePointerDown = () => {
  if (selectionMode) return;
  longPressTimer.current = setTimeout(() => {
    navigator.vibrate?.(40);
    setSelectionMode(true);
    toggleSelection(prompt.id);
  }, 500);
};

const handlePointerUp = () => {
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }
};
```

- [ ] **Step 3: Wire long-press handlers onto the collapsed row div**

Find the `{/* Collapsed Row */}` div (around line ~155):

```tsx
// Before
      <div
        className={cn(
          "flex items-center gap-2 px-3 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
          isExpanded ? "py-3 border-b border-white/8" : "py-2.5"
        )}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(); } }}
        aria-expanded={isExpanded}
      >

// After
      <div
        className={cn(
          "flex items-center gap-2 px-3 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
          isExpanded ? "py-3 border-b border-white/8" : "py-2.5"
        )}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(); } }}
        aria-expanded={isExpanded}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
```

- [ ] **Step 4: Fix dropdown anchor from `left-0` to `right-0`**

Find the dropdown div (around line ~257):

```tsx
// Before
className="absolute left-0 top-full mt-1 z-50 bg-[#111] border border-(--glass-border) rounded-xl shadow-2xl py-1 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-150"

// After
className="absolute right-0 top-full mt-1 z-50 bg-[#111] border border-(--glass-border) rounded-xl shadow-2xl py-1 min-w-[180px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-150"
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. In browser at 375px:
- Long-press (hold 0.5s) on any prompt row should activate selection mode and check that prompt.
- The `⋯` menu should open to the left of the button, not to the right (no clipping).

- [ ] **Step 6: Run unit tests**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all existing tests pass (we haven't changed any logic, only added event handlers and changed CSS positioning).

- [ ] **Step 7: Commit**

```bash
git add src/components/views/personal-library/PersonalLibraryPromptCard.tsx
git commit -m "feat(library): long-press selection + fix dropdown RTL anchor on mobile"
```

---

## Final verification checklist

After all tasks are done, test at 375px viewport:

- [ ] No horizontal scroll in the library screen
- [ ] Bottom nav visible with 4 tabs + FAB
- [ ] Active folder highlighted with amber dot indicator
- [ ] Folder count badges show on tabs
- [ ] FAB tap navigates to the prompt input screen
- [ ] "תיקיות" button opens sidebar drawer
- [ ] Header sticks at top while scrolling prompt list
- [ ] Long-press on a card activates selection mode
- [ ] `⋯` dropdown opens to the left (RTL direction), stays within screen
- [ ] Desktop (≥768px): bottom nav hidden, layout unchanged

```bash
npm run typecheck && npm run test
```

Expected: 0 type errors, all tests pass.
