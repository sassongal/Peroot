import { describe, it, expect } from "vitest";
import type { PersonalPrompt } from "@/lib/types";
import { lookupSelectedAcrossCorpus } from "../corpus-lookup";

function p(id: string, over: Partial<PersonalPrompt> = {}): PersonalPrompt {
  return {
    id,
    title: id,
    prompt: "body",
    category: "",
    personal_category: null,
    use_case: "",
    created_at: 0,
    updated_at: 0,
    use_count: 0,
    source: "manual",
    ...over,
  };
}

describe("lookupSelectedAcrossCorpus", () => {
  it("resolves an id that lives only in the corpus, not on the current page", () => {
    // The regression this guards: a logged-in user selects an item on another
    // page. It is absent from `pageItems` but present in the full corpus, so it
    // must still be found (the old code searched a guest-only list and missed it).
    const corpus = [p("on-other-page"), p("also-corpus")];
    const pageItems = [p("on-current-page")];

    const { found, missingCount } = lookupSelectedAcrossCorpus(
      new Set(["on-other-page", "on-current-page"]),
      corpus,
      pageItems,
    );

    expect(found.map((f) => f.id).sort()).toEqual(["on-current-page", "on-other-page"]);
    expect(missingCount).toBe(0);
  });

  it("lets the current page override a stale corpus copy of the same id", () => {
    const corpus = [p("dup", { title: "stale" })];
    const pageItems = [p("dup", { title: "fresh" })];
    const { found } = lookupSelectedAcrossCorpus(["dup"], corpus, pageItems);
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe("fresh");
  });

  it("reports ids that resolve from neither source", () => {
    const { found, missingCount } = lookupSelectedAcrossCorpus(["ghost"], [p("a")], [p("b")]);
    expect(found).toEqual([]);
    expect(missingCount).toBe(1);
  });
});
