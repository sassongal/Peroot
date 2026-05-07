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

  it("isGuest=true: non-standard pill calls toast, does not call onChange", async () => {
    const { toast } = await import("sonner");
    const onChange = vi.fn();
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={onChange} isGuest />);
    fireEvent.click(screen.getByTestId(`pill-${CapabilityMode.DEEP_RESEARCH}`));
    expect(onChange).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it("disabled=true: all pill buttons are disabled", () => {
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={vi.fn()} disabled />);
    const pills = screen.getAllByTestId(/^pill-/);
    pills.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("each pill has an aria-label matching the Hebrew mode name", () => {
    render(<CapabilitySelector value={CapabilityMode.STANDARD} onChange={vi.fn()} />);
    expect(screen.getAllByLabelText("סטנדרטי")).toHaveLength(2); // pill + card
    expect(screen.getAllByLabelText("מחקר מעמיק")).toHaveLength(2);
    expect(screen.getAllByLabelText("יצירת תמונה")).toHaveLength(2);
    expect(screen.getAllByLabelText("בונה סוכנים")).toHaveLength(2);
    expect(screen.getAllByLabelText("יצירת סרטון")).toHaveLength(2);
  });
});
