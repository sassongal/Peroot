import { describe, it, expect } from "vitest";
import { resolveTargetModel } from "../target-model.js";

const REGISTRY = {
  chatgpt: { hosts: ["chatgpt.com"], profile_slug: "gpt-5" },
  claude: { hosts: ["claude.ai"], profile_slug: "claude-sonnet-4" },
};

describe("resolveTargetModel", () => {
  it("returns host-matched profile_slug when no override", () => {
    expect(
      resolveTargetModel({ hostname: "chatgpt.com", registry: REGISTRY, override: null }),
    ).toBe("gpt-5");
  });

  it("returns override when present", () => {
    expect(
      resolveTargetModel({
        hostname: "chatgpt.com",
        registry: REGISTRY,
        override: "claude-sonnet-4",
      }),
    ).toBe("claude-sonnet-4");
  });

  it("returns null when host unknown and no override", () => {
    expect(
      resolveTargetModel({ hostname: "example.com", registry: REGISTRY, override: null }),
    ).toBeNull();
  });

  it("override beats unknown host", () => {
    expect(
      resolveTargetModel({ hostname: "example.com", registry: REGISTRY, override: "gpt-5" }),
    ).toBe("gpt-5");
  });

  it("ignores empty-string override", () => {
    expect(resolveTargetModel({ hostname: "chatgpt.com", registry: REGISTRY, override: "" })).toBe(
      "gpt-5",
    );
  });
});
