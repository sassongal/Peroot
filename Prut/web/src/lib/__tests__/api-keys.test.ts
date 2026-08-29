import { describe, it, expect } from "vitest";
import {
  API_KEY_DISPLAY_PREFIX_LEN,
  API_KEY_PATTERN,
  generateApiKey,
  hashApiKey,
  hashesEqual,
} from "@/lib/api-keys";

describe("api-keys", () => {
  it("generates keys in the documented format (prk_live_ + 40 hex)", () => {
    const { raw } = generateApiKey();
    expect(raw).toMatch(API_KEY_PATTERN);
    expect(raw.length).toBe("prk_live_".length + 40);
  });

  it("prefix is the first 16 chars of the raw key", () => {
    const { raw, prefix } = generateApiKey();
    expect(prefix).toBe(raw.slice(0, API_KEY_DISPLAY_PREFIX_LEN));
    expect(prefix.length).toBe(16);
  });

  it("hash is the sha256 hex of the raw key and is deterministic", () => {
    const { raw, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(raw));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique keys", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateApiKey().raw));
    expect(seen.size).toBe(50);
  });

  it("hashesEqual matches identical digests and rejects different/empty ones", () => {
    const a = hashApiKey("prk_live_" + "a".repeat(40));
    const b = hashApiKey("prk_live_" + "b".repeat(40));
    expect(hashesEqual(a, a)).toBe(true);
    expect(hashesEqual(a, b)).toBe(false);
    expect(hashesEqual("", "")).toBe(false);
  });
});
