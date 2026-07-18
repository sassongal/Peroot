import { describe, it, expect, vi } from "vitest";
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
    const corpus = [
      mkPrompt("c", "linkedin post launch", "write linkedin announcement"),
      mkPrompt("a", "linkedin announcement template", "post on linkedin about launch"),
      mkPrompt("b", "twitter thread", "thread on twitter"),
      mkPrompt("d", "facebook update", "facebook post about launch"),
    ];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      corpus,
      usageEvents: [],
      maxNeighbors: 2,
    });
    expect(nodes[0].id).toBe("c");
    expect(nodes).toHaveLength(3);
    expect(nodes.find((n) => n.id === "a")).toBeDefined();
    expect(links.every((l) => l.source === "c" || l.target === "c")).toBe(true);
  });

  it("co-occurrence boosts neighbors used in the same 24h window", () => {
    const corpus = [
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
      corpus,
      usageEvents,
      maxNeighbors: 1,
    });
    expect(nodes.find((n) => n.id === "a")).toBeDefined();
    expect(nodes.find((n) => n.id === "b")).toBeUndefined();
    const aLink = links.find((l) => l.source === "c" && l.target === "a");
    expect(aLink?.type).toMatch(/cooccurrence|both/);
  });

  it("returns only center when prompt has no neighbors", () => {
    const corpus = [mkPrompt("c", "alone", "completely alone")];
    const { nodes, links } = computeNeighborhood({
      centerId: "c",
      corpus,
      usageEvents: [],
    });
    expect(nodes).toHaveLength(1);
    expect(links).toHaveLength(0);
  });

  it("returns empty when centerId not found", () => {
    const { nodes } = computeNeighborhood({
      centerId: "missing",
      corpus: [],
      usageEvents: [],
    });
    expect(nodes).toHaveLength(0);
  });

  // ── Regression: the palace-corpus bug ──────────────────────────────────────
  // A genuine neighbor that lives OUTSIDE a paginated 15-item slice must be
  // found when the FULL corpus is scored, and is (correctly) absent when only
  // the slice is scored. This pins the fix: the Palace must receive the whole
  // library, never the current page.
  it("finds a similar neighbor only when it is present in the corpus (page-slice bug)", () => {
    const center = mkPrompt("c", "linkedin launch post", "write a linkedin launch announcement");
    const twin = mkPrompt(
      "twin",
      "linkedin launch announcement",
      "linkedin post announcing the launch",
    );
    // 14 unrelated fillers — with the center that fills a 15-item page slice.
    const fillers = Array.from({ length: 14 }, (_, i) =>
      mkPrompt(`f${i}`, `unrelated topic ${i}`, `some unrelated body number ${i}`),
    );
    const pageSlice = [center, ...fillers]; // 15 items — twin paginated off
    const fullCorpus = [center, ...fillers, twin]; // 16 items — twin included

    const sliced = computeNeighborhood({ centerId: "c", corpus: pageSlice, usageEvents: [] });
    expect(sliced.nodes.find((n) => n.id === "twin")).toBeUndefined();

    const full = computeNeighborhood({ centerId: "c", corpus: fullCorpus, usageEvents: [] });
    expect(full.nodes.find((n) => n.id === "twin")).toBeDefined();
  });

  it("warns in development when centerId is absent from the corpus (precondition tripwire)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { nodes } = computeNeighborhood({
        centerId: "ghost",
        corpus: [mkPrompt("c", "present", "present body")],
        usageEvents: [],
      });
      expect(nodes).toHaveLength(0);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
