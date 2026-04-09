# Supported Platforms Marquee — Design Doc

**Date:** 2026-04-09
**Status:** Approved — implementing

## Goal
Showcase every AI platform/engine Peroot optimizes for, as a lightweight "cool gadget" on the homepage. Reinforces the value prop: *one prompt manager for every engine you use*.

## Placement
Inside `InputSection.tsx`, directly after the input form / context chips and **before** the "Recently Used" strip. This keeps it visually anchored to the chat window without polluting the main chat area.

## Visual Design
- **Dual marquee** — two horizontal rows, each running an infinite loop in opposite directions (row 1 RTL, row 2 LTR). Creates a rich, "many platforms" feel without vertical bloat.
- **Fade-out gradients** on both edges so logos dissolve into the background instead of being hard-cut.
- **Monochrome + hover color**: logos render grayscaled at 60% opacity by default; on hover each logo desaturates to full color and 100% opacity (scale 1.05). The marquee animation pauses on row-hover.
- **Height:** ~140px total including heading.
- **Heading:** small muted text — "עובד עם כל המנועים שאתם מכירים".

## Platforms (~24)
**Row 1 — Text & Code:** ChatGPT, Claude, Gemini, Mistral, DeepSeek, Grok, Perplexity, Llama, Qwen, Copilot, Cursor
**Row 2 — Image & Video:** Midjourney, DALL·E, Flux, Stable Diffusion, Ideogram, Sora, Veo, Runway, Pika, Kling, MiniMax, Luma

## Technical Approach
- **Logos:** `<img>` from `https://cdn.simpleicons.org/{slug}/{hex}` for platforms with simpleicons entries. Text-wordmark fallback for the rest (Flux, Kling, MiniMax, Luma, etc.). `loading="lazy"` on every image.
- **Animation:** CSS-only (`@keyframes translateX` + duplicated track for seamless loop). Zero JS for motion.
- **Accessibility:** `prefers-reduced-motion` kills the animation entirely. Each logo has `alt={platform.name}`.
- **Performance:** Single inline `<style>` block for the marquee keyframes. Total payload ~50KB (external SVGs, cached by CDN).

## Files
- `src/lib/supported-platforms.ts` — data (platforms array, types)
- `src/components/features/landing/SupportedPlatforms.tsx` — the component
- `src/components/features/home/InputSection.tsx` — mount point + typo fix (`שימשת → השתמשת`)

## Non-goals
- No click-through to platform sites (prevents users from leaving the homepage)
- No per-platform tooltips (keep it lightweight)
- No i18n key — hardcoded Hebrew matches the rest of InputSection

## Future
- When we want to go offline-first we'll swap the CDN for local SVGs in `public/logos/platforms/`.
