# Performance Fixes + Onboarding Change — Design

**Date:** 2026-05-02
**Author:** Gal Sasson (with Claude)
**Status:** Approved — ready for plan
**Scope:** One PR

---

## Context

A Chrome DevTools profile of `https://peroot.space` (homepage, cold load) on
2026-05-02 produced these Core Web Vitals:

| Metric | Measured | Threshold (Good) |
|---|---|---|
| TTFB  | 2,092 ms | <600 ms |
| FCP   | 5,811 ms | <1,800 ms |
| LCP   | 7,344 ms | <2,500 ms |
| CLS   | **1.87** | <0.1 |

The dominant problem is **CLS = 1.87**, which is catastrophic. Top shift sources:

- `MAIN.grow + FOOTER` shifting by 1.0 at t=5.8s (whole page reflows)
- `WhatIsThisModal` bottom-sheet animating in (`max-h-[88vh]`) shifting 0.52 at t=6.5s
- Footer shifting again 0.31 at t=6s

The LCP element is the YouTube thumbnail
(`https://i.ytimg.com/vi/B8_n6uO3Qy4/hqdefault.jpg`, 165KB) inside
`WhatIsThisModal`. The modal auto-opens for first-time visitors via a
`useEffect` in `HomeClient.tsx`, which is the root cause of both the LCP being
a YouTube thumbnail and most of the CLS.

Secondary issues: 47 JS chunks (763KB), 43KB render-blocking CSS, RSC prefetch
storm for `/privacy` and `/contact` during initial load.

## Goals

1. **Remove the auto-popup of "מה עושים פה" on first visit.** The modal continues
   to exist and is opened only when the user clicks the existing
   "מה עושים פה" button.
2. **Drive CLS to <0.1** on the homepage cold load.
3. **Reduce LCP and TTFB** on the homepage cold load — targets:
   - TTFB <800 ms
   - LCP <2.5 s
4. Keep all changes scoped to one PR; no architectural refactors.

## Non-Goals

- Lighthouse CI gating (separate PR).
- Code-splitting audit of `react-force-graph` (revisit only if it surfaces as
  the new LCP).
- Changes to `OnboardingOverlay.tsx` (the role/goal capture flow). It does not
  contain the video and is unrelated to this work.
- Removing or moving the video itself — it stays inside `WhatIsThisModal`
  (still play-on-click thumbnail). Only the auto-popup is removed.

## Design

### Change 1 — Remove auto-popup of WhatIsThisModal

**File:** `src/app/HomeClient.tsx`

Delete the `useEffect` at lines 277–282 that reads
`peroot_seen_explainer` from `localStorage` and calls `setShowWhatIsThis(true)`
on first visit. Also delete the corresponding localStorage write — the key is
no longer used.

The state (`showWhatIsThis`), the modal render, and the open/close handlers
remain unchanged. The "מה עושים פה" button (already wired through
`onOpenWhatIsThis`) becomes the only entry point.

**Expected effect:**
- Eliminates the 0.52 + (likely large portion of) 1.0 + 0.31 layout shifts that
  fire when the modal animates in.
- Removes the YouTube thumbnail from the LCP candidate set (it now only loads
  on user click).
- Removes ~165KB of network for users who don't open the modal.

**Risk:** First-time visitors no longer get an automatic explainer. The
"מה עושים פה" button is already visible in the hero; we accept this.

### Change 2 — CLS hardening on hero + footer

After Change 1, re-profile to confirm what residual CLS exists. Two likely
fixes:

1. **Hebrew font swap reflow.** Verify font loading uses
   `next/font` with size-adjust fallback metrics so the body text doesn't
   reflow when the web font swaps in. If `next/font` is already in use
   (`frank_ruhl_libre` and `alef` were observed in the body class list),
   confirm `adjustFontFallback` is on and add `display: 'swap'` if missing.
2. **Reserve hero/footer space.** If the hero card or prompt input collapses
   from zero height during hydration, set a `min-h-[…]` on the hero container
   matching its hydrated height so the footer doesn't jump.

These two fixes are conditional on what step 2 of the execution order reveals
— we won't add them speculatively.

### Change 3 — LCP / TTFB pass

Three independent investigations, each landing only if it produces a
measurable improvement:

1. **TTFB — `src/proxy.ts`.** Profile time spent in the proxy on a homepage
   request. The Supabase session refresh runs on every route. Two options:
   - Tighten the `matcher` config to skip the homepage path for unauthenticated
     visitors, or
   - Make the session refresh non-blocking for routes that don't require auth.
   Pick whichever the actual code shape supports cleanly.
2. **Render-blocking CSS (43KB in `03kr3xsg_3u7-.css`).** Confirm Next.js
   critical CSS extraction is enabled (it is by default in App Router). If
   the file contains globally-loaded but route-scoped styles
   (e.g., admin, library, graph), move them behind dynamic imports or
   route-segment CSS.
3. **Third-party scripts.** Audit `<Script>` usage for Sentry, PostHog,
   Clarity, GA4 — ensure they use `strategy="afterInteractive"` or
   `lazyOnload`. Anything currently `beforeInteractive` for analytics is wrong.

### Order of execution

1. Land Change 1 (lowest risk, biggest win).
2. Re-profile production after deploy. Capture CLS, LCP, LCP element, top
   shifts.
3. Apply Change 2 fixes that the new profile actually justifies.
4. Apply Change 3 investigations in parallel; keep only those producing a
   measurable improvement.
5. Final re-profile; record before/after numbers in the PR description.

## Testing

- **Unit/integration:** No new logic. Existing tests for `HomeClient` should
  still pass (`npm run test`).
- **Manual smoke:**
  - Cold-load `/` in incognito → no modal auto-opens.
  - Click "מה עושים פה" → modal opens; click the play overlay → YouTube
    iframe loads and plays.
  - Press Escape → modal closes.
  - Reload page → still no auto-open (localStorage key gone is irrelevant).
- **Performance verification:** Re-run the Chrome DevTools profile against the
  preview deployment and against `peroot.space` after merge. Compare TTFB,
  FCP, LCP, CLS, LCP element.

## Rollout

- Single PR to `main`.
- Vercel preview deployment used for the post-Change-1 re-profile.
- No feature flag — the change is a deletion + light tuning.

## Success Criteria

- CLS on homepage cold load: <0.1 (from 1.87).
- LCP: <2.5 s (from 7.3 s).
- TTFB: <800 ms (from 2.1 s) — stretch; ship the PR even if TTFB only
  partially improves, as long as CLS and LCP targets are met.
- The "מה עושים פה" modal still works exactly as before when triggered by
  the button.
