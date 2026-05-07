# ResultSection Redesign — Design Spec

**Date:** 2026-05-07
**Component:** `src/components/features/prompt-improver/ResultSection.tsx`
**Status:** Approved

---

## Goal

Redesign the post-prompt result area to be professional, clean, and consistent with Peroot's dark luxury aesthetic. Remove the non-working PDF export button, consolidate the "פתח ב:" platform row into a single line with gem-style branded buttons, and reorganize actions into three clear zones.

---

## Visual Design

- **Background:** `#0e0e14` card on `#080808` body — no blue tint
- **Accent:** `#FDBE00` gold for primary actions and save shortcuts
- **Fonts:** `Alef` (body/labels), `Varela Round` (stage chip, section labels, primary button)
- **Border radius:** 20px card, 12px model buttons, 10px action buttons
- **Animation timing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` spring for expand/hover effects

---

## Layout: Three Zones

### Zone 1 — Top Toolbar

Three icon buttons that **expand on hover** to reveal text labels:

| Button | Icon | Label | Style |
|--------|------|-------|-------|
| לאפס | RotateCcw | "לאפס" | Neutral (white/6%) |
| שמור בספריה | BookOpen | "שמור בספריה" | Gold (`rgba(253,190,0,0.08)`, gold border) |
| העתק | Copy | "העתק" | Neutral |

- Height: 34px, border-radius: 10px
- Hover: expands width with spring animation, shows label via `max-width` transition
- Top toolbar save button (`שמור בספריה`) is **always active** — allows re-save at any time

Left of toolbar: stage chip — `"פרומפט מוכן · שלב 3/3"` with pulsing gold dot.

### Zone 2 — Platform Row ("פתח ב:")

Single flex row, no wrapping. Section label: `"פתח ב"` in uppercase, 10px, Varela Round.

**Gem-style buttons** (ChatGPT, Claude, Gemini) — each has:
- Branded icon badge (28×28px, rounded 8px) with brand-color background + glow (`box-shadow`)
- Brand name in Alef 13px bold
- Hover: `translateY(-2px)` + brand-colored `box-shadow`
- No external CDN — all icons are inline SVG

| Platform | Icon | Brand color |
|----------|------|-------------|
| ChatGPT | OpenAI swirl (exact SVG paths) | `#10a37f` green |
| Claude | Anthropic mark (V-shape paths) | `#cf795a` coral |
| Gemini | 4-pointed star (gradient) | blue→purple→red |

**Separator:** 1px vertical, `rgba(255,255,255,0.09)`.

**WhatsApp** — icon-only square button (44×44px), official WhatsApp SVG (green circle + white phone path), no text label. `rgba(37,211,102,0.1)` background, green glow on hover.

### Zone 3 — Bottom Bar

Left group:
- **"חזרה לעריכה"** — text button with left-arrow icon, 13px Alef bold
- **"עוד אפשרויות"** — always shows text + dots icon; **collapses to icon-only** when panel is open (spring width transition). Subtle indigo tint: `rgba(130,120,200,0.07)`.

Right group:
- **שפר שוב** — icon-only (pencil icon), 36px square, gold border/tint. Tooltip on hover: `"שפר שוב · קרדיט"`. Triggers credit confirmation popup on click.
- **"העתק פרומפט"** — primary gold button (`linear-gradient(135deg, #FDBE00, #f59e0b)`), Varela Round 14px bold, gold glow shadow.

---

## "עוד אפשרויות" Panel

Slides open **below the card** (attached to card bottom) with `max-height` spring animation.

Items:
| Item | Always active? |
|------|---------------|
| שמור במועדפים | ✅ Always |
| שמור בספריה | ❌ Disabled (`opacity: 0.35`, no pointer-events) with `✓ נשמר` badge when already saved |
| שתף קישור | ✅ Always |
| שמור כתבנית | ✅ Always |
| לאפס הכל | ✅ Always, danger style (red tint) |

---

## Credit Confirmation Popup ("שפר שוב")

Triggered when user clicks שפר שוב. Appears as a centered modal over a blurred overlay (`backdrop-filter: blur(6px)`).

Structure:
- **Header:** animated icon (pencil, gold) + title "לשפר את הפרומפט שוב?" + subtitle "שיפור נוסף ישתמש בקרדיט אחד"
- **Body:** explanation text + credit status row showing remaining credits today
- **Actions:** "ביטול" (neutral) + "שפר שוב ✓" (gold primary, Varela Round)
- Pop-in animation: `scale(0.88) → scale(1)` with spring timing

---

## Behaviors

- **ExportPdfButton removed** — replaced by לאפס icon in top toolbar
- **"שמור כתבנית" removed from primary bar** — moved to "עוד אפשרויות"
- **"שתף"** removed from primary bar — moved to "עוד אפשרויות"
- **"שמור במועדפים"** removed from primary bar — moved to "עוד אפשרויות"
- **"שפר שוב"** shrunk to icon-only to save space in bottom bar

---

## Files to Modify

- `src/components/features/prompt-improver/ResultSection.tsx` — main component
- `src/components/features/prompt-improver/ResultSection.module.css` (if exists, else inline Tailwind + CSS vars)

---

## Reference Mockups

`.superpowers/brainstorm/134561-1778174882/content/result-v6.html` — final approved mockup
