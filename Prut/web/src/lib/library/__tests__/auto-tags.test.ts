/**
 * Auto-tagging on save (master plan 3.6).
 *
 * Connect tagged its saves from day one; the web save did not, and the web is
 * where nearly every prompt actually enters a library. The visible cost was a
 * Memory Palace drawn without tag edges and a tag search with nothing to find.
 */
import { describe, it, expect } from "vitest";
import { autoTags } from "../auto-tags";

describe("autoTags", () => {
  it("derives tags from a Hebrew prompt", () => {
    const tags = autoTags(
      "פוסט שיווקי לאינסטגרם",
      "כתוב פוסט שיווקי לאינסטגרם שמציג את המוצר החדש שלנו לקהל צעיר",
    );
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.length).toBeLessThanOrEqual(5);
    // The title is weighted, so its words should survive the cut.
    expect(tags.join(" ")).toContain("שיווקי");
  });

  it("never returns more than the limit", () => {
    const tags = autoTags("כותרת", "מילה ".repeat(200), 3);
    expect(tags.length).toBeLessThanOrEqual(3);
  });

  it("returns an empty list rather than throwing on empty input", () => {
    expect(autoTags("", "")).toEqual([]);
  });

  it("produces no duplicates", () => {
    const tags = autoTags("תכנון תכנון תכנון", "תכנון פרויקט תכנון פרויקט");
    expect(new Set(tags).size).toBe(tags.length);
  });
});
