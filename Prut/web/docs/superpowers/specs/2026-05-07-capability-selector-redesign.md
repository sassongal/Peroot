# CapabilitySelector Redesign — Design Spec
**Date:** 2026-05-07
**Status:** Approved

---

## Overview

Redesign `src/components/ui/CapabilitySelector.tsx` from a horizontal-scroll row of uniform pills into two distinct experiences:

- **Mobile:** Rising Pill Track — all 5 modes visible in one row, selected mode expands via flex-grow with spring animation
- **Desktop:** Luxury Gem Cards — 5 independent floating cards, selected card rises and glows

---

## Mobile — Rising Pill Track

### Layout
- Single `div` with `display: flex`, `gap: 3px`, background `#15152a`, `border-radius: 999px`, `padding: 4px`
- All 5 buttons always visible — **no overflow scroll, no snap**
- Unselected: `flex: 1`, selected: `flex: 2.6`
- Flex transition: `0.4s cubic-bezier(0.34, 1.45, 0.64, 1)` (spring overshoot)

### Rising Pill Effect
- Each button has a `::before` pseudo-element covering `inset: 0`, `border-radius: 999px`
- Inactive: `opacity: 0`, `transform: translateY(8px) scale(0.88)`
- Active: `opacity: 1`, `transform: translateY(0) scale(1)`, transition `0.42s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Per-mode glow colors (background + box-shadow + border):
  - Standard: `rgba(83,118,164,...)` blue
  - Research: `rgba(69,111,82,...)` green
  - Image: `rgba(172,80,80,...)` red
  - Agent: `rgba(253,190,0,...)` amber
  - Video: `rgba(100,104,212,...)` purple

### Icons — Creative Geometric SVG (Set A)
All stroke-based, `24×24`, no external CDN dependency (inlined SVG):

| Mode | Icon | Color |
|------|------|-------|
| סטנדרטי | Chat bubble + lightning bolt inside | `#5376A4` blue |
| מחקר מעמיק | Atom — 3 orbital ellipses + nucleus dot | `#456F52` green |
| יצירת תמונה | Camera aperture (6-spoke circle + inner ring) | `#AC5050` red |
| בונה סוכנים | CPU chip — rect + 3 pins per side + center dot | `#FDBE00` amber |
| יצירת סרטון | Clapperboard — rect + diagonal stripes + play triangle | `#6468d4` purple |

Icon wrapper: `24×24px`, `z-index: 1`, spring scale on active: `scale(1.18) translateY(-1px)` + `drop-shadow(0 2px 8px rgba(253,190,0,0.4))`

### Label
- Font: `10px`, `font-weight: 700`, color `#FDBE00`
- Hidden by default (`opacity: 0`, `max-height: 0`), revealed on active (`opacity: 1`, `max-height: 16px`)
- Hebrew mode name (from `CAPABILITY_CONFIGS`)

### Smoke Particles
- 3 particles per button: Left, Center, Right
- Each: `12×12px` radial-gradient blob, `filter: blur(7px)`, amber `rgba(253,190,0,0.55)`
- Keyframe animations: L drifts up-left, R up-right, C straight up
- Duration: `2.2s` (L, R), `2.7s` (C), staggered `animation-delay`
- Inactive: `opacity: 0.3`, active: `opacity: 1`

---

## Desktop — Luxury Gem Cards

### Layout
- `display: flex`, `gap: 8px`, no track background (open layout)
- Each mode is an independent `button` wrapping a `.card` inner div
- Breakpoint: apply at `md` (≥ 768px). Mobile track hidden. Desktop cards shown.

### Card States
**Unselected:** `opacity: 0.65`, background `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`, `border: 1px solid rgba(255,255,255,0.07)`

**Hover (unselected):** `opacity: 0.85`, `transform: translateY(-2px)`, `border-color: rgba(255,255,255,0.12)`

**Selected:**
- `transform: translateY(-6px)` — card floats up, `transition: 0.4s cubic-bezier(0.34,1.56,0.64,1)`
- Per-mode gradient fill + border + `box-shadow` glow (8px + 30–34px spread)
- Thin top bar: 2px line at top, per-mode linear-gradient, expands from 15%/85% to 8%/92%

### Ambient Glow Blob
- `::before` pseudo: `position: absolute; top: -24px; left: 50%; width: 60px; height: 50px`
- `border-radius: 50%`, `filter: blur(18px)`, per-mode color
- Inactive: `opacity: 0.15`, active: `opacity: 0.6`

### Icons
Same SVG set as mobile, rendered at `36×36px`
Active spring: `scale(1.2) translateY(-2px)` + `drop-shadow(0 3px 10px rgba(253,190,0,0.5))`

### Label (Mode Name)
- Font: **`13px`**, `font-weight: 800`, `letter-spacing: 0.03em`
- Inactive: `color: rgba(255,255,255,0.25)`
- Active: `color: #FDBE00`

### Description Text (Desktop only)
- Short subtitle per mode (e.g., "יצירת טקסט וצ׳אט", "חיפוש ומקורות", "DALL·E / Midjourney", "Custom GPT & Agents", "AI Video prompts")
- Font: `10px`, `color: rgba(255,255,255,0.35)`
- Hidden by default (`max-height: 0`, `opacity: 0`), revealed on active via max-height transition

### Smoke Particles
- Same system as mobile, particles `18×18px`, duration `2.8s`

---

## Shared Constraints

- `prefers-reduced-motion`: all transitions `0ms`, smoke paused
- RTL direction (`dir="rtl"`)
- No external icon CDN — all SVGs inlined in the component
- Existing `CapabilityMode` type and `CAPABILITY_CONFIGS` from `src/lib/capability-mode.ts` preserved
- `onClick` signature unchanged — fires `onModeChange(mode: CapabilityMode)`
- Fully keyboard accessible: `button` elements, focus rings visible
- Touch targets: mobile buttons ≥ 44px height in active state

---

## Files Affected

| File | Change |
|------|--------|
| `src/components/ui/CapabilitySelector.tsx` | Full rewrite |
| `src/app/globals.css` | May add smoke keyframes if not co-located |
| `src/lib/capability-mode.ts` | Read-only (no changes) |

---

## Out of Scope
- Changing the 5 modes, their labels, or their routing logic
- Any changes to how `CapabilitySelector` is called from `HomeClient.tsx`
