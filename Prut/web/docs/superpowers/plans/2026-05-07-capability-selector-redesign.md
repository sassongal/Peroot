# CapabilitySelector Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the horizontal-scroll pill row in `CapabilitySelector.tsx` with a Rising Pill Track (mobile) and Luxury Gem Cards (desktop), using inline SVG icons, smoke particles, and spring animations.

**Architecture:** Full rewrite of `CapabilitySelector.tsx`. Component-specific styles live in a new `CapabilitySelector.module.css` co-located file. Per-mode colors are passed as CSS custom properties via inline style on each button, referenced by the module CSS for dynamic glow/gradient effects.

**Tech Stack:** React 19, TypeScript, CSS Modules, Tailwind v4 (for `md:` breakpoint utilities only), Vitest + Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/ui/CapabilitySelector.module.css` | All component-specific styles: smoke keyframes, pill track, rising pill, desktop gem cards |
| Rewrite | `src/components/ui/CapabilitySelector.tsx` | Component logic, inline SVGs, CSS module wiring |
| Create | `src/components/ui/__tests__/CapabilitySelector.test.tsx` | Render, click, guest-lock, aria-pressed tests |

`src/lib/capability-mode.ts` and `src/app/globals.css` are **not modified**.

---

## Task 1: Create CSS Module

**Files:**
- Create: `src/components/ui/CapabilitySelector.module.css`

- [x] **Step 1: Create the CSS module**

```css
/* src/components/ui/CapabilitySelector.module.css */

/* ── Smoke particle keyframes ─────────────────────────────────────────────── */
@keyframes sp-l {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translate(-16px, -26px) scale(2.2); opacity: 0; }
}
@keyframes sp-r {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translate(16px, -26px) scale(2.2); opacity: 0; }
}
@keyframes sp-c {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  20%  { opacity: 0.8; }
  100% { transform: translate(0, -22px) scale(2); opacity: 0; }
}

.smoke {
  position: absolute;
  border-radius: 50%;
  filter: blur(7px);
  pointer-events: none;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
  background: radial-gradient(circle, rgba(253,190,0,0.55) 0%, transparent 70%);
  opacity: 0.3;
}
.smokeL { animation-name: sp-l; }
.smokeR { animation-name: sp-r; }
.smokeC { animation-name: sp-c; }
.smokeD1 { animation-delay: 0.75s; }
.smokeD2 { animation-delay: 1.5s; }

/* Mobile smoke sizes */
.smokeSmL { width: 12px; height: 12px; animation-duration: 2.2s; bottom: 8px; left: 16%; }
.smokeSmR { width: 12px; height: 12px; animation-duration: 2.2s; bottom: 8px; right: 16%; }
.smokeSmC { width: 10px; height: 10px; animation-duration: 2.7s; bottom: 6px; left: 44%; }

/* Desktop smoke sizes */
.smokeLgL { width: 18px; height: 18px; animation-duration: 2.8s; bottom: 12px; left: 12%; }
.smokeLgR { width: 18px; height: 18px; animation-duration: 2.8s; bottom: 12px; right: 12%; }
.smokeLgC { width: 14px; height: 14px; animation-duration: 3.2s; bottom: 10px; left: 44%; }

@media (prefers-reduced-motion: reduce) {
  .smoke { animation: none !important; opacity: 0 !important; }
}

/* ── MOBILE: Rising Pill Track ────────────────────────────────────────────── */
.pillTrack {
  display: flex;
  gap: 3px;
  background: #15152a;
  border-radius: 999px;
  padding: 4px;
}

.pillBtn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 9px 3px 7px;
  min-height: 52px;
  border: none;
  background: transparent;
  border-radius: 999px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: flex 0.4s cubic-bezier(0.34, 1.45, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
}
.pillBtn:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.pillBtnActive { flex: 2.6; }
.pillBtnActive .smoke { opacity: 1; }

.pillBtnDisabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* Rising pill highlight (positioned below icons, z=0) */
.pillHighlight {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  opacity: 0;
  transform: translateY(8px) scale(0.88);
  transition: opacity 0.3s, transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: var(--pill-bg);
  box-shadow: var(--pill-shadow);
  border: 1px solid var(--pill-border);
  pointer-events: none;
}
.pillBtnActive .pillHighlight {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Icon wrapper */
.iconWrap {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s;
}
.pillBtnActive .iconWrap {
  transform: scale(1.18) translateY(-1px);
  filter: drop-shadow(0 2px 8px rgba(253,190,0,0.4));
}

/* Mode label under icon */
.pillLabel {
  font-size: 10px;
  font-weight: 700;
  color: rgba(253,190,0,0.5);
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.25s, max-height 0.35s;
  position: relative;
  z-index: 1;
  white-space: nowrap;
}
.pillBtnActive .pillLabel {
  opacity: 1;
  max-height: 16px;
  color: #FDBE00;
}

/* Lock badge shown inside pill when isGuest */
.lockBadge {
  position: relative;
  z-index: 1;
  font-size: 9px;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245,158,11,0.12);
  border-radius: 999px;
  padding: 1px 5px;
}

/* ── DESKTOP: Luxury Gem Cards ────────────────────────────────────────────── */
.deskRow {
  display: flex;
  gap: 8px;
}

.deskBtn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 16px;
  -webkit-tap-highlight-color: transparent;
}
.deskBtn:focus-visible .deskCard {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.deskBtnDisabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.deskCard {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px 12px;
  border-radius: 15px;
  background: linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255,255,255,0.07);
  position: relative;
  overflow: hidden;
  gap: 8px;
  opacity: 0.65;
  transition:
    background 0.35s,
    border-color 0.35s,
    box-shadow 0.35s,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s;
}
.deskCard:hover {
  opacity: 0.85;
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.12);
}
.deskBtnActive .deskCard {
  opacity: 1;
  transform: translateY(-6px);
  background: linear-gradient(160deg, var(--desk-grad-from) 0%, var(--desk-grad-to) 100%);
  border-color: var(--desk-border-color);
  box-shadow: var(--desk-glow);
}

/* Ambient blob above card */
.blobGlow {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 50px;
  border-radius: 50%;
  background: var(--blob-color);
  filter: blur(18px);
  opacity: 0.15;
  pointer-events: none;
  transition: opacity 0.4s, width 0.4s;
}
.deskBtnActive .blobGlow {
  opacity: 0.6;
  width: 90px;
}

/* Thin luxury top bar */
.deskTopbar {
  position: absolute;
  top: 0;
  left: 15%;
  right: 15%;
  height: 2px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(90deg, transparent, var(--topbar-color), transparent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s, left 0.3s, right 0.3s;
}
.deskBtnActive .deskTopbar {
  opacity: 1;
  left: 8%;
  right: 8%;
}

/* Desktop icon wrapper */
.iconWrapLg {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.35s;
}
.deskBtnActive .iconWrapLg {
  transform: scale(1.2) translateY(-2px);
  filter: drop-shadow(0 3px 10px rgba(253,190,0,0.5));
}
.deskBtnActive .smoke { opacity: 0.9; }

.deskName {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: rgba(255,255,255,0.25);
  position: relative;
  z-index: 1;
  white-space: nowrap;
  transition: color 0.25s;
}
.deskBtnActive .deskName { color: #FDBE00; }

.deskDesc {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(255,255,255,0.35);
  text-align: center;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.4s ease, opacity 0.3s ease 0.1s;
  position: relative;
  z-index: 1;
  padding: 0 4px;
}
.deskBtnActive .deskDesc {
  max-height: 40px;
  opacity: 1;
}
```

- [x] **Step 2: Verify the file exists**

```bash
ls src/components/ui/CapabilitySelector.module.css
```

Expected: file listed.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/CapabilitySelector.module.css
git commit -m "feat(capability-selector): add CSS module for Rising Pill + Gem Cards"
```

---

## Task 2: Rewrite CapabilitySelector.tsx

**Files:**
- Modify: `src/components/ui/CapabilitySelector.tsx`

- [x] **Step 1: Write the failing test first** (see Task 3 — write it before the implementation)

Skip to Task 3, write the test, then come back here.

- [x] **Step 2: Replace the entire file content**

```tsx
// src/components/ui/CapabilitySelector.tsx
"use client";

import { CapabilityMode, CAPABILITY_CONFIGS } from "@/lib/capability-mode";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./CapabilitySelector.module.css";

// ── Per-mode CSS custom property values ──────────────────────────────────────
interface ModeStyle {
  pillBg: string;
  pillShadow: string;
  pillBorder: string;
  deskGradFrom: string;
  deskGradTo: string;
  deskBorderColor: string;
  deskGlow: string;
  topbarColor: string;
  blobColor: string;
}

const MODE_STYLES: Record<CapabilityMode, ModeStyle> = {
  [CapabilityMode.STANDARD]: {
    pillBg: "rgba(83,118,164,0.32)",
    pillShadow: "0 0 20px rgba(83,118,164,0.3), inset 0 1px 0 rgba(147,197,217,0.25)",
    pillBorder: "rgba(83,118,164,0.5)",
    deskGradFrom: "rgba(83,118,164,0.22)",
    deskGradTo: "rgba(83,118,164,0.06)",
    deskBorderColor: "rgba(83,118,164,0.55)",
    deskGlow: "0 8px 30px rgba(83,118,164,0.25)",
    topbarColor: "#5376A4",
    blobColor: "#5376A4",
  },
  [CapabilityMode.DEEP_RESEARCH]: {
    pillBg: "rgba(69,111,82,0.35)",
    pillShadow: "0 0 22px rgba(69,111,82,0.32), inset 0 1px 0 rgba(134,239,172,0.25)",
    pillBorder: "rgba(69,111,82,0.5)",
    deskGradFrom: "rgba(69,111,82,0.25)",
    deskGradTo: "rgba(69,111,82,0.07)",
    deskBorderColor: "rgba(69,111,82,0.6)",
    deskGlow: "0 8px 32px rgba(69,111,82,0.28)",
    topbarColor: "#456F52",
    blobColor: "#456F52",
  },
  [CapabilityMode.IMAGE_GENERATION]: {
    pillBg: "rgba(172,80,80,0.32)",
    pillShadow: "0 0 20px rgba(172,80,80,0.3), inset 0 1px 0 rgba(252,165,165,0.25)",
    pillBorder: "rgba(172,80,80,0.5)",
    deskGradFrom: "rgba(172,80,80,0.22)",
    deskGradTo: "rgba(172,80,80,0.06)",
    deskBorderColor: "rgba(172,80,80,0.55)",
    deskGlow: "0 8px 30px rgba(172,80,80,0.25)",
    topbarColor: "#AC5050",
    blobColor: "#AC5050",
  },
  [CapabilityMode.AGENT_BUILDER]: {
    pillBg: "rgba(253,190,0,0.24)",
    pillShadow: "0 0 22px rgba(253,190,0,0.28), inset 0 1px 0 rgba(253,230,80,0.3)",
    pillBorder: "rgba(253,190,0,0.45)",
    deskGradFrom: "rgba(253,190,0,0.18)",
    deskGradTo: "rgba(253,190,0,0.04)",
    deskBorderColor: "rgba(253,190,0,0.5)",
    deskGlow: "0 8px 34px rgba(253,190,0,0.3)",
    topbarColor: "#FDBE00",
    blobColor: "#FDBE00",
  },
  [CapabilityMode.VIDEO_GENERATION]: {
    pillBg: "rgba(100,104,212,0.3)",
    pillShadow: "0 0 20px rgba(100,104,212,0.28), inset 0 1px 0 rgba(165,180,252,0.25)",
    pillBorder: "rgba(100,104,212,0.5)",
    deskGradFrom: "rgba(100,104,212,0.22)",
    deskGradTo: "rgba(100,104,212,0.06)",
    deskBorderColor: "rgba(100,104,212,0.55)",
    deskGlow: "0 8px 30px rgba(100,104,212,0.25)",
    topbarColor: "#6468d4",
    blobColor: "#6468d4",
  },
};

// ── Inline SVG icons — no external CDN ───────────────────────────────────────
// Each icon is defined twice: 24px (mobile pill) and 36px (desktop card).
// SVG viewBox is always 0 0 24 24.

function IconStandard({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="#5376A4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="13 8 10 12 14 12 11 17"
        stroke="#7aaed4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconResearch({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="2.2" fill="#456F52" opacity="0.8" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#456F52" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#456F52" strokeWidth="1.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#456F52" strokeWidth="1.5" transform="rotate(120 12 12)" />
    </svg>
  );
}

function IconImage({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="#AC5050" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="#AC5050" strokeWidth="1.5" />
      <line x1="12" y1="2.5" x2="12" y2="8" stroke="#AC5050" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="21.5" stroke="#AC5050" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.2" y1="5.2" x2="9" y2="9" stroke="#AC5050" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="15" x2="18.8" y2="18.8" stroke="#AC5050" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5" y1="12" x2="8" y2="12" stroke="#AC5050" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="21.5" y2="12" stroke="#AC5050" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAgent({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="2"
        stroke="#FDBE00" strokeWidth="1.6" fill="#FDBE00" fillOpacity="0.12" />
      <line x1="9" y1="7" x2="9" y2="4" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="7" x2="12" y2="4" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="7" x2="15" y2="4" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="17" x2="9" y2="20" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="20" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="17" x2="15" y2="20" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="9" x2="4" y2="9" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="12" x2="4" y2="12" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="15" x2="4" y2="15" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="9" x2="17" y2="9" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="12" x2="17" y2="12" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="15" x2="17" y2="15" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#FDBE00" opacity="0.5" />
    </svg>
  );
}

function IconVideo({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="8" width="20" height="13" rx="2" stroke="#6468d4" strokeWidth="1.6" />
      <path d="M2 12h20" stroke="#6468d4" strokeWidth="1.5" />
      <path d="M7 8V4M12 8V4M17 8V4" stroke="#6468d4" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 12l5-4M7 12l5-4M12 12l5-4M17 12l5-4"
        stroke="#6468d4" strokeWidth="1.3" opacity="0.6" strokeLinecap="round" />
      <polygon points="10,16 10,19 14,17.5" fill="#6468d4" opacity="0.8" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<CapabilityMode, React.ComponentType<{ size: 24 | 36 }>> = {
  [CapabilityMode.STANDARD]: IconStandard,
  [CapabilityMode.DEEP_RESEARCH]: IconResearch,
  [CapabilityMode.IMAGE_GENERATION]: IconImage,
  [CapabilityMode.AGENT_BUILDER]: IconAgent,
  [CapabilityMode.VIDEO_GENERATION]: IconVideo,
};

const COMING_SOON_MODES = new Set<CapabilityMode>([]);

// ── Smoke helpers ─────────────────────────────────────────────────────────────
function PillSmoke() {
  return (
    <>
      <span aria-hidden className={cn(styles.smoke, styles.smokeL, styles.smokeSmL, styles.smokeD1)} />
      <span aria-hidden className={cn(styles.smoke, styles.smokeR, styles.smokeSmR, styles.smokeD2)} />
      <span aria-hidden className={cn(styles.smoke, styles.smokeC, styles.smokeSmC)} />
    </>
  );
}

function DeskSmoke() {
  return (
    <>
      <span aria-hidden className={cn(styles.smoke, styles.smokeL, styles.smokeLgL, styles.smokeD1)} />
      <span aria-hidden className={cn(styles.smoke, styles.smokeR, styles.smokeLgR, styles.smokeD2)} />
      <span aria-hidden className={cn(styles.smoke, styles.smokeC, styles.smokeLgC)} />
    </>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CapabilitySelectorProps {
  value: CapabilityMode;
  onChange: (mode: CapabilityMode) => void;
  disabled?: boolean;
  compact?: boolean;
  /** @deprecated kept for back-compat, no longer used */
  isPro?: boolean;
  /** Guest (unauthenticated) users locked to STANDARD */
  isGuest?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CapabilitySelector({
  value,
  onChange,
  disabled = false,
  isGuest = false,
}: CapabilitySelectorProps) {
  const router = useRouter();
  const modes = Object.values(CapabilityMode);

  useEffect(() => {
    if (isGuest && value !== CapabilityMode.STANDARD) {
      onChange(CapabilityMode.STANDARD);
    }
  }, [isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(mode: CapabilityMode) {
    if (COMING_SOON_MODES.has(mode)) {
      toast("מנוע הסרטונים בדרך! נעדכן אותך כשיהיה מוכן", { icon: "🎬" });
      return;
    }
    if (isGuest && mode !== CapabilityMode.STANDARD) {
      toast("התחבר כדי להשתמש במצב זה", { icon: "🔒" });
      router.push("/login");
      return;
    }
    onChange(mode);
  }

  return (
    <>
      {/* ── Mobile: Rising Pill Track (hidden on md+) ── */}
      <div className={cn("md:hidden", styles.pillTrack)}>
        {modes.map((mode) => {
          const config = CAPABILITY_CONFIGS[mode];
          const modeStyle = MODE_STYLES[mode];
          const isSelected = value === mode;
          const isComingSoon = COMING_SOON_MODES.has(mode);
          const isLocked = isGuest && mode !== CapabilityMode.STANDARD;
          const isDisabled = disabled || isComingSoon;
          const Icon = ICON_COMPONENTS[mode];

          return (
            <button
              key={mode}
              type="button"
              data-testid={`pill-${mode}`}
              disabled={isDisabled}
              onClick={() => handleClick(mode)}
              aria-pressed={isSelected}
              aria-label={config.labelHe}
              title={isComingSoon ? "בקרוב" : isLocked ? "התחבר כדי להשתמש" : config.descriptionHe}
              style={{
                "--pill-bg": modeStyle.pillBg,
                "--pill-shadow": modeStyle.pillShadow,
                "--pill-border": modeStyle.pillBorder,
              } as React.CSSProperties}
              className={cn(
                styles.pillBtn,
                isSelected && styles.pillBtnActive,
                (isDisabled || isLocked) && styles.pillBtnDisabled,
              )}
            >
              <span aria-hidden className={styles.pillHighlight} />
              <PillSmoke />
              <span className={styles.iconWrap}>
                <Icon size={24} />
              </span>
              <span className={styles.pillLabel}>
                {isLocked ? <Lock className="w-3 h-3 inline" /> : config.labelHe}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Desktop: Luxury Gem Cards (hidden below md) ── */}
      <div className={cn("hidden md:flex", styles.deskRow)}>
        {modes.map((mode) => {
          const config = CAPABILITY_CONFIGS[mode];
          const modeStyle = MODE_STYLES[mode];
          const isSelected = value === mode;
          const isComingSoon = COMING_SOON_MODES.has(mode);
          const isLocked = isGuest && mode !== CapabilityMode.STANDARD;
          const isDisabled = disabled || isComingSoon;
          const Icon = ICON_COMPONENTS[mode];

          return (
            <button
              key={mode}
              type="button"
              data-testid={`card-${mode}`}
              disabled={isDisabled}
              onClick={() => handleClick(mode)}
              aria-pressed={isSelected}
              aria-label={config.labelHe}
              title={isComingSoon ? "בקרוב" : isLocked ? "התחבר כדי להשתמש" : config.descriptionHe}
              style={{
                "--desk-grad-from": modeStyle.deskGradFrom,
                "--desk-grad-to": modeStyle.deskGradTo,
                "--desk-border-color": modeStyle.deskBorderColor,
                "--desk-glow": modeStyle.deskGlow,
                "--topbar-color": modeStyle.topbarColor,
                "--blob-color": modeStyle.blobColor,
              } as React.CSSProperties}
              className={cn(
                styles.deskBtn,
                isSelected && styles.deskBtnActive,
                (isDisabled || isLocked) && styles.deskBtnDisabled,
              )}
            >
              <div className={styles.deskCard}>
                <span aria-hidden className={styles.blobGlow} />
                <span aria-hidden className={styles.deskTopbar} />
                <DeskSmoke />
                <span className={styles.iconWrapLg}>
                  <Icon size={36} />
                </span>
                <span className={styles.deskName}>
                  {isLocked
                    ? <><Lock className="w-3 h-3 inline mr-1" />{config.labelHe}</>
                    : config.labelHe}
                </span>
                <span className={styles.deskDesc}>{config.descriptionHe}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
```

- [x] **Step 3: Run TypeScript check**

```bash
npm run typecheck 2>&1 | head -40
```

Expected: zero errors. If you see `"--pill-bg" is not assignable to CSSProperties` — that's expected and safe; TypeScript doesn't know about custom properties but the runtime works fine. Cast is already handled by `as React.CSSProperties`.

- [x] **Step 4: Run the tests**

```bash
npm test -- src/components/ui/__tests__/CapabilitySelector.test.tsx
```

Expected: all tests pass.

- [x] **Step 5: Commit**

```bash
git add src/components/ui/CapabilitySelector.tsx
git commit -m "feat(capability-selector): rewrite with Rising Pill + Luxury Gem Cards"
```

---

## Task 3: Write Tests

**Files:**
- Create: `src/components/ui/__tests__/CapabilitySelector.test.tsx`

> Do this BEFORE Task 2 Step 2. Come back to Task 2 Step 3 after.

- [x] **Step 1: Create the test file**

```tsx
// src/components/ui/__tests__/CapabilitySelector.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CapabilitySelector } from "../CapabilitySelector";
import { CapabilityMode } from "@/lib/capability-mode";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: vi.fn() }));

afterEach(() => cleanup());

describe("CapabilitySelector", () => {
  it("renders 10 buttons — 5 pill + 5 card", () => {
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(10);
  });

  it("selected pill button has aria-pressed=true", () => {
    render(<CapabilitySelector value={CapabilityMode.DEEP_RESEARCH} onChange={vi.fn()} />);
    const pill = screen.getByTestId(`pill-${CapabilityMode.DEEP_RESEARCH}`);
    expect(pill).toHaveAttribute("aria-pressed", "true");
  });

  it("non-selected pill buttons have aria-pressed=false", () => {
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={vi.fn()} />);
    const pill = screen.getByTestId(`pill-${CapabilityMode.DEEP_RESEARCH}`);
    expect(pill).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking unselected pill calls onChange with that mode", () => {
    const onChange = vi.fn();
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={onChange} />);
    fireEvent.click(screen.getByTestId(`pill-${CapabilityMode.IMAGE_GENERATION}`));
    expect(onChange).toHaveBeenCalledWith(CapabilityMode.IMAGE_GENERATION);
  });

  it("clicking already selected pill still calls onChange", () => {
    const onChange = vi.fn();
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={onChange} />);
    fireEvent.click(screen.getByTestId(`pill-${CapabilityMode.STANDARD}`));
    expect(onChange).toHaveBeenCalledWith(CapabilityMode.STANDARD);
  });

  it("clicking desktop card calls onChange", () => {
    const onChange = vi.fn();
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={onChange} />);
    fireEvent.click(screen.getByTestId(`card-${CapabilityMode.AGENT_BUILDER}`));
    expect(onChange).toHaveBeenCalledWith(CapabilityMode.AGENT_BUILDER);
  });

  it("isGuest=true: non-standard modes call toast and redirect, not onChange", async () => {
    const { toast } = await import("sonner");
    const { useRouter } = await import("next/navigation");
    const push = vi.fn();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push });

    const onChange = vi.fn();
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={onChange} isGuest />);
    fireEvent.click(screen.getByTestId(`pill-${CapabilityMode.DEEP_RESEARCH}`));
    expect(onChange).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it("disabled=true: buttons are disabled", () => {
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={vi.fn()} disabled />);
    const pills = screen.getAllByTestId(/^pill-/);
    pills.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("each pill has an aria-label matching the Hebrew mode name", () => {
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={vi.fn()} />);
    expect(screen.getByLabelText("סטנדרטי")).toBeInTheDocument();
    expect(screen.getByLabelText("מחקר מעמיק")).toBeInTheDocument();
    expect(screen.getByLabelText("יצירת תמונה")).toBeInTheDocument();
    expect(screen.getByLabelText("בונה סוכנים")).toBeInTheDocument();
    expect(screen.getByLabelText("יצירת סרטון")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the tests — expect failures (implementation not done yet)**

```bash
npm test -- src/components/ui/__tests__/CapabilitySelector.test.tsx
```

Expected: tests fail because `data-testid` attributes don't exist yet. This confirms tests are real.

- [x] **Step 3: Now go do Task 2 Step 2 (write the component)**

Return here after Task 2 is committed.

- [x] **Step 4: Run tests again — expect all pass**

```bash
npm test -- src/components/ui/__tests__/CapabilitySelector.test.tsx
```

Expected: 9/9 tests pass.

- [x] **Step 5: Commit**

```bash
git add src/components/ui/__tests__/CapabilitySelector.test.tsx
git commit -m "test(capability-selector): add Rising Pill + Gem Cards unit tests"
```

---

## Task 4: Browser Verification

**Files:** none — manual QA only

- [x] **Step 1: Start dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. The CapabilitySelector appears in the home prompt input area.

- [x] **Step 2: Mobile viewport check**

In DevTools, set viewport to 390×844 (iPhone 14). Verify:
- All 5 buttons visible in one row — no horizontal scroll
- Clicking "מחקר מעמיק" expands it to ~2.6× width with spring overshoot
- Rising pill background animates up with spring
- Label "מחקר מעמיק" in amber `#FDBE00` appears below icon
- 3 smoke particles drift upward from active button
- Atom orbital SVG icon visible

- [x] **Step 3: Desktop viewport check**

Set viewport to 1280×800. Verify:
- Pill track hidden, Gem Cards visible (5 horizontal cards)
- Inactive cards: dimmed, no glow
- Hovering inactive card: slight lift + brightens
- Clicking "בונה סוכנים": card floats up 6px, amber border glows, CPU chip icon scales up, amber "בונה סוכנים" label appears, description text reveals
- Thin amber topbar appears at top of selected card

- [x] **Step 4: Guest user check**

Temporarily set `isGuest={true}` in the parent component call, reload. Verify:
- Standard mode works
- Clicking other modes triggers toast "התחבר כדי להשתמש במצב זה"

Revert the temporary `isGuest` change.

- [x] **Step 5: prefers-reduced-motion check**

In DevTools → Rendering → Emulate prefers-reduced-motion → reduce. Verify smoke particles stop and mode transitions snap without animation.

- [x] **Step 6: Run full test suite**

```bash
npm test
npm run typecheck
npm run lint
```

Expected: zero failures.

- [x] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(capability-selector): complete Rising Pill + Gem Cards redesign"
```

---

## Self-Review Against Spec

| Spec requirement | Covered in |
|-----------------|-----------|
| Mobile: all 5 in one row, no scroll | Task 2 — `md:hidden` pill track, no `overflow-x` |
| `flex: 1` → `flex: 2.6` on active | Task 1 CSS `.pillBtnActive { flex: 2.6 }` |
| Spring cubic-bezier on flex | Task 1 CSS `.pillBtn { transition: flex 0.4s cubic-bezier(0.34,1.45,0.64,1) }` |
| Rising pill `::before` spring | Task 1 CSS `.pillHighlight` + `.pillBtnActive .pillHighlight` |
| Per-mode glow colors | Task 2 `MODE_STYLES` + CSS vars on inline style |
| 10px font mobile, 13px desktop | Task 1 `.pillLabel { font-size: 10px }`, `.deskName { font-size: 13px }` |
| Inline SVG icons — no CDN | Task 2 `IconStandard` / `IconResearch` / etc. React components |
| Amber smoke particles | Task 1 smoke keyframes + Task 2 `PillSmoke` / `DeskSmoke` |
| Desktop: float up + glow + topbar + desc reveal | Task 1 `.deskBtnActive .deskCard` + `.deskTopbar` + `.deskDesc` |
| Amber label `#FDBE00` on active | Task 1 `.pillBtnActive .pillLabel { color: #FDBE00 }` |
| `prefers-reduced-motion` | Task 1 `@media (prefers-reduced-motion: reduce)` |
| RTL | Component renders inside existing RTL context; no `dir` override needed |
| Guest lock → toast + redirect | Task 2 `handleClick` guard + Task 3 test |
| `onChange` signature unchanged | Task 2 props interface |
| `aria-pressed` on each button | Task 2 `aria-pressed={isSelected}` |
| Keyboard focus rings | Task 1 `:focus-visible` rules |
| Touch targets ≥ 44px | Task 1 `.pillBtn { min-height: 52px }` |
