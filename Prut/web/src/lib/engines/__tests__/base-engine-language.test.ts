import { describe, it, expect } from "vitest";
import { StandardEngine } from "../standard-engine";
import { CapabilityMode } from "../../capability-mode";

const MIN_CONFIG = {
  mode: CapabilityMode.STANDARD,
  name: "test",
  system_prompt_template: "system",
  user_prompt_template: "user: {{prompt}}",
};

const BASE_INPUT = {
  prompt: "test prompt",
  tone: "professional",
  category: "general",
  mode: CapabilityMode.STANDARD,
};

describe("BaseEngine language override", () => {
  it("generate() with hebrew outputLanguage produces no override block", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generate({ ...BASE_INPUT, outputLanguage: "hebrew" });
    expect(out.systemPrompt).not.toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
  });

  it("generate() with arabic outputLanguage injects override", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generate({ ...BASE_INPUT, outputLanguage: "arabic" });
    expect(out.systemPrompt).toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
    expect(out.systemPrompt).toContain("Arabic");
  });

  it("generate() with russian outputLanguage injects override", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generate({ ...BASE_INPUT, outputLanguage: "russian" });
    expect(out.systemPrompt).toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
    expect(out.systemPrompt).toContain("Russian");
  });

  it("generateRefinement() with english outputLanguage injects override", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generateRefinement({
      ...BASE_INPUT,
      outputLanguage: "english",
      previousResult: "previous enhanced prompt",
    });
    expect(out.systemPrompt).toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
  });

  it("generateRefinement() with hebrew outputLanguage keeps Hebrew rule", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generateRefinement({
      ...BASE_INPUT,
      outputLanguage: "hebrew",
      previousResult: "previous",
    });
    expect(out.systemPrompt).toContain("עברית");
    expect(out.systemPrompt).not.toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
  });

  it("generateRefinement() with undefined outputLanguage keeps Hebrew rule", () => {
    const engine = new StandardEngine(MIN_CONFIG);
    const out = engine.generateRefinement({
      ...BASE_INPUT,
      previousResult: "previous",
    });
    expect(out.systemPrompt).toContain("עברית");
    expect(out.systemPrompt).not.toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
  });
});

describe("BaseEngine language rules (languages spec B3.7)", () => {
  it("Arabic gets Standard Arabic and Western digits", () => {
    const out = new StandardEngine(MIN_CONFIG).generate({
      ...BASE_INPUT,
      outputLanguage: "arabic",
    });
    expect(out.systemPrompt).toContain("الفصحى");
    expect(out.systemPrompt).toContain("Western digits");
    expect(out.userPrompt).toContain("الفصحى");
  });

  it("Russian gets the formal register", () => {
    const out = new StandardEngine(MIN_CONFIG).generate({
      ...BASE_INPUT,
      outputLanguage: "russian",
    });
    expect(out.systemPrompt).toContain("Вы");
    expect(out.systemPrompt).not.toContain("الفصحى");
  });

  it("every override forbids em and en dashes, the project law", () => {
    for (const lang of ["english", "arabic", "russian"] as const) {
      const out = new StandardEngine(MIN_CONFIG).generate({ ...BASE_INPUT, outputLanguage: lang });
      expect(out.systemPrompt).toContain("U+2014");
    }
  });
});
