// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ResultSection } from "../ResultSection";
import { CapabilityMode } from "@/lib/capability-mode";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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

describe("ResultSection, redesign", () => {
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

  it("the credit-burning 'שפר שוב' path is gone (U2.3, refinement is free)", () => {
    render(<ResultSection {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /שפר שוב/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("credit-popup")).not.toBeInTheDocument();
  });

  it("exactly one copy button renders (U2.3, one toolbar)", () => {
    render(<ResultSection {...defaultProps} />);
    const copies = screen
      .getAllByRole("button")
      .filter((b) => /העתק/.test(b.getAttribute("aria-label") ?? b.textContent ?? ""));
    expect(copies).toHaveLength(1);
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
