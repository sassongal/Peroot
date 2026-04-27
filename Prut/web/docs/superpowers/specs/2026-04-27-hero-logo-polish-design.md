# Hero Logo Polish — Design Spec
**Date:** 2026-04-27
**Status:** Approved for implementation

## Context

After replacing the hero image with a new gold 3D "פירוט" wordmark, four visual issues were identified:
1. The processed PNG has non-transparent background pixels remaining around the logo
2. A floating animation (translateY up/down 6px) was added in a previous session — user doesn't want it
3. The logo container is too large — needs to be 25% smaller
4. A CSS light-mode filter inverts the logo to near-black — user wants identical appearance in dark and light mode

## Goals

- Professional, fully-transparent background on the hero PNG (zero residual background pixels)
- Static logo (no float animation)
- 25% smaller container
- Same gold appearance in both dark and light modes

---

## Fix 1 — PNG Background Removal (Professional Quality)

**File:** `public/Peroot-hero.png` (and `public/Peroot-hero.webp`)

**Approach:** Re-process using Sharp with a multi-step alpha cleanup pipeline:
1. `ensureAlpha()` — guarantee RGBA
2. Read raw pixel buffer
3. For each pixel: if the pixel is "near-background" (low alpha OR very dark near-black), force alpha to 0
4. Reconstruct image from cleaned buffer
5. `trim({ threshold: 20 })` — remove any remaining edge fringing
6. Resize to 720×316, `fit: "contain"`, fully transparent background
7. Export as PNG (lossless) and WebP (quality 90)

The threshold for "near-background": pixels where `alpha < 30` OR (`r < 25 && g < 25 && b < 25 && alpha < 200`).

**Source:** Work from existing `public/Peroot-hero.png` (finalhero.png was deleted).

---

## Fix 2 — Remove Float Animation

**File:** `src/app/globals.css`

Remove the rule:
```css
.hydrated .hero-logo-image {
  animation: hero-logo-float 4s ease-in-out infinite;
}
```

Also remove the `@keyframes hero-logo-float` block (lines ~810–818). The rings pulse animation (`hero-ring-pulse`) stays — it's subtle and not the complained-about motion.

---

## Fix 3 — Container Size Reduction (25%)

**File:** `src/app/globals.css`

| Property | Before | After |
|---|---|---|
| Desktop width | 360px | 270px |
| Desktop height | 140px | 105px |
| Mobile max-width | 200px | 150px |
| Mobile height | 78px | 59px |

---

## Fix 4 — Remove Light Mode Color Inversion

**File:** `src/app/globals.css`

Remove the rule:
```css
:root:not(.dark) .hero-logo-image {
  filter: brightness(0.15) sepia(1) saturate(3) hue-rotate(-10deg) drop-shadow(0 0 40px rgba(180, 83, 9, 0.4));
}
```

The base `.hero-logo-image` rule keeps its `drop-shadow(0 0 30px rgba(245, 158, 11, 0.3))` which applies in both modes. Also remove the light-mode ring color overrides (`:root:not(.dark) .hero-logo-ring-*`) since with a transparent logo on a light background, the amber rings are still appropriate.

---

## Files Changed

- `public/Peroot-hero.png` — re-generated
- `public/Peroot-hero.webp` — re-generated
- `src/app/globals.css` — remove float animation + keyframes, update container sizes, remove light mode filter

## Verification

1. Load `localhost:3000` in dark mode → logo gold, static, smaller, transparent
2. Switch to light mode → logo same gold appearance, no black/dark inversion
3. Inspect PNG in image editor → fully transparent background (checkerboard pattern around wordmark)
