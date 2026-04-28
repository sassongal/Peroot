import { describe, it, expect } from "vitest";
import { compressToLimit } from "../compress";

describe("compressToLimit", () => {
  it("returns text unchanged when under limit", () => {
    const r = compressToLimit("short text", 1000);
    expect(r.text).toBe("short text");
    expect(r.truncated).toBe(false);
    expect(r.originalTokenCount).toBeLessThanOrEqual(10);
  });

  it("truncates when over limit and sets flag", () => {
    const long = "x".repeat(20000);
    const r = compressToLimit(long, 1000);
    expect(r.truncated).toBe(true);
    expect(r.originalTokenCount).toBeGreaterThan(1000);
    expect(r.text.length).toBeLessThanOrEqual(4000 + 30);
  });

  it("default strategy: head 70% / tail 30%", () => {
    const text = "A".repeat(2000) + "B".repeat(2000);
    const r = compressToLimit(text, 500, "default"); // 500 tokens = 2000 chars
    expect(r.truncated).toBe(true);
    expect(r.text[0]).toBe("A");
    expect(r.text[r.text.length - 1]).toBe("B");
  });

  it("contract strategy: head 50% / tail 50%", () => {
    const head = "HEAD_".repeat(200);
    const tail = "TAIL_".repeat(200);
    const text = head + tail;
    const r = compressToLimit(text, 250, "contract"); // 250 tokens = 1000 chars
    expect(r.truncated).toBe(true);
    expect(r.text).toContain("HEAD_");
    expect(r.text).toContain("TAIL_");
    const parts = r.text.split("[...קוצר...]");
    expect(parts.length).toBe(2);
  });

  it("code strategy: includes signature lines before body", () => {
    const code = [
      "function doThing() {",
      "  const x = 1;",
      "  return x + 2;",
      "}",
      "",
      "const helper = (a) => {",
      "  return a * 2;",
      "};",
      "",
      ...Array.from({ length: 200 }, () => "// comment"),
    ].join("\n");
    const r = compressToLimit(code, 50, "code"); // tight budget
    expect(r.truncated).toBe(true);
    expect(r.text).toContain("function doThing");
  });

  it("data strategy: preserves header row", () => {
    const csv = [
      "id,name,value",
      ...Array.from({ length: 200 }, (_, i) => `${i + 1},item${i},${i * 10}`),
    ].join("\n");
    const r = compressToLimit(csv, 20, "data"); // very tight
    expect(r.truncated).toBe(true);
    expect(r.text).toContain("id,name,value");
  });

  it("academic strategy: includes head + tail sections", () => {
    const sections = [
      "Abstract: This paper presents findings on X.",
      ...Array.from({ length: 50 }, (_, i) => `Middle section paragraph ${i}`),
      "Conclusion: The results confirm X is valid.",
    ].join("\n");
    const r = compressToLimit(sections, 30, "academic"); // tight budget
    expect(r.truncated).toBe(true);
    expect(r.text).toContain("Abstract");
    expect(r.text).toContain("Conclusion");
  });

  it("no strategy argument defaults to default (head 70/tail 30)", () => {
    const text = "A".repeat(4000);
    const withDefault = compressToLimit(text, 500, "default");
    const withNoArg = compressToLimit(text, 500);
    expect(withDefault.text).toBe(withNoArg.text);
  });
});
