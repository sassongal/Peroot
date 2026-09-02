/**
 * Client search and server search must answer the same question.
 *
 * The library filters in two places: in memory (LibraryUIContext, which
 * searches title, prompt, use case, category AND tags) and on the server
 * (useLibraryFetch, for a paged library). While the server clause list was
 * shorter, the same words returned different results depending on how much the
 * user had saved, which reads as data going missing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fetchSrc = readFileSync(join(process.cwd(), "src/hooks/useLibraryFetch.ts"), "utf8");
const uiSrc = readFileSync(join(process.cwd(), "src/context/LibraryUIContext.tsx"), "utf8");

describe("library search parity", () => {
  it("the server search covers the category", () => {
    expect(fetchSrc).toContain("personal_category.ilike");
  });

  it("the server search covers tags", () => {
    // text[] supports containment only, so this is a whole-tag match.
    expect(fetchSrc).toMatch(/tags\.cs\./);
  });

  it("the client search still covers tags and the category", () => {
    const memo = uiSrc.slice(uiSrc.indexOf("const filteredPersonalLibrary"));
    const body = memo.slice(0, 800);
    expect(body).toContain("p.tags");
    expect(body).toContain("p.personal_category");
  });
});
