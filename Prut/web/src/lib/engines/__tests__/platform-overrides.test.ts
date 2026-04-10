import { describe, it, expect } from "vitest";
import { getPlatformOverrides } from "../platform-overrides";

describe("getPlatformOverrides", () => {
  it("returns undefined for missing or invalid input", () => {
    expect(getPlatformOverrides(undefined)).toBeUndefined();
    expect(getPlatformOverrides({})).toBeUndefined();
    expect(getPlatformOverrides({ platform_overrides: [] as unknown as Record<string, unknown> })).toBeUndefined();
  });

  it("parses platform_overrides object", () => {
    const o = getPlatformOverrides({
      platform_overrides: {
        midjourney: { system_template: "SYS", user_template: "USR" },
      },
    });
    expect(o?.midjourney?.system_template).toBe("SYS");
    expect(o?.midjourney?.user_template).toBe("USR");
  });
});
