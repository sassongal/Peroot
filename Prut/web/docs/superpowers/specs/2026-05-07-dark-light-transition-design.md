# Dark/Light Mode Transition — World-Class UX
**Date:** 2026-05-07
**Status:** Approved

---

## Problem

The current theme switch is janky: only `body` has a CSS transition (`background-color 0.2s, color 0.2s`). Every other element — cards, borders, inputs, shadows — reads from CSS custom properties but has no transition, so they snap at frame 0 while `body` fades over 0.2 s. The result is a visible two-step where part of the page changes instantly and the rest catches up.

## Solution: View Transitions API

Wrap the `applyTheme()` DOM call in `document.startViewTransition()`. The browser captures the current frame as a bitmap, applies the new theme classes, then GPU-compositor-cross-fades between the two snapshots. Every pixel transitions simultaneously with zero layout/paint thrash, eliminating the two-step jank entirely.

Fallback for unsupported browsers: instant switch (same as current behaviour, no regression).

Browser support: Chrome 111+, Edge 111+, Safari 18+, Firefox 128+ (~95%+ of users).

---

## Changes

### `src/components/providers/ThemeProvider.tsx`

In `toggleTheme`, wrap the `applyTheme` call:

```ts
// before
applyTheme(next);

// after
if (document.startViewTransition) {
  document.startViewTransition(() => applyTheme(next));
} else {
  applyTheme(next);
}
```

### `src/app/globals.css`

Remove the body transition (replaced by View Transitions):

```css
/* remove */
transition: background-color 0.2s ease, color 0.2s ease;
```

Add View Transitions rules:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 150ms;
  animation-timing-function: ease;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0ms;
  }
}
```

---

## What stays the same

- Toggle UI component
- localStorage persistence (`peroot-theme`)
- FOUC prevention inline script in `layout.tsx`
- Tailwind `.dark` selector variant
- `applyTheme()` DOM logic

---

## Success criteria

- Theme switch feels instantaneous and uniform — no two-step snap
- Transition completes in ≤150 ms
- `prefers-reduced-motion` users get an instant switch (no animation)
- No regression on browsers without View Transitions support
