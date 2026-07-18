import { describe, it, expect } from "vitest";
import { getPaginationPages } from "../pagination-utils";

describe("getPaginationPages", () => {
  it("lists every page with no ellipsis when there are 7 or fewer pages", () => {
    expect(getPaginationPages(1, 1)).toEqual([1]);
    expect(getPaginationPages(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("elides the tail when near the start", () => {
    expect(getPaginationPages(10, 1)).toEqual([1, 2, "...", 10]);
    expect(getPaginationPages(10, 2)).toEqual([1, 2, 3, "...", 10]);
  });

  it("windows ±1 around the current page in the middle", () => {
    expect(getPaginationPages(10, 5)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });

  it("elides the head when near the end", () => {
    expect(getPaginationPages(10, 10)).toEqual([1, "...", 9, 10]);
  });
});
