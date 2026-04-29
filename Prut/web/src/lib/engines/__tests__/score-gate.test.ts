import { describe, it, expect } from "vitest";
import { applyModelTagWrapper, shouldSkipLLM } from "../score-gate";
import type { ModelProfile } from "../types";

const claudeProfile: ModelProfile = {
  slug: "claude-sonnet-4",
  displayName: "Claude Sonnet 4",
  displayNameHe: "Claude Sonnet 4",
  hostMatch: ["claude.ai"],
  systemPromptHe: "x",
  outputFormatRules: { prefer: "xml_tags", xml_tags: true },
  dimensionWeights: {},
  isActive: true,
  sortOrder: 20,
};

const gptProfile: ModelProfile = {
  ...claudeProfile,
  slug: "gpt-5",
  outputFormatRules: { prefer: "markdown_headers", xml_tags: false },
};

describe("score-gate.shouldSkipLLM", () => {
  it("skips when score is at threshold", () => {
    expect(shouldSkipLLM(80, 80)).toBe(true);
    expect(shouldSkipLLM(95, 80)).toBe(true);
  });
  it("does not skip when below threshold", () => {
    expect(shouldSkipLLM(79, 80)).toBe(false);
    expect(shouldSkipLLM(0, 80)).toBe(false);
  });
});

describe("score-gate.applyModelTagWrapper", () => {
  it("wraps in XML tags for claude profile", () => {
    const out = applyModelTagWrapper("write a haiku", claudeProfile);
    expect(out).toContain("<task>");
    expect(out).toContain("write a haiku");
    expect(out).toContain("</task>");
  });

  it("adds markdown header scaffolding for gpt profile", () => {
    const out = applyModelTagWrapper("write a haiku", gptProfile);
    expect(out).toMatch(/^## /);
    expect(out).toContain("write a haiku");
  });

  it("returns text unchanged when profile has no preference", () => {
    const out = applyModelTagWrapper("write a haiku", { ...gptProfile, outputFormatRules: {} });
    expect(out).toBe("write a haiku");
  });
});
