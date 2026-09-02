/**
 * The engine rows in the database are what users get (see CLAUDE.md, engine
 * templates). These pin the two things that let that stay true: the lookup
 * uses the real mode value, and every shipped baseline is a full template.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { shippedEngineBaselines } from "../shipped-baselines";
import { CapabilityMode } from "@/lib/capability-mode";

describe("shipped engine baselines", () => {
  const baselines = shippedEngineBaselines();

  it("cover every capability mode with a substantial system template", () => {
    for (const mode of Object.values(CapabilityMode)) {
      expect(baselines[mode], mode).toBeDefined();
      expect(baselines[mode].system_prompt_template.length, mode).toBeGreaterThan(1500);
      expect(baselines[mode].user_prompt_template).toContain("{{input}}");
    }
  });

  it("carry no em or en dashes, the project law", () => {
    for (const [mode, t] of Object.entries(baselines)) {
      expect(t.system_prompt_template, mode).not.toMatch(/[–—]/);
      expect(t.user_prompt_template, mode).not.toMatch(/[–—]/);
    }
  });

  it("the loader looks rows up by the enum value, not a lowercased copy", () => {
    const src = readFileSync(path.resolve(__dirname, "../index.ts"), "utf8");
    expect(src).toMatch(/\.eq\(['"]mode['"], mode\)/);
    expect(src).not.toContain("capabilityModeToDbMode(mode)");
  });
});
