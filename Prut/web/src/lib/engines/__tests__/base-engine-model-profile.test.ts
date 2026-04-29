import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetCacheForTest } from "../model-profiles";

vi.mock("../model-profiles", async () => {
  const actual = await vi.importActual<typeof import("../model-profiles")>("../model-profiles");
  return {
    ...actual,
    getModelProfile: vi.fn(),
  };
});

import { getModelProfile } from "../model-profiles";
import { BaseEngine } from "../base-engine";
import { CapabilityMode } from "../../capability-mode";

class TestEngine extends BaseEngine {
  generate(): never {
    throw new Error("not used");
  }
  generateRefinement(): never {
    throw new Error("not used");
  }
  public exposeSystemPrompt(): string {
    return this.composeSystemPrompt("BASE");
  }
}

const baseConfig = {
  mode: CapabilityMode.STANDARD,
  name: "test",
  system_prompt_template: "",
  user_prompt_template: "",
} as const;

describe("BaseEngine.applyModelProfile", () => {
  beforeEach(() => {
    __resetCacheForTest();
    vi.clearAllMocks();
  });

  it("appends system_prompt_he to the engine's system prompt", async () => {
    (getModelProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: "gpt-5",
      systemPromptHe: "PROFILE_TAIL",
      outputFormatRules: {},
      dimensionWeights: {},
      hostMatch: [],
      displayName: "x",
      displayNameHe: "x",
      isActive: true,
      sortOrder: 10,
    });
    const engine = new TestEngine(baseConfig);
    await engine.applyModelProfile("gpt-5");
    expect(engine.exposeSystemPrompt()).toContain("PROFILE_TAIL");
  });

  it("is a no-op when profile is not found", async () => {
    (getModelProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const engine = new TestEngine(baseConfig);
    await engine.applyModelProfile("nope");
    expect(engine.exposeSystemPrompt()).toBe("BASE");
  });

  it("is a no-op when slug is undefined", async () => {
    const engine = new TestEngine(baseConfig);
    const result = await engine.applyModelProfile(undefined);
    expect(result).toBeNull();
    expect(engine.exposeSystemPrompt()).toBe("BASE");
  });

  it("finalizeOutput layers profile tail onto an EngineOutput", async () => {
    (getModelProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: "gpt-5",
      systemPromptHe: "PROFILE_TAIL",
      outputFormatRules: {},
      dimensionWeights: { structure: 1.2 },
      hostMatch: [],
      displayName: "x",
      displayNameHe: "x",
      isActive: true,
      sortOrder: 10,
    });
    const engine = new TestEngine(baseConfig);
    await engine.applyModelProfile("gpt-5");
    const out = engine.finalizeOutput({
      systemPrompt: "ENGINE_BASE",
      userPrompt: "U",
      outputFormat: "text",
      requiredFields: [],
    });
    expect(out.systemPrompt).toContain("ENGINE_BASE");
    expect(out.systemPrompt).toContain("PROFILE_TAIL");
    expect(engine.getActiveProfileWeights()).toEqual({ structure: 1.2 });
  });

  it("finalizeOutput is a no-op when no profile applied", async () => {
    const engine = new TestEngine(baseConfig);
    const out = engine.finalizeOutput({
      systemPrompt: "ENGINE_BASE",
      userPrompt: "U",
      outputFormat: "text",
      requiredFields: [],
    });
    expect(out.systemPrompt).toBe("ENGINE_BASE");
  });
});
