import { describe, it, expect } from "vitest";
import type { PersonalPrompt } from "@/lib/types";
import { getStyledPromptMarkup, extractVariablesFromPrompt } from "@/lib/prompt-variables";

function p(over: Partial<PersonalPrompt>): PersonalPrompt {
  return {
    id: "x",
    title: "t",
    prompt: "raw body",
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

describe("getStyledPromptMarkup", () => {
  it("returns the styled variant when present", () => {
    expect(getStyledPromptMarkup(p({ prompt_style: "<b>styled</b>" }))).toBe("<b>styled</b>");
  });

  it("falls back to the raw prompt when no style is stored", () => {
    expect(getStyledPromptMarkup(p({ prompt: "raw body", prompt_style: undefined }))).toBe(
      "raw body",
    );
  });
});

describe("extractVariablesFromPrompt", () => {
  it("returns an empty list when there are no placeholders", () => {
    expect(extractVariablesFromPrompt("no tokens here")).toEqual([]);
  });

  it("extracts unique placeholders with braces stripped", () => {
    expect(extractVariablesFromPrompt("Hi {name}, from {company}. Bye {name}.")).toEqual([
      "name",
      "company",
    ]);
  });
});
