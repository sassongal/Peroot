import { describe, it, expect } from "vitest";
import { blockStatus } from "../stage";

describe("blockStatus", () => {
  it("error → error", () => {
    expect(blockStatus("error")).toBe("error");
  });

  it("ready and warning both → ready (warning counts as ready)", () => {
    expect(blockStatus("ready")).toBe("ready");
    expect(blockStatus("warning")).toBe("ready");
  });

  it("in-progress stages → pending", () => {
    expect(blockStatus("uploading")).toBe("pending");
    expect(blockStatus("extracting")).toBe("pending");
    expect(blockStatus("enriching")).toBe("pending");
  });
});
