import { describe, it, expect } from "vitest";
import { buildGraphData } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { computeInsights } from "../graph-utils";

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

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

describe("computeInsights", () => {
  it("marks prompts not used in 30+ days as underused", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const { underusedIds, underusedCount } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(underusedIds.has("p1")).toBe(true);
    expect(underusedCount).toBe(1);
  });

  it("marks never-used prompts older than 14 days as underused", () => {
    const p = makePrompt("p1", {
      last_used_at: null,
      created_at: new Date(Date.now() - FIFTEEN_DAYS_MS).toISOString(),
    });
    const { underusedIds } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(underusedIds.has("p1")).toBe(true);
  });

  it("does NOT mark recently used prompts as underused", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
    });
    const { underusedIds } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(underusedIds.has("p1")).toBe(false);
  });

  it("marks prompts with score < 60 as low_score", () => {
    const p1 = makePrompt("p1");
    const p2 = makePrompt("p2");
    const { lowScoreIds, lowScoreCount } = computeInsights(
      [p1, p2],
      [],
      new Map([
        ["p1", 59],
        ["p2", 60],
      ]),
    );
    expect(lowScoreIds.has("p1")).toBe(true);
    expect(lowScoreIds.has("p2")).toBe(false);
    expect(lowScoreCount).toBe(1);
  });

  it("marks prompts used within 7 days as recent", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
    });
    const { recentIds } = computeInsights([p], [], new Map([["p1", 70]]));
    expect(recentIds.has("p1")).toBe(true);
  });

  it("collects clustered IDs from clusters", () => {
    const p1 = makePrompt("p1");
    const p2 = makePrompt("p2");
    const cluster = {
      clusterId: "c1",
      nodeIds: ["p1", "p2"],
      label: "test",
      color: "#f59e0b",
      capability: CapabilityMode.STANDARD,
    };
    const { clusteredIds, clusterCount } = computeInsights([p1, p2], [cluster], new Map());
    expect(clusteredIds.has("p1")).toBe(true);
    expect(clusteredIds.has("p2")).toBe(true);
    expect(clusterCount).toBe(1);
  });

  it("picks the highest-score underused prompt as dailyPickId", () => {
    const p1 = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const p2 = makePrompt("p2", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const { dailyPickId } = computeInsights(
      [p1, p2],
      [],
      new Map([
        ["p1", 65],
        ["p2", 80],
      ]),
    );
    expect(dailyPickId).toBe("p2");
  });

  it("returns dailyPickId null when no prompts are underused", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
    });
    const { dailyPickId } = computeInsights([p], [], new Map([["p1", 80]]));
    expect(dailyPickId).toBeNull();
  });

  it("returns all zeros for empty input", () => {
    const result = computeInsights([], [], new Map());
    expect(result.underusedCount).toBe(0);
    expect(result.lowScoreCount).toBe(0);
    expect(result.recentCount).toBe(0);
    expect(result.clusterCount).toBe(0);
    expect(result.dailyPickId).toBeNull();
  });

  it("includes prompt in both underused and low_score when both conditions met", () => {
    const p = makePrompt("p1", {
      last_used_at: new Date(Date.now() - THIRTY_ONE_DAYS_MS).toISOString(),
    });
    const { underusedIds, lowScoreIds } = computeInsights([p], [], new Map([["p1", 45]]));
    expect(underusedIds.has("p1")).toBe(true);
    expect(lowScoreIds.has("p1")).toBe(true);
  });

  it("treats prompt used exactly 7 days ago as NOT recent (< boundary)", () => {
    const exactlySeven = makePrompt("p1", {
      last_used_at: new Date(Date.now() - SEVEN_DAYS_MS).toISOString(),
    });
    const { recentIds } = computeInsights([exactlySeven], [], new Map([["p1", 70]]));
    expect(recentIds.has("p1")).toBe(false);
  });
});
