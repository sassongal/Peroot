# ResultSection Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `ResultSection.tsx` with gem-style platform buttons, an expanding top toolbar, a collapsible "עוד אפשרויות" panel, and a credit-confirmation popup for "שפר שוב".

**Architecture:** All new styles live in a new `ResultSection.module.css` (CSS Modules). The `.tsx` file gains three new state variables (`showMorePanel`, `showRefineConfirm`, `savedToLibrary`) and a new optional prop (`creditsLeft`). The platform row and action bar are rewritten; everything else (BeforeAfterSplit, variables panel, score drawer, interrupted-stream warning) stays untouched.

**Tech Stack:** Next.js App Router · React 19 · TypeScript 5 · CSS Modules · Lucide React · Vitest + Testing Library

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/components/features/prompt-improver/ResultSection.module.css` |
| Modify | `src/components/features/prompt-improver/ResultSection.tsx` |
| Create | `src/components/features/prompt-improver/__tests__/ResultSection.test.tsx` |

---

## Task 1: Create CSS Module

**Files:**
- Create: `src/components/features/prompt-improver/ResultSection.module.css`

- [ ] **Step 1: Create the CSS module file**

```css
/* src/components/features/prompt-improver/ResultSection.module.css */

/* ── Expanding icon button (top toolbar) ──────────────────────── */
.xBtn {
  display: flex;
  align-items: center;
  gap: 0;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 0 9px;
  min-width: 34px;
  white-space: nowrap;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.xBtn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.18);
  padding: 0 13px 0 11px;
  gap: 6px;
}
.xBtn:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.xBtn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.xBtnGold {
  background: rgba(253, 190, 0, 0.08);
  border-color: rgba(253, 190, 0, 0.2);
  color: #FDBE00;
}
.xBtnGold:hover {
  background: rgba(253, 190, 0, 0.16);
  border-color: rgba(253, 190, 0, 0.35);
}

.xBtnLabel {
  font-size: 12px;
  font-weight: 700;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-width 0.28s ease, opacity 0.2s ease;
  font-family: var(--font-alef), sans-serif;
  letter-spacing: 0.01em;
}
.xBtn:hover .xBtnLabel {
  max-width: 100px;
  opacity: 1;
}

/* ── Platform row (gem buttons) ───────────────────────────────── */
.platformRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}
.platformRow::-webkit-scrollbar { display: none; }

.sectionLabel {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.28);
  text-transform: uppercase;
  font-family: var(--font-varela), sans-serif;
  white-space: nowrap;
  flex-shrink: 0;
}

.gemBtn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--gem-border);
  background: var(--gem-bg);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
}
.gemBtn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
  pointer-events: none;
}
.gemBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--gem-glow);
}
.gemBtn:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.gemBtn:hover .gemName { color: #fff; }

.gemIcon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gem-icon-bg);
  box-shadow: 0 0 12px var(--gem-glow);
  flex-shrink: 0;
}
.gemIcon svg { width: 18px; height: 18px; }

.gemName {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  font-family: var(--font-alef), sans-serif;
  letter-spacing: 0.01em;
  transition: color 0.18s;
}

.gemGpt   { --gem-bg: rgba(16,163,127,0.1);  --gem-border: rgba(16,163,127,0.22);  --gem-glow: rgba(16,163,127,0.28);  --gem-icon-bg: rgba(16,163,127,0.18); }
.gemClaude{ --gem-bg: rgba(207,121,90,0.1);  --gem-border: rgba(207,121,90,0.22);  --gem-glow: rgba(207,121,90,0.28);  --gem-icon-bg: rgba(207,121,90,0.18); }
.gemGemini{ --gem-bg: rgba(66,133,244,0.1);  --gem-border: rgba(66,133,244,0.22);  --gem-glow: rgba(66,133,244,0.28);  --gem-icon-bg: rgba(66,133,244,0.18); }

.vsep {
  width: 1px;
  height: 26px;
  background: rgba(255, 255, 255, 0.09);
  flex-shrink: 0;
  margin: 0 2px;
}

.waBtn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(37, 211, 102, 0.1);
  border: 1px solid rgba(37, 211, 102, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
}
.waBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 211, 102, 0.28);
  background: rgba(37, 211, 102, 0.18);
}
.waBtn:focus-visible {
  outline: 2px solid #25d366;
  outline-offset: 2px;
}
.waBtn svg { width: 22px; height: 22px; }

/* ── Bottom bar buttons ───────────────────────────────────────── */
.btnBack {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-alef), sans-serif;
  letter-spacing: 0.01em;
  transition: all 0.18s;
  min-height: 44px;
}
.btnBack:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.18);
}
.btnBack:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.btnBack svg { width: 14px; height: 14px; opacity: 0.65; }

/* "עוד אפשרויות" — text that collapses to icon when panel is open */
.moreBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(130, 120, 200, 0.2);
  background: rgba(130, 120, 200, 0.07);
  color: rgba(160, 150, 230, 0.65);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-alef), sans-serif;
  white-space: nowrap;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.moreBtn:hover {
  background: rgba(130, 120, 200, 0.14);
  color: rgba(180, 170, 255, 0.9);
  border-color: rgba(130, 120, 200, 0.35);
}
.moreBtn:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.moreBtn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  transition: transform 0.25s;
}
.moreBtnOpen {
  padding: 0 10px;
  gap: 0;
  min-width: 36px;
  width: 36px;
  border-color: rgba(130, 120, 200, 0.35);
  background: rgba(130, 120, 200, 0.14);
  color: rgba(180, 170, 255, 0.9);
}
.moreBtnOpen .moreBtnLabel {
  max-width: 0;
  opacity: 0;
  overflow: hidden;
}
.moreBtnOpen svg { transform: rotate(90deg); }

.moreBtnLabel {
  font-size: 12px;
  max-width: 90px;
  overflow: hidden;
  transition: max-width 0.25s ease, opacity 0.2s ease;
  opacity: 1;
  white-space: nowrap;
}

/* שפר שוב — icon-only with tooltip */
.btnRefine {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(253, 190, 0, 0.18);
  background: rgba(253, 190, 0, 0.07);
  color: #FDBE00;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.18s;
  flex-shrink: 0;
  min-height: 36px;
}
.btnRefine:hover {
  background: rgba(253, 190, 0, 0.16);
  box-shadow: 0 4px 16px rgba(253, 190, 0, 0.2);
}
.btnRefine:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.btnRefine svg { width: 15px; height: 15px; }
.btnRefine::after {
  content: 'שפר שוב · קרדיט';
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a28;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-alef), sans-serif;
  padding: 4px 9px;
  border-radius: 7px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  z-index: 10;
}
.btnRefine:hover::after { opacity: 1; }

/* Primary copy button */
.btnCopy {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #FDBE00 0%, #f59e0b 100%);
  color: #080808;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-varela), sans-serif;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 20px rgba(253, 190, 0, 0.28);
  transition: all 0.18s;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  flex-shrink: 0;
}
.btnCopy:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(253, 190, 0, 0.42);
}
.btnCopy:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.btnCopy svg { width: 16px; height: 16px; }

/* ── "עוד אפשרויות" panel ─────────────────────────────────────── */
.morePanel {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-top: none;
  border-radius: 0 0 16px 16px;
  background: rgba(14, 14, 20, 0.98);
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  transition: max-height 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease, padding 0.22s;
}
.morePanelOpen {
  max-height: 200px;
  opacity: 1;
  padding: 10px 10px 12px;
}

.morePanelLabel {
  width: 100%;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.22);
  text-transform: uppercase;
  padding: 2px 6px 5px;
  font-family: var(--font-varela), sans-serif;
}

.mpItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-alef), sans-serif;
  transition: all 0.16s;
  min-height: 44px;
}
.mpItem:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.mpItem:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.mpItem svg { width: 14px; height: 14px; opacity: 0.5; }

.mpItemDisabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.savedBadge {
  font-size: 10px;
  color: rgba(253, 190, 0, 0.7);
  font-weight: 700;
}

.mpItemDanger {
  border-color: rgba(239, 68, 68, 0.12);
  color: rgba(239, 68, 68, 0.65);
}
.mpItemDanger:hover {
  background: rgba(239, 68, 68, 0.07);
  color: rgba(239, 68, 68, 0.95);
}

/* ── Credit confirmation popup ───────────────────────────────── */
.popupOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.popup {
  width: 340px;
  max-width: 90vw;
  background: linear-gradient(145deg, #16162a 0%, #0e0e1c 100%);
  border: 1px solid rgba(253, 190, 0, 0.18);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(253, 190, 0, 0.1), 0 20px 60px rgba(0, 0, 0, 0.7);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.88); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

.popupHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.popupIconWrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(253, 190, 0, 0.1);
  border: 1px solid rgba(253, 190, 0, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 20px rgba(253, 190, 0, 0.15);
  color: #FDBE00;
}
.popupIconWrap svg { width: 20px; height: 20px; }

.popupTitle {
  font-family: var(--font-varela), sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}
.popupSub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
  font-family: var(--font-alef), sans-serif;
}

.popupBody {
  padding: 16px 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 1.7;
  font-family: var(--font-alef), sans-serif;
}

.creditRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(253, 190, 0, 0.07);
  border: 1px solid rgba(253, 190, 0, 0.14);
}
.creditIconWrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(253, 190, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #FDBE00;
}
.creditIconWrap svg { width: 14px; height: 14px; }
.creditText {
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-alef), sans-serif;
  color: rgba(255, 255, 255, 0.8);
}
.creditText span { color: #FDBE00; }
.creditText small {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  margin-top: 1px;
}

.popupActions {
  display: flex;
  gap: 8px;
  padding: 14px 20px 18px;
}
.popCancel {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-alef), sans-serif;
  transition: all 0.18s;
  min-height: 44px;
}
.popCancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.popCancel:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}
.popConfirm {
  flex: 1.6;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #FDBE00 0%, #f59e0b 100%);
  color: #080808;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: var(--font-varela), sans-serif;
  box-shadow: 0 4px 16px rgba(253, 190, 0, 0.28);
  transition: all 0.18s;
  min-height: 44px;
}
.popConfirm:hover { box-shadow: 0 6px 22px rgba(253, 190, 0, 0.42); }
.popConfirm:focus-visible {
  outline: 2px solid #FDBE00;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .xBtn, .xBtnLabel, .gemBtn, .waBtn, .moreBtn, .moreBtnLabel, .morePanel, .popup {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls src/components/features/prompt-improver/ResultSection.module.css
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.module.css
git commit -m "style(result-section): add CSS module for redesigned zones"
```

---

## Task 2: Write Tests First

**Files:**
- Create: `src/components/features/prompt-improver/__tests__/ResultSection.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/features/prompt-improver/__tests__/ResultSection.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ResultSection } from "../ResultSection";
import { CapabilityMode } from "@/lib/capability-mode";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({
    result_section: {
      title: "פרומפט משופר",
      ready: "מוכן",
      back_to_edit: "חזרה לעריכה",
      copy_tooltip: "העתק",
      copy_button: "העתק פרומפט",
      copied: "הועתק!",
      save: "שמור בספריה",
      variables_title: "משתנים",
    },
    toasts: { copied: "הועתק" },
    result: { improve_again: "שפר שוב" },
  }),
}));
vi.mock("@/components/ui/BeforeAfterSplit", () => ({
  BeforeAfterSplit: () => <div data-testid="before-after" />,
}));
vi.mock("@/components/ui/ScoreDelta", () => ({
  ScoreDelta: () => null,
}));
vi.mock("@/components/ui/ScoreBreakdownDrawer", () => ({
  ScoreBreakdownDrawer: () => null,
}));
vi.mock("@/components/features/referral/ReferralShareCTA", () => ({
  ReferralShareCTA: () => null,
}));

afterEach(() => cleanup());

const defaultProps = {
  completion: "פרומפט בדיקה",
  completionScore: null,
  improvementDelta: 0,
  copied: false,
  onCopy: vi.fn(),
  onBack: vi.fn(),
  onSave: vi.fn(),
  capabilityMode: CapabilityMode.STANDARD,
};

describe("ResultSection — redesign", () => {
  it("renders 'חזרה לעריכה' button", () => {
    render(<ResultSection {...defaultProps} />);
    expect(screen.getByRole("button", { name: /חזרה לעריכה/ })).toBeInTheDocument();
  });

  it("clicking 'חזרה לעריכה' calls onBack", () => {
    const onBack = vi.fn();
    render(<ResultSection {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /חזרה לעריכה/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("'עוד אפשרויות' button is visible by default", () => {
    render(<ResultSection {...defaultProps} />);
    expect(screen.getByRole("button", { name: /עוד אפשרויות/ })).toBeInTheDocument();
  });

  it("clicking 'עוד אפשרויות' opens the more panel", () => {
    render(<ResultSection {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /עוד אפשרויות/ }));
    expect(screen.getByTestId("more-panel")).toBeInTheDocument();
    expect(screen.getByTestId("more-panel")).toHaveClass(/morePanelOpen/);
  });

  it("'שמור בספריה' in more panel is enabled by default", () => {
    render(<ResultSection {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /עוד אפשרויות/ }));
    const saveBtn = screen.getByTestId("more-save-library");
    expect(saveBtn).not.toBeDisabled();
    expect(saveBtn).not.toHaveClass(/mpItemDisabled/);
  });

  it("after clicking save in more panel, it becomes disabled", () => {
    render(<ResultSection {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /עוד אפשרויות/ }));
    const saveBtn = screen.getByTestId("more-save-library");
    fireEvent.click(saveBtn);
    expect(saveBtn).toHaveClass(/mpItemDisabled/);
  });

  it("credit popup appears when 'שפר שוב' is clicked", () => {
    render(<ResultSection {...defaultProps} onImproveAgain={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /שפר שוב/i }));
    expect(screen.getByTestId("credit-popup")).toBeInTheDocument();
  });

  it("credit popup disappears on cancel", () => {
    render(<ResultSection {...defaultProps} onImproveAgain={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /שפר שוב/i }));
    fireEvent.click(screen.getByRole("button", { name: /ביטול/ }));
    expect(screen.queryByTestId("credit-popup")).not.toBeInTheDocument();
  });

  it("credit popup confirm calls onImproveAgain", () => {
    const onImproveAgain = vi.fn();
    render(<ResultSection {...defaultProps} onImproveAgain={onImproveAgain} />);
    fireEvent.click(screen.getByRole("button", { name: /שפר שוב/i }));
    fireEvent.click(screen.getByRole("button", { name: /שפר שוב ✓/ }));
    expect(onImproveAgain).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("credit-popup")).not.toBeInTheDocument();
  });

  it("'העתק פרומפט' calls onCopy with display text", () => {
    const onCopy = vi.fn();
    render(<ResultSection {...defaultProps} completion="text123" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: /העתק פרומפט/ }));
    expect(onCopy).toHaveBeenCalledWith("text123", expect.any(Boolean));
  });

  it("ChatGPT gem button is rendered", () => {
    render(<ResultSection {...defaultProps} />);
    expect(screen.getByRole("button", { name: /ChatGPT/ })).toBeInTheDocument();
  });

  it("ExportPdfButton is NOT rendered", () => {
    render(<ResultSection {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /PDF/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — all should FAIL (component not yet modified)**

```bash
npx vitest run src/components/features/prompt-improver/__tests__/ResultSection.test.tsx
```
Expected: multiple FAIL (missing elements, wrong structure).

- [ ] **Step 3: Commit the tests**

```bash
git add src/components/features/prompt-improver/__tests__/ResultSection.test.tsx
git commit -m "test(result-section): add tests for redesign behaviors (red)"
```

---

## Task 3: Add New State + Props + Remove ExportPdfButton

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx`

- [ ] **Step 1: Add new prop `creditsLeft` to `ResultSectionProps` interface (around line 51)**

Current:
```tsx
interface ResultSectionProps {
  completion: string;
  isLoading?: boolean;
  // ...
  isAuthenticated?: boolean;
  capabilityMode?: CapabilityMode;
  selectedPlatform?: string;
}
```

Replace the closing `}` of the interface with:
```tsx
  /** Remaining free credits today — shown in the "שפר שוב" confirm popup */
  creditsLeft?: number;
}
```

- [ ] **Step 2: Add new state variables inside the component (after the existing `useState` declarations, around line 152)**

After `const [breakdownScore, setBreakdownScore] = useState<EnhancedScore | null>(null);`, add:

```tsx
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [showRefineConfirm, setShowRefineConfirm] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
```

- [ ] **Step 3: Destructure the new prop in the function signature (around line 141)**

Add `creditsLeft,` to the destructured props list, after `selectedPlatform,`:
```tsx
  selectedPlatform,
  creditsLeft,
}: ResultSectionProps) {
```

- [ ] **Step 4: Remove the `pdfBreakdown` useMemo (lines 166–202) — no longer needed after ExportPdfButton removal**

Delete from `// Pre-compute the score breakdown for the PDF export.` through the closing `}, [completion, capabilityMode]);` (inclusive).

- [ ] **Step 5: Remove the `ExportPdfButton` import (line 34)**

Remove:
```tsx
import { ExportPdfButton } from "@/components/ui/ExportPdfButton";
```

- [ ] **Step 6: Add CSS module import after the existing imports**

Add at the top of the imports:
```tsx
import styles from "./ResultSection.module.css";
```

- [ ] **Step 7: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors (only existing ones if any).

- [ ] **Step 8: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "refactor(result-section): add state, creditsLeft prop, remove ExportPdfButton"
```

---

## Task 4: Replace the Inline Toolbar (Top Zone)

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx` (lines 335–365 area)

- [ ] **Step 1: Replace the inline toolbar block**

Find this block (around lines 335–365):
```tsx
              <div className="flex items-center justify-end gap-2 mb-3" dir="rtl">
                <ExportPdfButton
                  ...
                />
                <button
                  onClick={() => handleCopy(displayCompletion)}
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-black/5 dark:bg-white/10 ..."
                  ...
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
```

Replace with:
```tsx
              {/* ── Top toolbar: Reset · Save to Library · Copy ── */}
              <div className="flex items-center justify-between mb-3" dir="rtl">
                {/* Stage chip */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
                  style={{ background: "rgba(253,190,0,0.07)", border: "1px solid rgba(253,190,0,0.16)", color: "#FDBE00", fontFamily: "var(--font-varela)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FDBE00] shadow-[0_0_8px_#FDBE00] animate-pulse shrink-0" />
                  פרומפט מוכן
                </div>
                <div className="flex items-center gap-1.5">
                  {/* לאפס */}
                  {onReset && (
                    <button
                      onClick={onReset}
                      className={styles.xBtn}
                      aria-label="לאפס"
                      disabled={isLoading}
                    >
                      <RotateCcw className="w-[15px] h-[15px] shrink-0" />
                      <span className={styles.xBtnLabel}>לאפס</span>
                    </button>
                  )}
                  {/* שמור בספריה */}
                  <button
                    onClick={onSave}
                    className={cn(styles.xBtn, styles.xBtnGold)}
                    aria-label="שמור בספריה"
                    disabled={isLoading}
                  >
                    <BookOpen className="w-[15px] h-[15px] shrink-0" />
                    <span className={styles.xBtnLabel}>שמור בספריה</span>
                  </button>
                  {/* העתק */}
                  <button
                    onClick={() => handleCopy(displayCompletion)}
                    className={styles.xBtn}
                    aria-label={copied ? "הועתק" : "העתק"}
                    disabled={isLoading}
                  >
                    {copied
                      ? <Check className="w-[15px] h-[15px] shrink-0" />
                      : <Copy className="w-[15px] h-[15px] shrink-0" />}
                    <span className={styles.xBtnLabel}>העתק</span>
                  </button>
                </div>
              </div>
```

- [ ] **Step 2: Add `BookOpen` to the lucide-react import (line 4)**

Change:
```tsx
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  HelpCircle,
  Plus,
  RotateCcw,
  Share2,
  RefreshCw,
  Star,
} from "lucide-react";
```
To:
```tsx
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  RefreshCw,
  Star,
} from "lucide-react";
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "feat(result-section): redesign top toolbar with expanding icon buttons"
```

---

## Task 5: Replace the Platform Row (Zone 2)

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx` (lines 375–469 area)

- [ ] **Step 1: Replace the entire "AI Platform Quick-Launch Bar" block**

Find this block (around lines 375–469):
```tsx
          {/* AI Platform Quick-Launch Bar */}
          {!isLoading && (
            <div className="px-4 py-4 border-t border-(--glass-border) bg-linear-to-r from-black/2 dark:from-white/2 to-transparent">
              <div
                className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 justify-center"
                ...
              >
                ... (all buttons through </div></div>)}
```

Replace with:
```tsx
          {/* ── Platform row — gem-style, single flex row ── */}
          {!isLoading && (
            <div className="px-4 py-3 border-t border-(--glass-border)">
              <div className="flex items-center gap-2 mb-2">
                <span className={styles.sectionLabel}>פתח ב</span>
              </div>
              <div className={styles.platformRow} dir="rtl">
                {/* Target platform (image/video modes) */}
                {selectedPlatform &&
                  selectedPlatform !== "general" &&
                  GENERATION_PLATFORM_URLS[selectedPlatform] &&
                  (() => {
                    const plat = GENERATION_PLATFORM_URLS[selectedPlatform];
                    return (
                      <button
                        onClick={() => {
                          handleCopy(displayCompletion);
                          window.open(plat.url, "_blank");
                          toast.success(`${t.toasts.copied} - ${plat.name} נפתח!`);
                        }}
                        className={cn(styles.gemBtn)}
                        style={{
                          ["--gem-bg" as string]: `${plat.color}1a`,
                          ["--gem-border" as string]: `${plat.color}38`,
                          ["--gem-glow" as string]: `${plat.color}40`,
                          ["--gem-icon-bg" as string]: `${plat.color}2e`,
                        }}
                        aria-label={`פתח ב-${plat.name}`}
                      >
                        <div className={styles.gemIcon}>
                          <ExternalLink style={{ width: 18, height: 18, color: plat.color }} />
                        </div>
                        <span className={styles.gemName}>{plat.name}</span>
                      </button>
                    );
                  })()}

                {/* ChatGPT */}
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://chat.openai.com/", "_blank");
                    toast.success(`${t.toasts.copied} - ChatGPT נפתח!`);
                  }}
                  className={cn(styles.gemBtn, styles.gemGpt)}
                  aria-label="ChatGPT"
                >
                  <div className={styles.gemIcon}>
                    <ChatGPTIcon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={styles.gemName}>ChatGPT</span>
                </button>

                {/* Claude */}
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://claude.ai/new", "_blank");
                    toast.success(`${t.toasts.copied} - Claude נפתח!`);
                  }}
                  className={cn(styles.gemBtn, styles.gemClaude)}
                  aria-label="Claude"
                >
                  <div className={styles.gemIcon}>
                    <ClaudeIcon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={styles.gemName}>Claude</span>
                </button>

                {/* Gemini */}
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://gemini.google.com/", "_blank");
                    toast.success(`${t.toasts.copied} - Gemini נפתח!`);
                  }}
                  className={cn(styles.gemBtn, styles.gemGemini)}
                  aria-label="Gemini"
                >
                  <div className={styles.gemIcon}>
                    <GeminiIcon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={styles.gemName}>Gemini</span>
                </button>

                {/* Separator */}
                <div className={styles.vsep} aria-hidden />

                {/* WhatsApp — icon only */}
                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      displayCompletion + "\n\n- נוצר עם Peroot | www.peroot.space",
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className={styles.waBtn}
                  aria-label="שתף בוואטסאפ"
                  title="שתף בוואטסאפ"
                >
                  <WhatsAppIcon className="w-[22px] h-[22px]" />
                </button>
              </div>
            </div>
          )}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "feat(result-section): gem-style platform row with branded icons"
```

---

## Task 6: Replace Bottom Action Bar + More Panel (Zone 3)

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx` (lines 471–638 area)

- [ ] **Step 1: Replace the entire bottom `<div className="p-4 bg-(--glass-bg) border-t ...">` block**

Find this opening tag (around line 471):
```tsx
          <div className="p-4 bg-(--glass-bg) border-t border-(--glass-border) mt-auto space-y-3">
```

Replace everything from that line through its closing `</div>` (before `</div>` of the outer glass-card, around line 638) with:

```tsx
          {/* ── Bottom bar ── */}
          <div className="p-3 bg-(--glass-bg) border-t border-(--glass-border) mt-auto">
            <div className="flex items-center justify-between gap-2 flex-wrap" dir="rtl">
              {/* Left: nav */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  className={styles.btnBack}
                  aria-label={t.result_section.back_to_edit}
                >
                  <ChevronRight className="w-[14px] h-[14px]" style={{ opacity: 0.65 }} />
                  {t.result_section.back_to_edit}
                </button>
                <button
                  onClick={() => setShowMorePanel((v) => !v)}
                  className={cn(styles.moreBtn, showMorePanel && styles.moreBtnOpen)}
                  aria-expanded={showMorePanel}
                  aria-label="עוד אפשרויות"
                >
                  <MoreHorizontal className="w-[13px] h-[13px]" />
                  <span className={styles.moreBtnLabel}>&nbsp;עוד אפשרויות</span>
                </button>
              </div>
              {/* Right: actions */}
              <div className="flex items-center gap-2">
                {onImproveAgain && (
                  <button
                    onClick={() => setShowRefineConfirm(true)}
                    className={styles.btnRefine}
                    aria-label="שפר שוב"
                    disabled={isLoading}
                  >
                    <Pencil className="w-[15px] h-[15px]" />
                  </button>
                )}
                <button
                  onClick={() => handleCopy(displayCompletion)}
                  className={styles.btnCopy}
                  disabled={isLoading}
                  aria-label={copied ? t.result_section.copied : t.result_section.copy_button}
                >
                  {copied
                    ? <Check className="w-[16px] h-[16px]" />
                    : <Copy className="w-[16px] h-[16px]" />}
                  {copied ? t.result_section.copied : t.result_section.copy_button}
                </button>
              </div>
            </div>

            {/* Quick refine actions (unchanged) */}
            {onQuickRefine && completion.trim() && !isLoading && (
              <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-(--glass-border)" dir="rtl">
                <span className="text-[10px] font-medium text-(--text-muted)">
                  דלתות מהירות — שיפור על בסיס התוצאה:
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REFINE_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        trackFeatureUse(`quick_refine_${action.id}`);
                        onQuickRefine(action.instruction);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer min-h-[36px]"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pro watermark toggle (unchanged) */}
            {isPro && (
              <div className="flex items-center justify-end gap-2 pt-1" dir="rtl">
                <label className="flex items-center gap-2 cursor-pointer select-none group min-h-[44px] px-2 -mx-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={proWatermarkEnabled}
                    onChange={(e) => setProWatermarkEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-(--text-muted) group-hover:text-(--text-secondary) transition-colors">
                    העתק עם מיתוג Peroot
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* ── More panel (slides below card bottom) ── */}
          <div
            className={cn(styles.morePanel, showMorePanel && styles.morePanelOpen)}
            data-testid="more-panel"
          >
            <div className={styles.morePanelLabel}>עוד אפשרויות</div>

            {onSaveAsFavorite && (
              <button onClick={onSaveAsFavorite} className={styles.mpItem}>
                <Star className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                שמור במועדפים
              </button>
            )}

            <button
              onClick={() => {
                if (!savedToLibrary) {
                  onSave();
                  setSavedToLibrary(true);
                }
              }}
              className={cn(styles.mpItem, savedToLibrary && styles.mpItemDisabled)}
              data-testid="more-save-library"
              aria-disabled={savedToLibrary}
            >
              <BookOpen className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
              {savedToLibrary ? (
                <>שמור בספריה <span className={styles.savedBadge}>✓ נשמר</span></>
              ) : (
                "שמור בספריה"
              )}
            </button>

            {onShare && (
              <button onClick={onShare} className={styles.mpItem}>
                <Share2 className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                שתף קישור
              </button>
            )}

            {onSaveAsTemplate && (
              <button onClick={onSaveAsTemplate} className={styles.mpItem}>
                <Copy className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                שמור כתבנית
              </button>
            )}

            {onReset && (
              <button
                onClick={onReset}
                className={cn(styles.mpItem, styles.mpItemDanger)}
              >
                <RotateCcw className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                לאפס הכל
              </button>
            )}
          </div>
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "feat(result-section): redesign bottom bar and more panel"
```

---

## Task 7: Credit Confirmation Popup

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx`

- [ ] **Step 1: Add the popup JSX at the end of the return, just before the final closing `</div>`**

Find the last `</div>` in the return (after `</ScoreBreakdownDrawer>`, around line 789):
```tsx
      <ScoreBreakdownDrawer ... />
    </div>
  );
```

Insert the popup between `<ScoreBreakdownDrawer ... />` and `</div>`:
```tsx
      {/* ── Credit confirmation popup ── */}
      {showRefineConfirm && (
        <div
          className={styles.popupOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="אישור שיפור נוסף"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRefineConfirm(false); }}
        >
          <div className={styles.popup} data-testid="credit-popup">
            <div className={styles.popupHeader}>
              <div className={styles.popupIconWrap}>
                <Pencil />
              </div>
              <div>
                <div className={styles.popupTitle}>לשפר את הפרומפט שוב?</div>
                <div className={styles.popupSub}>שיפור נוסף ישתמש בקרדיט אחד</div>
              </div>
            </div>
            <div className={styles.popupBody}>
              Peroot תריץ סבב שיפור נוסף על הפרומפט הנוכחי ותייצר גרסה משופרת חדשה.
              {creditsLeft !== undefined && (
                <div className={styles.creditRow}>
                  <div className={styles.creditIconWrap}>
                    <RotateCcw />
                  </div>
                  <div className={styles.creditText}>
                    <span>קרדיט אחד</span> יצרף לשיפור זה
                    <small>נותרו לך {creditsLeft} קרדיטים היום</small>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.popupActions}>
              <button
                className={styles.popCancel}
                onClick={() => setShowRefineConfirm(false)}
              >
                ביטול
              </button>
              <button
                className={styles.popConfirm}
                onClick={() => {
                  setShowRefineConfirm(false);
                  onImproveAgain?.();
                }}
              >
                שפר שוב ✓
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run src/components/features/prompt-improver/__tests__/ResultSection.test.tsx
```
Expected: all 12 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "feat(result-section): credit confirmation popup for שפר שוב"
```

---

## Task 8: Clean Up Unused Imports + Full Test Run

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx`

- [ ] **Step 1: Remove unused lucide imports**

After the redesign, these lucide icons are no longer used: `HelpCircle` (still used in variables panel — keep), `Plus` (still used — keep), `RefreshCw` (no longer used — remove), `Star` (moved to more panel — keep).

Check and remove `RefreshCw` from the lucide import if it's only used in the old "שפר שוב" button (which now uses `Pencil`). Also remove `ExternalLink` if only the platform buttons used it — but check the variables panel first.

Run:
```bash
npx eslint src/components/features/prompt-improver/ResultSection.tsx --rule '{"no-unused-vars": "error"}' 2>&1 | grep "no-unused-vars"
```

Remove any flagged unused imports.

- [ ] **Step 2: Run full vitest suite**

```bash
npx vitest run
```
Expected: all existing tests pass (1012+/1012+).

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```
Expected: no errors introduced by this change.

- [ ] **Step 4: Run lint**

```bash
npx eslint src/components/features/prompt-improver/ --max-warnings 0 2>&1 | tail -5
```
Expected: 0 warnings or errors.

- [ ] **Step 5: Final commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "chore(result-section): remove unused imports after redesign"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| Remove ExportPdfButton | Task 3 |
| Top toolbar: 3 expanding icon buttons | Task 4 |
| Stage chip in top toolbar | Task 4 |
| Gem-style platform row (single row) | Task 5 |
| WhatsApp icon-only | Task 5 |
| Real SVG icons via existing AIPlatformIcons | Task 5 |
| "חזרה לעריכה" text button | Task 6 |
| "עוד אפשרויות" always text, collapses on open | Task 6 |
| שפר שוב icon-only with tooltip | Task 6 |
| "העתק פרומפט" gold primary button | Task 6 |
| More panel with 5 items | Task 6 |
| "שמור בספריה" disabled when already saved | Task 6 |
| Credit confirmation popup | Task 7 |
| Credit count shown in popup when prop provided | Task 7 |
| prefers-reduced-motion | Task 1 (CSS) |

All requirements covered. ✅
