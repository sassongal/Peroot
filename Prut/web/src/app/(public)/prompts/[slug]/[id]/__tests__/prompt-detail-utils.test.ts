import { describe, it, expect } from "vitest";
import {
  buildHowToSteps,
  countFilled,
  fieldsPhrase,
  filledPhrase,
  isMeaningfullyUpdated,
  resolveVariables,
  splitPromptSegments,
} from "../prompt-detail-utils";

describe("resolveVariables", () => {
  it("prefers the tokens found in the text, in order of first appearance", () => {
    const vars = resolveVariables("שלום {שם}, אתם מ{עיר}? שוב {שם}", ["ignored"]);
    expect(vars).toEqual(["שם", "עיר"]);
  });

  it("falls back to the column when the text carries no token", () => {
    expect(resolveVariables("plain text", [" a ", "b", "a", ""])).toEqual(["a", "b"]);
  });

  it("returns an empty list for a prompt without fields and no column", () => {
    expect(resolveVariables("plain", null)).toEqual([]);
  });
});

describe("splitPromptSegments", () => {
  it("marks filled and empty slots and keeps the text runs around them", () => {
    const segs = splitPromptSegments("כתבו ל{שם} על {נושא}.", { שם: "דנה" });
    expect(segs).toEqual([
      { kind: "text", text: "כתבו ל" },
      { kind: "filled", name: "שם", value: "דנה" },
      { kind: "text", text: " על " },
      { kind: "empty", name: "נושא" },
      { kind: "text", text: "." },
    ]);
  });

  it("treats a whitespace-only value as empty", () => {
    const segs = splitPromptSegments("{a}", { a: "   " });
    expect(segs).toEqual([{ kind: "empty", name: "a" }]);
  });

  it("leaves JSON braces alone", () => {
    const text = '{ "subject": "x" }';
    expect(splitPromptSegments(text, {})).toEqual([{ kind: "text", text }]);
  });
});

describe("countFilled", () => {
  it("counts only non-blank values for known fields", () => {
    expect(countFilled(["a", "b", "c"], { a: "x", b: " ", d: "y" })).toBe(1);
  });
});

describe("isMeaningfullyUpdated", () => {
  it("is false when the update is within a day of creation (import noise)", () => {
    expect(isMeaningfullyUpdated("2026-01-01T00:00:00Z", "2026-01-01T12:00:00Z")).toBe(false);
  });

  it("is true when the row was edited later", () => {
    expect(isMeaningfullyUpdated("2026-01-01T00:00:00Z", "2026-01-03T00:00:00Z")).toBe(true);
  });

  it("is false for missing or unparsable dates", () => {
    expect(isMeaningfullyUpdated(null, "2026-01-03T00:00:00Z")).toBe(false);
    expect(isMeaningfullyUpdated("nope", "2026-01-03T00:00:00Z")).toBe(false);
  });
});

describe("Hebrew phrases", () => {
  it("changes the word form with the count", () => {
    expect(fieldsPhrase(1)).toBe("שדה אחד למילוי");
    expect(fieldsPhrase(2)).toBe("שני שדות למילוי");
    expect(fieldsPhrase(5)).toBe("5 שדות למילוי");
  });

  it("reports progress and completion", () => {
    expect(filledPhrase(0, 3)).toBe("מולאו 0 מתוך 3 שדות");
    expect(filledPhrase(3, 3)).toBe("כל השדות מולאו");
    expect(filledPhrase(1, 1)).toBe("השדה מולא");
    expect(filledPhrase(0, 0)).toBe("");
  });

  it("never contains an em or en dash", () => {
    const all = [
      fieldsPhrase(1),
      fieldsPhrase(3),
      filledPhrase(1, 3),
      ...buildHowToSteps(["שם"]).flatMap((s) => [s.name, s.text]),
    ].join(" ");
    expect(all).not.toMatch(/[–—]/);
  });
});

describe("buildHowToSteps", () => {
  it("has one step per field plus the enhance step", () => {
    const steps = buildHowToSteps(["שם", "עיר"]);
    expect(steps).toHaveLength(3);
    expect(steps[0].name).toContain("שם");
    expect(steps[1].name).toContain("עיר");
    expect(steps[2].name).toBe("שדרגו בפירוט");
  });
});
