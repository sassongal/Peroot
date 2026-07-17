# Product

## Register

product

> **Register split (confirmed with the team).** Peroot runs two surfaces under one identity:
> - **Product register** — the app: the enhance engine (`/`), personal library, chains, settings, admin. Design **serves** the work; calm surface, minimal chrome, precise accents. This is the default register above.
> - **Brand register** — marketing/conversion: landing hero, `/pricing`, `/features`, `/blog/*`, `/guide(s)`, audience pages. Design **is** the product here; more expressive typography, scroll rhythm, and editorial layout.
>
> When a task targets a marketing/long-form surface, override to `brand`. Both registers draw from the **same** DESIGN.md tokens — the split is in expressiveness and density, never in palette, type family, or component vocabulary. Unity comes from shared tokens; distinction comes from how loudly each surface uses them.

## Users

Hebrew-first knowledge workers, creators, marketers, developers, teachers, and product people in Israel who work with LLMs (ChatGPT, Claude, Gemini) and image/video models (Midjourney, DALL·E, Sora, Veo) but are not prompt-engineering experts. Their context: mid-task, wanting a better result *now* — they have a rough idea and need it turned into a structured, professional prompt in seconds, in fluent Hebrew with correct RTL. Segments span free/guest (2/day), Pro (150/mo), and an internal admin operating the platform.

The job to be done: **"Turn my rough intent into a professional prompt I can trust — fast, in Hebrew — and let me keep, refine, and reuse it."**

## Product Purpose

Peroot (פירוט) is Israel's leading Hebrew-first prompt-engineering platform. It analyzes, structures, and upgrades any raw prompt into a professional one with clear roles, context, focusing questions, and real-time quality scoring — across five capability modes (Standard, Deep Research, Image, Video, Agent Builder). Beyond one-shot enhancement it is a workspace: a personal library with a Memory-Palace graph, prompt chains, versioning, and reuse.

Success = a user pastes a rough idea, gets a visibly better prompt in seconds, trusts it enough to save it, and comes back. Growth is earned by demonstrated value (the result itself, the library filling up), converting guest → free → Pro.

## Brand Personality

**Expert · precise · empowering.** The voice of a senior practitioner who makes *you* better at your craft — confident and capable without being cold, technical without being intimidating. Tone is direct, calm, and Hebrew-native (original Hebrew, not translated). It respects the user's ambition: it assumes you want to do good work and hands you sharper tools, never talks down. Emotional goal: the quiet confidence of using a professional instrument that just works.

## Anti-references

This should NOT look like any of:

- **Generic AI-SaaS** — purple/violet gradient blobs, the hero-metric template (big number + gradient accent), endless identical icon+heading+text card grids, background-clip gradient text, the ChatGPT-clone chrome. Peroot is a *tool for* AI, not another me-too AI wrapper.
- **Cluttered / busy** — overloaded dashboards, many competing accent colors at once, dense toolbars. The amber accent is a scalpel, not a highlighter.
- **Childish / cartoonish** — mascots, toy-bright primaries, rounded-everything, emoji-as-UI. Precision, not play.
- **Corporate / sterile** — cold enterprise blue-gray, stock-photo professionalism, lifeless neutral-on-neutral. Peroot has a point of view (obsidian + gold).

## Design Principles

1. **Practice what you preach.** Peroot teaches structure, clarity, and precision — the interface must itself be structured, clear, and precise. Sloppy UI undermines the pitch. Every screen is an argument that we know what a good prompt (and a good product) looks like.
2. **Hebrew-first, RTL-native.** Hebrew and RTL are the design's ground truth, never a retrofit. Layout, punctuation, mixed LTR tokens (model names, code), and type all resolve correctly in RTL by default. Latin surfaces are the adaptation, not the reverse.
3. **Expert confidence, not hand-holding.** Assume an ambitious user. Elevate their craft; don't nanny it. Defaults are opinionated and good; power is discoverable, not in the way.
4. **Earn the upgrade.** Conversion comes from demonstrated value — the visibly-better result, the filling library, the graph — not dark patterns, fake scarcity, or nagging. Nudges are honest and dismissible.
5. **Calm surface, precise accent.** Obsidian restraint lets the work stand out; the amber/gold accent marks meaning (active state, primary action, quality), never decorates. One point of emphasis per view.

## Accessibility & Inclusion

Target: **Israeli Standard IS 5568 (aligned to WCAG 2.0 AA)** — a legal requirement in Israel; the site ships a dedicated `/accessibility` statement.

- **Contrast:** body text ≥ 4.5:1, large/bold text ≥ 3:1, in *both* light and dark themes and against tinted/glass surfaces. Muted grays must clear 4.5:1, not sit at "elegant" light-gray.
- **RTL & bidi:** correct in every component, including mixed Hebrew/Latin runs and numerals.
- **Keyboard & focus:** full keyboard operability with visible focus rings; the accessibility toolbar (Alt+A) stays functional.
- **Reduced motion:** every animation ships a `prefers-reduced-motion: reduce` alternative (crossfade or instant).
- **Not color-alone:** engine-mode meaning (blue/green/red/gold/indigo) and status (success/warning/error) are always paired with text, icon, or shape — never conveyed by hue alone.
