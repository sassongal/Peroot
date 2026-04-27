import { describe, it, expect } from "vitest";
import { buildGraphData } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";

const makePrompt = (id: string, overrides: Partial<PersonalPrompt> = {}): PersonalPrompt =>
  ({
    id,
    title: `Prompt ${id}`,
    prompt: "test prompt text",
    capability_mode: CapabilityMode.STANDARD,
    tags: [],
    template_variables: [],
    use_count: 0,
    success_count: 0,
    fail_count: 0,
    is_pinned: false,
    is_template: false,
    source: "personal",
    created_at: new Date().toISOString(),
    ...overrides,
  }) as PersonalPrompt;

describe("buildGraphData", () => {
  it("sets score on node when scoreMap provided", () => {
    const prompts = [makePrompt("p1"), makePrompt("p2")];
    const scoreMap = new Map([
      ["p1", 85],
      ["p2", 30],
    ]);
    const { nodes } = buildGraphData(prompts, new Set(), scoreMap);
    const p1Node = nodes.find((n) => n.id === "p1");
    const p2Node = nodes.find((n) => n.id === "p2");
    expect(p1Node?.score).toBe(85);
    expect(p2Node?.score).toBe(30);
  });

  it("leaves score undefined when scoreMap not provided", () => {
    const prompts = [makePrompt("p1")];
    const { nodes } = buildGraphData(prompts, new Set());
    expect(nodes.find((n) => n.id === "p1")?.score).toBeUndefined();
  });
});
