import { describe, it, expect } from "vitest";
import type { PersonalPrompt } from "@/lib/types";
import {
  resolveEffectiveFolder,
  buildPersonalCategories,
  buildLocalFolderCounts,
  mergeFolderCounts,
} from "../folder-utils";

const DEFAULT = "כללי";

function p(over: Partial<PersonalPrompt>): PersonalPrompt {
  return {
    id: "x",
    title: "t",
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

describe("resolveEffectiveFolder", () => {
  it("prefers the local history folder outright", () => {
    expect(resolveEffectiveFolder("history", "work")).toBe("history");
    expect(resolveEffectiveFolder("history", null)).toBe("history");
  });

  it("maps a null server folder to 'all'", () => {
    expect(resolveEffectiveFolder("all", null)).toBe("all");
  });

  it("uses the server folder when it is a real category", () => {
    expect(resolveEffectiveFolder("all", "work")).toBe("work");
  });

  it("falls back to the local folder when the server folder is undefined", () => {
    expect(resolveEffectiveFolder("favorites", undefined)).toBe("favorites");
  });
});

describe("buildPersonalCategories", () => {
  it("dedupes the default, declared, and item-derived categories", () => {
    const items = [p({ personal_category: "work" }), p({ personal_category: null })];
    expect(buildPersonalCategories(["marketing", "work"], items, DEFAULT)).toEqual([
      DEFAULT,
      "marketing",
      "work",
    ]);
  });
});

describe("buildLocalFolderCounts", () => {
  it("counts virtual folders and each category", () => {
    const items = [
      p({ id: "a", personal_category: "work", is_pinned: true }),
      p({ id: "b", personal_category: "work", is_template: true }),
      p({ id: "c", personal_category: null }),
    ];
    const favs = new Set(["a"]);
    const counts = buildLocalFolderCounts(items, favs, [DEFAULT, "work"], 4, DEFAULT);
    expect(counts.all).toBe(3);
    expect(counts.favorites).toBe(1);
    expect(counts.pinned).toBe(1);
    expect(counts.templates).toBe(1);
    expect(counts.history).toBe(4);
    expect(counts.work).toBe(2);
    expect(counts[DEFAULT]).toBe(1);
  });
});

describe("mergeFolderCounts", () => {
  it("prefers the server counts but always overrides history from local", () => {
    const merged = mergeFolderCounts({ all: 100, history: 0 }, { all: 3, history: 4 }, 4);
    expect(merged.all).toBe(100);
    expect(merged.history).toBe(4);
  });

  it("falls back to local counts when the server supplies none", () => {
    const merged = mergeFolderCounts(undefined, { all: 3, history: 4 }, 4);
    expect(merged.all).toBe(3);
    expect(merged.history).toBe(4);
  });
});
