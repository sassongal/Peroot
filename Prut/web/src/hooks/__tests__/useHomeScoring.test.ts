// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (val: unknown) => val, // identity — no wait in tests
}));
vi.mock("@/lib/engines/base-engine", () => ({
  BaseEngine: { scorePrompt: () => ({ score: 55, level: "medium" }) },
}));
vi.mock("@/lib/engines/scoring/enhanced-scorer", () => ({
  EnhancedScorer: {
    score: () => ({ total: 72, label: "גבוה", topWeaknesses: ["a", "b", "c", "d"] }),
  },
}));
vi.mock("@/lib/engines/scoring/input-scorer", () => ({
  scoreInput: (_text: string) => ({ total: 60, level: "medium" }),
}));
vi.mock("@/lib/text-utils", () => ({
  extractPlaceholders: (text: string) =>
    Array.from(text.matchAll(/\{(\w+)\}/g)).map((m) => m[1]),
}));

import { useHomeScoring } from "../useHomeScoring";
import { CapabilityMode } from "@/lib/capability-mode";

describe("useHomeScoring", () => {
  const base = {
    input: "כתוב לי {topic}",
    completion: "תוצאה מעולה",
    selectedCapability: CapabilityMode.STANDARD,
  };

  it("returns inputScore from BaseEngine.scorePrompt", () => {
    const { result } = renderHook(() => useHomeScoring(base));
    expect(result.current.inputScore).toEqual({ score: 55, level: "medium" });
  });

  it("completionScore maps enhanced total ≥ 70 to level=high", () => {
    const { result } = renderHook(() => useHomeScoring(base));
    expect(result.current.completionScore.level).toBe("high");
    expect(result.current.completionScore.score).toBe(72);
    expect(result.current.completionScore.tips).toHaveLength(3); // sliced at 3
  });

  it("completionScore is empty when completion is blank", () => {
    const { result } = renderHook(() =>
      useHomeScoring({ ...base, completion: "" })
    );
    expect(result.current.completionScore.level).toBe("empty");
    expect(result.current.completionScore.score).toBe(0);
  });

  it("extracts placeholders from completion", () => {
    const { result } = renderHook(() =>
      useHomeScoring({ ...base, completion: "כתוב {name} על {topic}" })
    );
    expect(result.current.placeholders).toEqual(["name", "topic"]);
  });

  it("extracts inputVariables from input", () => {
    const { result } = renderHook(() => useHomeScoring(base));
    expect(result.current.inputVariables).toEqual(["topic"]);
  });

  it("handleInterimChange is a stable callback", () => {
    const { result, rerender } = renderHook(() => useHomeScoring(base));
    const first = result.current.handleInterimChange;
    rerender();
    expect(result.current.handleInterimChange).toBe(first);
  });

  it("EMA smoothing: liveInputScore.total converges toward rawInputScore.total", () => {
    // scoreInput returns total=60 always in mock.
    // First render: prevScore=0, smoothed = round(0*0.3 + 60*0.7) = 42
    const { result } = renderHook(() => useHomeScoring(base));
    expect(result.current.liveInputScore?.total).toBe(42);
  });
});
