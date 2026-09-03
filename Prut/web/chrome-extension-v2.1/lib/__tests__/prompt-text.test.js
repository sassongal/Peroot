import { describe, expect, it } from "vitest";
import pt from "../prompt-text.js";

const DASH = String.fromCharCode(0x2014);

describe("extension prompt-text module", () => {
  it("strips the trailer, the title block and the self-review block", () => {
    const raw = `## תפקיד\nאתה כותב.\n[PROMPT_TITLE]פוסט[/PROMPT_TITLE]\n[GENIUS_QUESTIONS][{"id":"a","question":"למי?","examples":["מנהלים"]}]`;
    expect(pt.cleanForDisplay(raw)).toBe("## תפקיד\nאתה כותב.");
    expect(pt.parseTitle(raw)).toBe("פוסט");
    expect(pt.parseGeniusQuestions(raw)).toEqual([{ id: "a", question: "למי?", examples: ["מנהלים"] }]);
    expect(pt.cleanForDisplay("body\n<internal_quality_check>x</internal_quality_check>")).toBe("body");
  });

  it("does not split on a marker echoed mid-line", () => {
    const raw = "השתמש במילה [GENIUS_QUESTIONS] בתוך הטקסט\nשורה שנייה";
    expect(pt.cleanForDisplay(raw)).toBe(raw);
    expect(pt.parseGeniusQuestions(raw)).toEqual([]);
  });

  it("removes long dashes and model chatter", () => {
    expect(pt.cleanForDisplay(`Here's your prompt:\nכתוב ${DASH} בקצרה`)).toBe("כתוב, בקצרה");
  });

  it("extracts the first balanced JSON object for image engines", () => {
    const raw = 'noise {"a":{"b":"}"},"c":1} tail';
    expect(pt.cleanForDisplay(raw, { json: true })).toBe('{"a":{"b":"}"},"c":1}');
  });
});
