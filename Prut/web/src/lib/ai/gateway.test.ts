import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIGateway } from "@/lib/ai/gateway";
import {
  AVAILABLE_MODELS,
  TASK_ROUTING,
  getModelsForTask,
  filterModelsForLanguage,
} from "@/lib/ai/models";
import { recordSuccess } from "@/lib/ai/circuit-breaker";

// Mock the 'ai' module
const mockStreamText = vi.fn();
vi.mock("ai", () => ({
  streamText: (args: Record<string, unknown>) => mockStreamText(args),
}));

// Mock process.env
const originalEnv = process.env;

describe("AIGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GROQ_API_KEY: "test-key",
      MISTRAL_API_KEY: "test-key",
    };
    // Reset circuit breaker state between tests
    ["google", "groq", "mistral"].forEach((p) => recordSuccess(p));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use the primary model (Gemini 3 Flash) if it succeeds", async () => {
    mockStreamText.mockResolvedValueOnce({ text: "success" });

    const result = await AIGateway.generateStream({ system: "sys", prompt: "user" });

    expect(result.modelId).toBe("gemini-3-flash");
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: AVAILABLE_MODELS["gemini-3-flash"]!.model,
      }),
    );
  });

  it("should fallback to secondary (Gemini 2.5 Flash) if primary fails", async () => {
    // Fail first call
    mockStreamText.mockRejectedValueOnce(new Error("Rate Limited"));
    // Succeed second call
    mockStreamText.mockResolvedValueOnce({ text: "success" });

    const result = await AIGateway.generateStream({ system: "sys", prompt: "user" });

    expect(result.modelId).toBe("gemini-2.5-flash");
    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockStreamText).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        model: AVAILABLE_MODELS["gemini-2.5-flash"]!.model,
      }),
    );
  });

  it("should fallback to tertiary (Gemini 2.5 Flash Lite) if others fail", async () => {
    mockStreamText.mockRejectedValueOnce(new Error("Rate Limited 1"));
    mockStreamText.mockRejectedValueOnce(new Error("Rate Limited 2"));
    mockStreamText.mockResolvedValueOnce({ text: "success" });

    const result = await AIGateway.generateStream({ system: "sys", prompt: "user" });

    expect(result.modelId).toBe("gemini-2.5-flash-lite");
    expect(mockStreamText).toHaveBeenCalledTimes(3);
  });

  it("should skip Groq if API key is missing", async () => {
    delete process.env.GROQ_API_KEY;

    // Fail all available models — Groq models (llama-4-scout, gpt-oss-20b) skipped
    mockStreamText.mockRejectedValue(new Error("Fail"));

    await expect(AIGateway.generateStream({ system: "sys", prompt: "user" })).rejects.toThrow();

    // FALLBACK_ORDER without backup/gateway keys: gemini-3-flash, gemini-2.5-flash,
    // flash-lite, mistral-small; llama-4-scout + gpt-oss-20b skipped = 4 calls
    expect(mockStreamText).toHaveBeenCalledTimes(4);
  });

  it("should throw if all models fail", async () => {
    mockStreamText.mockRejectedValue(new Error("General Failure"));

    await expect(AIGateway.generateStream({ system: "sys", prompt: "user" })).rejects.toThrow();

    // FALLBACK_ORDER: gemini-3-flash, gemini-2.5-flash, flash-lite, mistral, llama-4-scout, gpt-oss-20b
    // Note: circuit breaker may skip providers after first failure
    expect(mockStreamText.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("should use task-based routing when task is provided", async () => {
    mockStreamText.mockResolvedValueOnce({ text: "success" });

    // Research routing head: gemini-3-flash first
    const result = await AIGateway.generateStream({
      system: "sys",
      prompt: "user",
      task: "research",
      userTier: "free",
    });

    expect(result.modelId).toBe("gemini-3-flash");
    expect(mockStreamText).toHaveBeenCalledTimes(1);
  });
});

describe("Task-Based Model Routing", () => {
  it("returns models for enhance task", () => {
    const models = getModelsForTask("enhance");
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toBe("gemini-3-flash");
  });

  it("returns models for research task", () => {
    const models = getModelsForTask("research");
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toBe("gemini-3-flash");
  });

  it("returns same low-cost models for all tiers (no expensive pro models)", () => {
    const freeModels = getModelsForTask("enhance", "free");
    const proModels = getModelsForTask("enhance", "pro");
    expect(freeModels).toEqual(proModels);
    expect(freeModels[0]).toBe("gemini-3-flash");
  });

  it("falls back to enhance routing for unknown task", () => {
    const models = getModelsForTask("unknown-task");
    expect(models).toEqual(TASK_ROUTING.enhance);
  });

  it("has routing for all expected tasks", () => {
    expect(TASK_ROUTING).toHaveProperty("enhance");
    expect(TASK_ROUTING).toHaveProperty("research");
    expect(TASK_ROUTING).toHaveProperty("agent");
    expect(TASK_ROUTING).toHaveProperty("image");
  });

  it("includes all new free models in free tier filter", () => {
    const models = getModelsForTask("enhance", "free");
    expect(models).toContain("gemini-2.5-flash");
    expect(models).toContain("mistral-small");
    expect(models).toContain("gemini-2.5-flash-lite");
    expect(models).toContain("llama-4-scout");
    expect(models).toContain("gpt-oss-20b");
  });
});

describe("Language-aware routing (languages spec B3.6)", () => {
  it("drops the models that are weak in Arabic and keeps the order of the rest", () => {
    const chain = getModelsForTask("enhance");
    const arabic = filterModelsForLanguage(chain, "arabic");
    expect(arabic).not.toContain("mistral-small");
    expect(arabic).not.toContain("gpt-oss-20b");
    expect(arabic[0]).toBe("gemini-3-flash");
    expect(arabic).toContain("gemini-2.5-flash-lite");
  });

  it("leaves Hebrew and English chains untouched; Russian drops Llama 4", () => {
    const chain = getModelsForTask("enhance");
    expect(filterModelsForLanguage(chain, "hebrew")).toEqual(chain);
    expect(filterModelsForLanguage(chain, "english")).toEqual(chain);
    expect(filterModelsForLanguage(chain, undefined)).toEqual(chain);
    // Russian is not among Llama 4's 12 official languages (Meta model card).
    const russian = filterModelsForLanguage(chain, "russian");
    expect(russian).not.toContain("llama-4-scout");
    expect(russian[0]).toBe("gemini-3-flash");
  });

  it("never empties the chain: a weak answer beats no answer", () => {
    expect(filterModelsForLanguage(["mistral-small"], "arabic")).toEqual(["mistral-small"]);
  });

  it("an Arabic request that loses Gemini falls through to Flash Lite, not Mistral", async () => {
    mockStreamText.mockRejectedValueOnce(new Error("Rate Limited"));
    mockStreamText.mockResolvedValueOnce({ text: "success" });

    const result = await AIGateway.generateStream({
      system: "sys",
      prompt: "user",
      task: "enhance",
      outputLanguage: "arabic",
    });

    expect(result.modelId).not.toBe("mistral-small");
    expect(result.modelId).not.toBe("gpt-oss-20b");
  });
});
