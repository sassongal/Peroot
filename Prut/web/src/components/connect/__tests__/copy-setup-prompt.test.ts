import { describe, it, expect } from "vitest";
import { buildSetupPrompt } from "@/components/connect/CopySetupPrompt";

describe("buildSetupPrompt", () => {
  it("embeds a provided API key verbatim", () => {
    const key = "prk_live_" + "ab".repeat(20);
    const prompt = buildSetupPrompt(key);
    expect(prompt).toContain(`Authorization: Bearer ${key}`);
    expect(prompt).not.toContain("<API_KEY");
  });

  it("falls back to a Hebrew placeholder instructing where to create a key", () => {
    const prompt = buildSetupPrompt();
    expect(prompt).toContain("<API_KEY");
    expect(prompt).toContain("Connect");
  });

  it("teaches both connection paths and the verification step", () => {
    const prompt = buildSetupPrompt();
    expect(prompt).toContain("https://www.peroot.space/api/mcp");
    expect(prompt).toContain("https://www.peroot.space/api/v1/enhance");
    expect(prompt).toContain("https://www.peroot.space/api/v1/openapi");
    expect(prompt).toContain("get_quota");
    expect(prompt).toContain("context");
    expect(prompt).toContain("OAuth");
  });
});
