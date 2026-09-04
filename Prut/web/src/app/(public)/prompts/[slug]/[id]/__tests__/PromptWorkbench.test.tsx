// @vitest-environment jsdom
/**
 * The prompt page's interactive half: fill the fields, watch the preview,
 * press the one gold button. Pins the handoff contract with the home page
 * (substituted text, is_template flag, source) and the One Gold rule.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PromptWorkbench } from "../PromptWorkbench";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ trackLibraryUse: vi.fn() }));
vi.mock("@/lib/clipboard", () => ({ copyText: vi.fn().mockResolvedValue(true) }));

const setPendingPrompt = vi.fn();
vi.mock("@/lib/pending-prompt", () => ({
  setPendingPrompt: (p: unknown) => setPendingPrompt(p),
}));

const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const base = {
  promptId: "p1",
  title: "מכתב ללקוח",
  slug: "marketing",
  capabilityMode: "STANDARD" as string | null,
  fullText: "כתבו מכתב ל{שם} מ{עיר}.",
  variables: ["שם", "עיר"],
};

describe("PromptWorkbench", () => {
  it("renders one labelled input per field with the field name as label", () => {
    render(<PromptWorkbench {...base} />);
    expect(screen.getByLabelText("שם")).toBeTruthy();
    expect(screen.getByLabelText("עיר")).toBeTruthy();
    expect(screen.getByTestId("filled-count").textContent).toBe("מולאו 0 מתוך 2 שדות");
  });

  it("substitutes filled values in the preview and keeps empty ones highlighted", () => {
    render(<PromptWorkbench {...base} />);
    fireEvent.change(screen.getByLabelText("שם"), { target: { value: "דנה" } });

    const preview = screen.getByTestId("prompt-preview");
    expect(preview.textContent).toBe("כתבו מכתב לדנה מ{עיר}.");
    expect(preview.querySelectorAll("[data-field='filled']")).toHaveLength(1);
    expect(preview.querySelectorAll("[data-field='empty']")).toHaveLength(1);
    expect(screen.getByTestId("filled-count").textContent).toBe("מולאו 1 מתוך 2 שדות");
  });

  it("hands a partly filled prompt over as a template", () => {
    render(<PromptWorkbench {...base} />);
    fireEvent.change(screen.getByLabelText("שם"), { target: { value: "דנה" } });
    fireEvent.click(screen.getByRole("button", { name: "מלאו ושדרגו בפירוט" }));

    expect(setPendingPrompt).toHaveBeenCalledWith({
      id: "p1",
      title: "מכתב ללקוח",
      prompt: "כתבו מכתב לדנה מ{עיר}.",
      category: "marketing",
      is_template: true,
      capability_mode: "STANDARD",
      source: "catalog_detail",
    });
    // utm_source, not ref: proxy.ts captures ?ref= as a first-wins 30-day
    // referral cookie, so internal traffic tags must not ride on it.
    expect(push).toHaveBeenCalledWith("/?utm_source=library-prompt");
  });

  it("hands a fully filled prompt over as a plain prompt and signals usage", () => {
    render(<PromptWorkbench {...base} capabilityMode="IMAGE_GENERATION" />);
    fireEvent.change(screen.getByLabelText("שם"), { target: { value: "דנה" } });
    fireEvent.change(screen.getByLabelText("עיר"), { target: { value: "חיפה" } });
    expect(screen.getByTestId("filled-count").textContent).toBe("כל השדות מולאו");

    fireEvent.click(screen.getByRole("button", { name: "מלאו ושדרגו בפירוט" }));

    expect(setPendingPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "כתבו מכתב לדנה מחיפה.",
        is_template: false,
        capability_mode: "IMAGE_GENERATION",
      }),
    );
    const enhanceCall = fetchMock.mock.calls.find(
      ([, init]) => JSON.parse(init.body).event_type === "enhance",
    );
    expect(enhanceCall).toBeTruthy();
    expect(JSON.parse(enhanceCall![1].body)).toMatchObject({
      prompt_key: "p1",
      source: "catalog_detail",
      prompt_length: "כתבו מכתב לדנה מחיפה.".length,
    });
  });

  it("without fields shows the plain CTA and hands the text over as is", () => {
    render(<PromptWorkbench {...base} fullText="פרומפט פשוט" variables={[]} />);
    expect(screen.queryByTestId("filled-count")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "שדרגו בפירוט" }));
    expect(setPendingPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "פרומפט פשוט", is_template: false }),
    );
  });

  it("has exactly one gold button (One Gold rule)", () => {
    const { container } = render(<PromptWorkbench {...base} />);
    expect(container.querySelectorAll("button.bg-\\[\\#F59E0B\\]")).toHaveLength(1);
  });

  it("copies the substituted text and sends a copy signal", () => {
    render(<PromptWorkbench {...base} />);
    fireEvent.change(screen.getByLabelText("שם"), { target: { value: "דנה" } });
    fireEvent.click(screen.getByRole("button", { name: "העתקת הפרומפט" }));

    const copyCall = fetchMock.mock.calls.find(
      ([, init]) => JSON.parse(init.body).event_type === "copy",
    );
    expect(copyCall).toBeTruthy();
    expect(JSON.parse(copyCall![1].body).prompt_length).toBe("כתבו מכתב לדנה מ{עיר}.".length);
  });
});
