import { describe, it, expect } from "vitest";
import { selectModelByLength } from "../models";

describe("selectModelByLength", () => {
  it("routes short prompts to flash-lite", () => {
    expect(selectModelByLength(50)).toBe("gemini-2.5-flash-lite");
    expect(selectModelByLength(199)).toBe("gemini-2.5-flash-lite");
  });
  it("routes long prompts to flash", () => {
    expect(selectModelByLength(200)).toBe("gemini-2.5-flash");
    expect(selectModelByLength(5000)).toBe("gemini-2.5-flash");
  });
  it("respects custom threshold", () => {
    expect(selectModelByLength(150, 100)).toBe("gemini-2.5-flash");
    expect(selectModelByLength(50, 100)).toBe("gemini-2.5-flash-lite");
  });
});
