// @vitest-environment jsdom
/**
 * The clipboard contract: never throw, always report truthfully.
 *
 * Eight call sites called `navigator.clipboard.writeText` unguarded. Two of
 * them did not await it and showed a success toast regardless, so a blocked
 * copy told the user it had worked. One was the product's main result copy,
 * where a rejection also skipped the usage signal and the analytics event.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyText } from "../clipboard";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const originalClipboard = globalThis.navigator?.clipboard;

function setClipboard(impl: { writeText: (t: string) => Promise<void> } | undefined) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: impl,
    configurable: true,
    writable: true,
  });
}

describe("copyText", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // jsdom has no execCommand; default it to a failure so the fallback is
    // only "successful" where a test says so.
    (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
  });

  afterEach(() => {
    setClipboard(originalClipboard as never);
  });

  it("returns true when the clipboard API succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    expect(await copyText("שלום")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("שלום");
  });

  it("does NOT throw when the clipboard API rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) });
    // The whole point: a rejection here used to take the caller's handler down
    // with it, so the copied state and analytics never ran.
    await expect(copyText("x")).resolves.toBe(false);
  });

  it("reports false rather than claiming a copy that did not happen", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    expect(await copyText("x")).toBe(false);
  });

  it("falls back to execCommand when the clipboard API rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const exec = vi.fn().mockReturnValue(true);
    (document as unknown as { execCommand: unknown }).execCommand = exec;

    expect(await copyText("fallback")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    // The temporary textarea must not be left behind in the DOM.
    expect(document.querySelectorAll("textarea").length).toBe(0);
  });

  it("falls back when the clipboard API is missing entirely", async () => {
    setClipboard(undefined);
    const exec = vi.fn().mockReturnValue(true);
    (document as unknown as { execCommand: unknown }).execCommand = exec;
    expect(await copyText("no api")).toBe(true);
  });

  it("returns false when every path fails", async () => {
    setClipboard(undefined);
    (document as unknown as { execCommand: unknown }).execCommand = () => {
      throw new Error("blocked");
    };
    expect(await copyText("x")).toBe(false);
  });
});
