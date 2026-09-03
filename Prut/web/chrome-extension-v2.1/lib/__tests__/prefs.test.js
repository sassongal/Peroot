import { describe, expect, it } from "vitest";
import prefs from "../prefs.js";

describe("extension prefs module", () => {
  it("sanitizes every preference to a known value", () => {
    expect(prefs.sanitize("mode", "IMAGE_GENERATION")).toBe("IMAGE_GENERATION");
    expect(prefs.sanitize("mode", "HACK")).toBe("STANDARD");
    expect(prefs.sanitize("outputLanguage", "russian")).toBe("russian");
    expect(prefs.sanitize("outputLanguage", "klingon")).toBe("hebrew");
    expect(prefs.sanitize("theme", "light")).toBe("light");
    expect(prefs.sanitize("theme", "neon")).toBe("system");
    expect(prefs.sanitize("inlineToolbar", false)).toBe(false);
    expect(prefs.sanitize("inlineToolbar", undefined)).toBe(true);
    expect(prefs.sanitize("imagePlatform", "../x")).toBe("general");
  });

  it("falls back to defaults without chrome.storage", async () => {
    const all = await prefs.getAll();
    expect(all.mode).toBe("STANDARD");
    expect(all.outputLanguage).toBe("hebrew");
    expect(all.theme).toBe("system");
    expect(all.onboarded).toBe(false);
  });
});
