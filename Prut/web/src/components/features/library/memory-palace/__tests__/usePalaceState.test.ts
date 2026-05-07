// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePalaceState } from "../usePalaceState";

describe("usePalaceState", () => {
  beforeEach(() => localStorage.clear());

  it("starts not collapsed (hydration-safe)", () => {
    const { result } = renderHook(() => usePalaceState());
    expect(result.current.isCollapsed).toBe(false);
  });

  it("toggleCollapsed flips state and persists", () => {
    const { result } = renderHook(() => usePalaceState());
    act(() => result.current.toggleCollapsed());
    expect(result.current.isCollapsed).toBe(true);
    expect(localStorage.getItem("peroot_palace_collapsed")).toBe("true");
  });

  it("restores persisted collapsed state on mount", async () => {
    localStorage.setItem("peroot_palace_collapsed", "true");
    const { result } = renderHook(() => usePalaceState());
    await act(() => Promise.resolve());
    expect(result.current.isCollapsed).toBe(true);
  });
});
