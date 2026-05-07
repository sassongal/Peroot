import { describe, it, expect } from "vitest";
import { computeNeighborhood } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";

const mkPrompt = (id: string, title: string, prompt: string, tags: string[] = []): PersonalPrompt =>
  ({
    id,
    user_id: "u1",
    title,
    prompt,
    use_case: "",
    category: "general",
    tags,
    variables: [],
    capability_mode: "STANDARD",
    is_template: false,
    popularity: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    last_used_at: null,
  }) as unknown as PersonalPrompt;

describe("computeNeighborhood", () => {
  it("returns center node + ranked neighbors capped at maxNeighbors", () => {
    const prompts = [
      mkPrompt("c", "linkedin post launch", "write linkedin announcement"),
      mkPrompt("a", "linkedin announcement template", "post on linkedin about launch"),
      mkPrompt("b", "twitter thread", "thread on twitter"),
      mkPrompt("d", "facebook update", "facebook post about launch"),
    ];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      prompts,
      usageEvents: [],
      maxNeighbors: 2,
    });
    expect(nodes[0].id).toBe("c");
    expect(nodes).toHaveLength(3);
    expect(nodes.find((n) => n.id === "a")).toBeDefined();
    expect(links.every((l) => l.source === "c" || l.target === "c")).toBe(true);
  });

  it("co-occurrence boosts neighbors used in the same 24h window", () => {
    const prompts = [
      mkPrompt("c", "x", "y"),
      mkPrompt("a", "totally unrelated", "blah"),
      mkPrompt("b", "also unrelated", "blah blah"),
    ];
    const usageEvents: PromptUsageEvent[] = [
      {
        id: "1",
        user_id: "u1",
        prompt_id: "c",
        used_at: "2026-05-07T10:00:00Z",
        session_id: null,
        source: "library",
      },
      {
        id: "2",
        user_id: "u1",
        prompt_id: "a",
        used_at: "2026-05-07T11:00:00Z",
        session_id: null,
        source: "library",
      },
      {
        id: "3",
        user_id: "u1",
        prompt_id: "c",
        used_at: "2026-05-07T12:00:00Z",
        session_id: null,
        source: "library",
      },
      {
        id: "4",
        user_id: "u1",
        prompt_id: "a",
        used_at: "2026-05-07T13:00:00Z",
        session_id: null,
        source: "library",
      },
    ];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      prompts,
      usageEvents,
      maxNeighbors: 1,
    });
    expect(nodes.find((n) => n.id === "a")).toBeDefined();
    expect(nodes.find((n) => n.id === "b")).toBeUndefined();
    const aLink = links.find((l) => l.source === "c" && l.target === "a");
    expect(aLink?.type).toMatch(/cooccurrence|both/);
  });

  it("returns only center when prompt has no neighbors", () => {
    const prompts = [mkPrompt("c", "alone", "completely alone")];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      prompts,
      usageEvents: [],
    });
    expect(nodes).toHaveLength(1);
    expect(links).toHaveLength(0);
  });

  it("returns empty when centerId not found", () => {
    const { nodes } = computeNeighborhood({
      centerId: "missing",
      prompts: [],
      usageEvents: [],
    });
    expect(nodes).toHaveLength(0);
  });
});
