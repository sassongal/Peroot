import { describe, it, expect } from "vitest";
import { parsePersonalityJson } from "@/lib/intelligence/personality-analyzer";

const GOOD = '{"tokens":["מומחה"],"preferred_format":"רשימות","personality_brief":"תמציתי"}';

describe("parsePersonalityJson", () => {
  it("parses bare JSON", () => {
    expect(parsePersonalityJson(GOOD).tokens).toEqual(["מומחה"]);
  });

  it("parses fenced JSON (the production failure shape)", () => {
    expect(parsePersonalityJson("```json\n" + GOOD + "\n```").preferred_format).toBe("רשימות");
  });

  it("parses JSON surrounded by commentary and a fence", () => {
    const text = "הנה הניתוח:\n```json\n" + GOOD + "\n```\nמקווה שזה עוזר!";
    expect(parsePersonalityJson(text).personality_brief).toBe("תמציתי");
  });

  it("throws on truncated JSON so the job retries", () => {
    expect(() => parsePersonalityJson('```json\n{"tokens":["a",')).toThrow(/non-JSON|parse/);
  });

  it("throws on no JSON at all", () => {
    expect(() => parsePersonalityJson("sorry, cannot analyze")).toThrow(/non-JSON/);
  });
});
