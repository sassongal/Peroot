// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => cleanup());
import { HistoryPanel } from "../HistoryPanel";
import type { HistoryItem } from "@/hooks/useHistory";

const item: HistoryItem = {
  id: "h-1",
  original: "before text",
  enhanced: "AFTER ENHANCED TEXT",
  tone: "",
  category: "General",
  title: undefined,
  source: "web",
  timestamp: Date.now(),
  entity: {
    id: "h-1",
    original: "before text",
    enhanced: "AFTER ENHANCED TEXT",
    category: "General",
    createdAt: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
};

describe("HistoryPanel — show-enhanced toggle", () => {
  it("hides the enhanced text by default and reveals it on toggle click", () => {
    const noop = vi.fn();
    render(
      <HistoryPanel
        history={[item]}
        isLoaded
        onClear={noop}
        onRestore={noop}
        onSaveToPersonal={noop}
        onCopy={noop}
      />,
    );

    expect(screen.queryByText("AFTER ENHANCED TEXT")).toBeNull();

    const toggle = screen.getByRole("button", { name: /הצג פלט משודרג/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByText("AFTER ENHANCED TEXT")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking the toggle does not bubble to the card-level Restore handler", () => {
    const onRestore = vi.fn();
    const noop = vi.fn();
    render(
      <HistoryPanel
        history={[item]}
        isLoaded
        onClear={noop}
        onRestore={onRestore}
        onSaveToPersonal={noop}
        onCopy={noop}
      />,
    );

    const toggle = screen.getByRole("button", { name: /הצג פלט משודרג/ });
    fireEvent.click(toggle);

    expect(onRestore).not.toHaveBeenCalled();
  });
});
