import { describe, it, expect } from "vitest";
import { buildActivityLogDetails, type ActivityLogParams } from "../lib/activity-log";

const base: ActivityLogParams = {
  mode: "STANDARD",
  modelId: "gemini-2.5-flash",
  durationMs: 1200,
  tokens: { inputTokens: 100, outputTokens: 200 },
  prompt: "Write a marketing email",
  resultText: "Here is your improved prompt...",
  tone: "Professional",
  category: "כללי",
  capabilityMode: "STANDARD",
  targetModel: "general",
  isRefinement: false,
  isJsonOutput: false,
};

describe("buildActivityLogDetails", () => {
  it("maps all base fields correctly", () => {
    const result = buildActivityLogDetails(base);

    expect(result.mode).toBe("STANDARD");
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.latency_ms).toBe(1200);
    expect(result.tokens).toEqual({ inputTokens: 100, outputTokens: 200 });
    expect(result.prompt_length).toBe("Write a marketing email".length);
    expect(result.result_length).toBe("Here is your improved prompt...".length);
    expect(result.tone).toBe("Professional");
    expect(result.category).toBe("כללי");
    expect(result.capability_mode).toBe("STANDARD");
    expect(result.target_model).toBe("general");
    expect(result.is_refinement).toBe(false);
    expect(result.json_output).toBe(false);
    expect(result.iteration).toBe(0);
  });

  it("defaults capability_mode to STANDARD when undefined", () => {
    const result = buildActivityLogDetails({ ...base, capabilityMode: undefined });
    expect(result.capability_mode).toBe("STANDARD");
  });

  it("defaults target_model to 'general' when undefined", () => {
    const result = buildActivityLogDetails({ ...base, targetModel: undefined });
    expect(result.target_model).toBe("general");
  });

  it("defaults iteration to 0 when undefined", () => {
    const result = buildActivityLogDetails({ ...base, iteration: undefined });
    expect(result.iteration).toBe(0);
  });

  it("computes has_context and context_count from contextAttachments", () => {
    const withCtx = buildActivityLogDetails({
      ...base,
      contextAttachments: [{ tokenCount: 300 }, { tokenCount: 150 }],
    });
    expect(withCtx.has_context).toBe(true);
    expect(withCtx.context_count).toBe(2);
    expect(withCtx.attachment_tokens_est).toBe(450);

    const noCtx = buildActivityLogDetails({ ...base, contextAttachments: [] });
    expect(noCtx.has_context).toBe(false);
    expect(noCtx.context_count).toBe(0);
    expect(noCtx.attachment_tokens_est).toBe(0);
  });

  it("handles missing tokenCount in attachments (treats as 0)", () => {
    const result = buildActivityLogDetails({
      ...base,
      contextAttachments: [{ tokenCount: undefined }, { tokenCount: 100 }],
    });
    expect(result.attachment_tokens_est).toBe(100);
  });

  it("includes json_valid and json_error only when provided", () => {
    const withJson = buildActivityLogDetails({
      ...base,
      isJsonOutput: true,
      jsonValid: false,
      jsonError: "Unexpected token",
    });
    expect(withJson.json_valid).toBe(false);
    expect(withJson.json_error).toBe("Unexpected token");

    const withoutJson = buildActivityLogDetails(base);
    expect("json_valid" in withoutJson).toBe(false);
    expect("json_error" in withoutJson).toBe(false);
  });

  it("sets cache_hit: true only when cacheHit is true", () => {
    const hit = buildActivityLogDetails({ ...base, cacheHit: true });
    expect(hit.cache_hit).toBe(true);

    const miss = buildActivityLogDetails({ ...base, cacheHit: false });
    expect("cache_hit" in miss).toBe(false);

    const omitted = buildActivityLogDetails(base);
    expect("cache_hit" in omitted).toBe(false);
  });

  it("includes injectionStats when provided", () => {
    const stats = { l1: true, l2: false };
    const result = buildActivityLogDetails({ ...base, injectionStats: stats });
    expect(result.injection).toEqual(stats);
  });

  it("sets injection to null when injectionStats is explicitly null/undefined", () => {
    const result = buildActivityLogDetails({ ...base, injectionStats: null });
    expect(result.injection).toBeNull();
  });

  it("does not include injection key when injectionStats is not passed", () => {
    const result = buildActivityLogDetails(base);
    expect("injection" in result).toBe(false);
  });
});
