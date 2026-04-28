# Personal Library — Mobile UX Design (Spec)

**Date:** 2026-04-28
**Status:** Approved

## Problem

The personal library screen has two distinct mobile issues:

1. **Horizontal overflow** — the header's scrollable rows (`-mx-4 w-max` quick-tabs and toolbar) spill past the viewport width, causing unwanted page-level horizontal scroll. The `overflow-x-auto` on the inner elements does not prevent this because the parent container (`glass-card`) does not clip overflow.

2. **Missing mobile UX patterns** — navigation lives at the top of the screen (quick tabs inside the header), requiring users to scroll back up to switch folders. There is no persistent bottom navigation, no FAB for the primary action, and no touch-optimized selection trigger (long-press). The context menu dropdown anchors on the wrong edge in RTL, risking off-screen placement.

## Goals

- Eliminate horizontal scroll on all mobile viewports (375px+).
- Add a persistent bottom navigation bar with folder shortcuts and a central FAB.
- Simplify the header to a single sticky search/title row on mobile.
- Enable long-press to enter selection mode.
- Fix the context menu dropdown anchor direction in RTL.

## Non-Goals

- Swipe-to-reveal card actions (bottom-sheet cards).
- Pull-to-refresh.
- Any desktop layout changes.
- Admin, settings, or other screens.

## Architecture

### 1. Overflow Fix

**`PersonalLibraryView.tsx`** root `<div>`:
- Add `overflow-x-hidden` to the className.  
  Note: the root div already has `pb-20 md:pb-0` so bottom nav padding is already set.

**`PersonalLibraryHeader.tsx`** outer `glass-card` div:
- Add `overflow-x-hidden` to clip the `-mx-4 w-max` children that currently bleed out.

These two changes are the only purely mechanical fixes. Everything else is additive.

### 2. `LibraryBottomNav` — new component

**File:** `src/components/features/library/LibraryBottomNav.tsx`

Fixed bottom bar, mobile-only (`md:hidden`), z-index 40.

Layout (RTL, 5 slots):

```
| תיקיות | מוצמדים |  ✦ חדש  | מועדפים | הכל |
```

- **4 nav tabs:** הכל (BookOpen) · מועדפים (Star) · מוצמדים (Pin) · תיקיות (FolderOpen — opens sidebar drawer)
- **Center FAB:** circular amber button, `Sparkles + Plus` icon overlay, calls `onNewPrompt` → navigates to home/input view
- Active tab: amber text + 2px amber indicator dot below icon
- Badge: count pill on tabs when count > 0 (capped at 99+)
- Safe area: `pb-[env(safe-area-inset-bottom,0px)]` to handle iPhone notch
- Background: `bg-[#0A0A0F]/95 backdrop-blur-md border-t border-(--glass-border)`
- Touch targets: all tabs `min-h-[56px]`, FAB `w-14 h-14`

Props:
```ts
interface LibraryBottomNavProps {
  effectiveFolder: string;
  folderCounts: Record<string, number>;
  onSetFolder: (key: string) => void;
  onOpenSidebar: () => void;
  onNewPrompt: () => void;
}
```

**Integration in `PersonalLibraryView.tsx`:**
- Import and render `<LibraryBottomNav>` as the last child of the root div (above the modals).
- Pass `effectiveFolder`, `folderCounts`, `setSidebarOpen`, `setFolder`, `setViewMode("home")`.
- The root div already has `pb-20 md:pb-0` — no change needed.

### 3. Header simplification on mobile

**`PersonalLibraryHeader.tsx`** changes:

**Remove** the entire `mobileQuickTabs` block and its render section (the `md:hidden -mx-4 px-4 mb-3 overflow-x-auto` div). Bottom nav replaces this.

**Add** `sticky top-0 z-20` to the outer `glass-card` div (mobile sticky header). Add `md:static` to restore default positioning on desktop. Add `bg-[#0A0A0F]/90 backdrop-blur-md` for the sticky background (dark glass, no gap when scrolling).

Result on mobile: header collapses to two rows only — (1) title + hamburger + new-prompt button, (2) search + sort + action toolbar.

### 4. Long-press selection in `PersonalLibraryPromptCard`

**`PersonalLibraryPromptCard.tsx`** — add long-press handler to the collapsed card row (`<div ... onClick={toggleExpand}`):

```ts
const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handlePointerDown = () => {
  if (selectionMode) return;
  longPressTimer.current = setTimeout(() => {
    navigator.vibrate?.(40); // haptic on Android
    setSelectionMode(true);
    toggleSelection(prompt.id);
  }, 500);
};

const handlePointerUp = () => {
  if (longPressTimer.current) clearTimeout(longPressTimer.current);
};
```

Add `onPointerDown={handlePointerDown}` `onPointerUp={handlePointerUp}` `onPointerLeave={handlePointerUp}` to the collapsed row div.

The "ניהול פריטים" button in the toolbar stays for discoverability but is visually de-emphasized on mobile (`hidden sm:flex` — only visible on sm+ screens).

### 5. Dropdown menu anchor fix

**`PersonalLibraryPromptCard.tsx`** — the `⋯` dropdown div:

Change `left-0` → `right-0` on the dropdown container:

```tsx
// Before
className="absolute left-0 top-full mt-1 z-50 ..."
// After
className="absolute right-0 top-full mt-1 z-50 ..."
```

In RTL layout, `right-0` anchors the dropdown's right edge to the button's right edge, so the menu extends leftward — staying within the viewport and natural for RTL reading direction.

Also add `max-w-[calc(100vw-2rem)]` to prevent overflow on very narrow viewports.

## File Summary

| File | Change |
|------|--------|
| `src/components/views/PersonalLibraryView.tsx` | Add `overflow-x-hidden` to root div; render `LibraryBottomNav` |
| `src/components/features/library/PersonalLibraryHeader.tsx` | Add `overflow-x-hidden` + `sticky top-0 z-20 md:static`; remove mobile quick-tabs block |
| `src/components/features/library/LibraryBottomNav.tsx` | **New component** |
| `src/components/features/library/PersonalLibraryPromptCard.tsx` | Long-press handler; dropdown `right-0` fix |

## Behaviour by Viewport

| | Mobile (< 768px) | Desktop (≥ 768px) |
|---|---|---|
| Quick tabs | Removed (bottom nav instead) | N/A (never shown) |
| Bottom nav | Visible (fixed) | Hidden |
| FAB | In bottom nav | N/A |
| Header | Sticky, 2 rows | Static, full height |
| Sidebar | Slide-out drawer | Sticky inline |
| Selection trigger | Long-press OR toolbar | Toolbar button |
| Dropdown anchor | `right-0` | `right-0` (same fix) |

## Error Handling

- Vibration API: `navigator.vibrate?.()` — optional chaining, no error if unsupported (iOS).
- Bottom nav z-index (40) is below the sidebar drawer z-index (50) and modals (60+).
- `env(safe-area-inset-bottom)` degrades to `0px` on non-notch devices.

## Open Questions

None.
