---
name: Peroot
description: Hebrew-first prompt-engineering platform — obsidian & gold, refined and precise.
colors:
  obsidian: "#080808"
  silver: "#e2e8f0"
  amber: "#F59E0B"
  amber-light: "#FBBF24"
  amber-dark: "#D97706"
  amber-text-light: "#B45309"
  ink: "#0f172a"
  ink-secondary: "#334155"
  ink-muted: "#64748b"
  silver-muted: "#94a3b8"
  surface-light: "#f8fafc"
  engine-standard: "#5376A4"
  engine-research: "#456F52"
  engine-image: "#AC5050"
  engine-agent: "#FDBE00"
  engine-video: "#6468d4"
typography:
  display:
    fontFamily: "Varela Round, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Varela Round, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Varela Round, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: "Alef, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.amber-light}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.silver}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  input-field:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.silver}"
    rounded: "{rounded.xl}"
    padding: "14px 16px"
  glass-card:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.silver}"
    rounded: "{rounded.2xl}"
    padding: "20px"
---

# Design System: Peroot

## 1. Overview

**Creative North Star: "The Precision Instrument"**

Peroot is a finely-machined tool for a craft: turning rough intent into professional prompts, in Hebrew, in seconds. The interface is the instrument's casing — obsidian, quiet, exact — and gold is the single calibrated marking that tells you where the meaning is. Nothing about the surface competes with the work; the surface exists so the work reads clearly. This is the visual argument behind the whole product: *we know what precision looks like, and we build it.*

The system is **Hebrew-first and RTL-native** — direction, bidi runs (Hebrew prose with Latin model names like `gpt-5` mid-sentence), numerals, and punctuation all resolve correctly in RTL by default; Latin layouts are the adaptation. It runs two registers off one token set: a **product** register for the app (calm, dense, functional) and a **brand** register for marketing (more expressive type and rhythm). The tokens never fork — unity is in the palette and type; distinction is only in how loudly each surface speaks.

It explicitly rejects four things: **generic AI-SaaS** (purple gradient blobs, hero-metric templates, gradient text, ChatGPT-clone chrome), **clutter** (many competing accents, dense toolbars), **the childish** (mascots, toy-bright primaries, rounded-everything), and **the corporate-sterile** (cold enterprise blue-gray, lifeless neutral-on-neutral). Peroot has a point of view: obsidian and gold, and restraint as confidence.

**Key Characteristics:**
- Obsidian-dark signature (`#080808`) with a true light theme (`#f8fafc`) — both first-class, neither an afterthought.
- Gold (`#F59E0B`) is meaning, never decoration — one point of emphasis per view.
- Rounded-geometric display (Varela Round) over humanist body (Alef) — a real contrast-axis pairing, both Hebrew-native.
- Depth via tinted glass + soft colored glow, not hard drop shadows.
- Five engine modes carry distinct hues, but hue never carries meaning alone.

## 2. Colors

A near-monochrome obsidian-and-silver system with a single gold voice and five reserved engine hues.

### Primary
- **Signal Gold** (`#F59E0B`): the one accent. Primary actions, active/selected state, focus rings, quality/score highlights, links in prose. On light surfaces, prefer **Deep Gold** (`#B45309`) for text so body-size gold clears 4.5:1; on obsidian, **Warm Gold** (`#FBBF24`) is the readable accent-text. Reserve pure `#F59E0B` for fills, borders, and glows — not small text.

### Secondary
- **Engine Blue** (`#5376A4`, Standard), **Engine Green** (`#456F52`, Deep Research), **Engine Red** (`#AC5050`, Image), **Engine Amber** (`#FDBE00`, Agent), **Engine Indigo** (`#6468d4`, Video): the five capability-mode hues. Used as low-alpha pill backgrounds, mode borders, and blob/glow tints on the enhance surface. Each mode owns its hue; they never appear together as decoration.

### Neutral
- **Obsidian** (`#080808`): dark-theme body and the brand ink. The instrument's casing.
- **Silver** (`#e2e8f0`): dark-theme foreground; **Silver Muted** (`#94a3b8`) for secondary/placeholder text on obsidian (clears 4.5:1 — do not go lighter).
- **Ink** (`#0f172a`) / **Ink Secondary** (`#334155`) / **Ink Muted** (`#64748b`): light-theme text ramp, primary → muted. `#64748b` is the floor for body text on `#f8fafc`; never lighter for body.
- **Surface Light** (`#f8fafc`): light-theme body — a true cool near-white (slate-50), chroma toward blue, **not** warm cream.
- **Glass** (`rgba white/black at 0.04–0.05`): tinted overlay for cards and nav — the material that carries depth.

### Named Rules
**The One Gold Rule.** Signal Gold appears on ≤10% of any screen. Its rarity is the point — it marks the primary action, the active state, or the score, and nothing else. If two things are gold, one of them is wrong.

**The Cool-Neutral Rule.** The light surface is cool (slate, chroma toward blue), never warm cream/sand/paper. Warmth in Peroot is carried by gold and type, never by a beige body background.

## 3. Typography

**Display Font:** Varela Round (with system-ui, sans-serif) — a rounded geometric Hebrew+Latin sans.
**Body Font:** Alef (with system-ui, sans-serif) — a humanist Hebrew sans built for reading.
**Label/Mono Font:** IBM Plex Mono (with ui-monospace) — for model names, code, scores, and technical labels.

**Character:** A deliberate contrast-axis pairing — rounded-geometric display against humanist body — so headings feel approachable and confident while body stays quiet and legible in long Hebrew runs. The mono is the "instrument readout" voice: it appears wherever the product shows something machine-exact.

### Hierarchy
- **Display** (400, clamp(2.25rem → 3.75rem), 1.1, -0.02em): hero and page titles. Ceiling is ~3.75rem — Peroot states, it does not shout. `text-wrap: balance`.
- **Headline** (400, clamp(1.5rem → 2.25rem), 1.2): section titles.
- **Title** (400, 1.125rem, 1.35): card and panel headings.
- **Body** (400, 1rem, 1.7): prose and UI text; cap measure at 65–75ch in long-form (blog, guides).
- **Label** (500, 0.8125rem, mono, 0.01em): model names, scores, chips, technical metadata. Not tracked-uppercase eyebrows.

### Named Rules
**The Readout Rule.** IBM Plex Mono is reserved for machine-exact values — model IDs, credit counts, quality scores, code. It signals "this is precise." Never use it for decorative labels or section eyebrows.

## 4. Elevation

Peroot is **flat-by-default with luminous state**. Surfaces rest as tinted glass on obsidian (or on light) with a hairline glass border — no neutral drop shadows in the resting state. Depth appears as a *response*: a soft, color-matched **glow** on hover, selection, and the active engine mode. The glow is the elevation language, and it is always the element's own hue (engine mode, or gold for primary), never a generic gray shadow.

### Shadow Vocabulary
- **Engine glow** (`box-shadow: 0 8px 30px rgba(<engine-hue>, 0.25)`): the active/hovered capability surface lifts in its own color.
- **Gold focus glow** (`outline: 2px solid rgba(245,158,11,0.7); outline-offset: 3px` + `ring-amber-500/50`): the universal focus-visible treatment.
- **Inset sheen** (`inset 0 1px 0 rgba(<light-hue>, 0.25)`): the top-edge highlight on pills that makes glass read as a physical surface.

### Named Rules
**The Glow-Not-Shadow Rule.** Depth is colored light, not gray dark. If an element needs to feel lifted, it glows in its own hue on state — it does not gain a neutral drop shadow at rest. A resting gray shadow is the tell of a 2018 card UI; Peroot doesn't use it.

## 5. Components

### Buttons
- **Shape:** gently rounded (10px, `rounded.lg`).
- **Primary:** Signal Gold fill (`#F59E0B`) with obsidian text (`#080808`) for maximum contrast; padding ~10px/20px. This is the *only* gold-filled element on a typical screen.
- **Hover / Focus:** lighten to Warm Gold (`#FBBF24`) + a soft gold glow; focus-visible shows the gold ring. Transitions 0.2s ease-out. No translate-bounce.
- **Ghost / Secondary:** transparent-on-obsidian with silver text and a glass border; hover raises the glass tint. Used for everything that isn't the single primary action.

### Chips (capability pills)
- **Style:** low-alpha engine-hue background (`rgba(hue, 0.24–0.35)`), matching hue border, inset top sheen, and an outer glow in the same hue.
- **State:** selected pill carries the full glow + border; unselected sits flat at reduced alpha. The active engine's hue also tints the surrounding surface — this is the app's signature moment.

### Cards / Containers
- **Corner Style:** 18px (`rounded.2xl`) for panels, 14px for smaller cards.
- **Background:** tinted glass (`--glass-bg`) over obsidian or light body.
- **Shadow Strategy:** none at rest (see Elevation) — hairline glass border only; glow on hover.
- **Border:** 1px glass border (`--glass-border`). Never a thick colored side-stripe.
- **Internal Padding:** 20px (`spacing.lg`-ish); breathe, don't cram.

### Inputs / Fields
- **Style:** obsidian/glass background, 14px radius, silver text; placeholder at Silver Muted (`#94a3b8`, ≥4.5:1 — never lighter).
- **Focus:** gold ring (`ring-amber-500/50`) + 2px gold outline, 3px offset. The focus state is unmistakably gold.
- **RTL:** text direction, caret, and alignment resolve RTL by default; mixed Latin tokens stay LTR inline.

### Navigation
- **Style:** glass bar (`--surface-nav`, `rgba white 0.9`) with a hairline bottom border; Varela Round wordmark; links in silver/ink, gold only on the active route. Mobile collapses to a drawer; the accessibility toolbar (Alt+A) is always reachable.

### Signature: The Engine Selector
The five-mode capability selector is Peroot's most distinctive component: selecting a mode floods that mode's hue into the pill (glow + border + inset sheen) and tints the enhance surface. It is the one place multiple hues live in the system — one at a time, never all at once.

## 6. Do's and Don'ts

### Do:
- **Do** keep Signal Gold to ≤10% of any screen — one primary action, one active state, one score. (The One Gold Rule.)
- **Do** use Deep Gold (`#B45309`) for gold *text* on light and Warm Gold (`#FBBF24`) on obsidian, so it clears 4.5:1. Reserve `#F59E0B` for fills/borders/glows.
- **Do** convey depth with a color-matched glow on state, never a resting gray drop shadow. (The Glow-Not-Shadow Rule.)
- **Do** design RTL-first: test every heading and mixed Hebrew/Latin run in RTL; keep Latin tokens (`gpt-5`, code) LTR inline.
- **Do** pair Varela Round (display) with Alef (body) and reserve IBM Plex Mono for machine-exact values only. (The Readout Rule.)
- **Do** hold contrast at IS 5568 / WCAG 2.0 AA in *both* themes — body ≥4.5:1, large ≥3:1, placeholders ≥4.5:1.
- **Do** ship a `prefers-reduced-motion: reduce` alternative for every animation.

### Don't:
- **Don't** build generic AI-SaaS: no purple/violet gradient blobs, no hero-metric template (big number + gradient accent), no `background-clip: text` gradient text, no ChatGPT-clone chrome.
- **Don't** use a warm cream/sand/beige/paper body background. The light surface is cool slate (`#f8fafc`). (The Cool-Neutral Rule.)
- **Don't** clutter: no more than one accent hue active at a time, no dense competing toolbars, no gold-on-gold.
- **Don't** go childish (mascots, toy-bright primaries, emoji-as-UI) or corporate-sterile (cold blue-gray enterprise, lifeless neutral-on-neutral).
- **Don't** use a `border-left`/`border-right` greater than 1px as a colored accent stripe on cards, callouts, or list items. Use a full glass border, a tint, or a leading icon instead.
- **Don't** use light-gray body text "for elegance" — the single biggest readability failure. Bump toward the ink/silver end of the ramp.
- **Don't** put tracked-uppercase eyebrows or `01 / 02 / 03` numbered markers above every section. Numbers earn their place only in a real sequence.
