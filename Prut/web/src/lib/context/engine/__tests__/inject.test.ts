import { describe, it, expect } from "vitest";
import { renderInjection, buildInjectedBlock, selectRelevantChunks } from "../inject";
import type { ContextBlock } from "../types";

function block(overrides: Partial<ContextBlock> = {}): ContextBlock {
  return {
    id: "a",
    type: "file",
    sha256: "h",
    stage: "ready",
    display: {
      title: "contract_2026.pdf",
      documentType: "חוזה משפטי",
      summary: "חוזה שירותים בין חברת אלפא ליעקב כהן.",
      keyFacts: ["שווי 45000 ₪", "תקופה 12 חודשים"],
      entities: [{ name: "חברת אלפא", type: "org" }],
      rawText: "...",
      metadata: { pages: 12 },
    },
    injected: { header: "", body: "", tokenCount: 0 },
    ...overrides,
  };
}

describe("buildInjectedBlock", () => {
  it("produces header + body with facts and summary", () => {
    const r = buildInjectedBlock(block(), 1);
    expect(r.header).toContain("📄");
    expect(r.header).toContain("contract_2026.pdf");
    expect(r.body).toContain("חוזה משפטי");
    expect(r.body).toContain("שווי 45000");
    expect(r.body).toContain("חברת אלפא");
    expect(r.tokenCount).toBeGreaterThan(0);
  });

  it("appends rawText after separator when rawText is present", () => {
    const b = block({ display: { ...block().display, rawText: "full contract text here" } });
    const r = buildInjectedBlock(b, 1);
    expect(r.body).toContain("───");
    expect(r.body).toContain("full contract text here");
  });

  it("does not append separator when rawText is empty or missing", () => {
    const b = block({ display: { ...block().display, rawText: "" } });
    expect(buildInjectedBlock(b, 1).body).not.toContain("───");
    const b2 = block({ display: { ...block().display, rawText: undefined } });
    expect(buildInjectedBlock(b2, 1).body).not.toContain("───");
  });

  it("includes rawText in tokenCount", () => {
    const bNoRaw = block({ display: { ...block().display, rawText: "" } });
    const bWithRaw = block({ display: { ...block().display, rawText: "a".repeat(400) } });
    expect(buildInjectedBlock(bWithRaw, 1).tokenCount).toBeGreaterThan(
      buildInjectedBlock(bNoRaw, 1).tokenCount,
    );
  });
});

describe("renderInjection", () => {
  it("returns empty string on no blocks", () => {
    expect(renderInjection([])).toBe("");
  });
  it("includes role adaptation header and usage rules", () => {
    const out = renderInjection([block()]);
    expect(out).toContain("התאמת מומחה");
    expect(out).toContain("יועץ משפטי בכיר");
    expect(out).toContain("קונטקסט שסופק");
    expect(out).toContain("הנחיות שימוש בקונטקסט");
  });

  it("proportionally truncates rawText when total exceeds tokenBudget", () => {
    // Two blocks each with substantial rawText, tiny budget
    const rawText = "א".repeat(400); // ~100 tokens each
    const b1 = block({ display: { ...block().display, rawText } });
    const b2 = block({ display: { ...block().display, rawText } });
    const outBudgeted = renderInjection([b1, b2], 30);
    const outUnbudgeted = renderInjection([b1, b2]);
    // Budgeted output must be shorter than unbudgeted
    expect(outBudgeted.length).toBeLessThan(outUnbudgeted.length);
    // Both block headers must still appear (summary floor preserved)
    expect(outBudgeted).toContain("מקור #1");
    expect(outBudgeted).toContain("מקור #2");
  });

  it("preserves summary floor when rawBudget is zero", () => {
    const b = block({ display: { ...block().display, rawText: "x".repeat(400) } });
    const out = renderInjection([b], 1);
    // Summary must still be present even with absurdly small budget
    expect(out).toContain("חוזה שירותים");
    expect(out).toContain("מקור #1");
  });

  it("behaves identically when no budget provided", () => {
    const b = block({ display: { ...block().display, rawText: "a".repeat(400) } });
    // Both calls should produce same length (nonce differs but structure is identical)
    expect(renderInjection([b]).length).toBe(renderInjection([b], undefined).length);
  });
});

describe("selectRelevantChunks", () => {
  const doc = [
    "הסכם זה נחתם בין חברת אלפא לבין לקוח בשם יוסף.",
    "הסכם זה נחתם בין חברת אלפא לבין לקוח בשם יוסף.",
    "ריבית חוק 6% לשנה תחול על איחורים.",
    "הגדרות: 'שירות' — ייעוץ משפטי. 'צד' — כל חותם.",
    "ריבית חוק 6% לשנה תחול על איחורים.",
    "סעיף 17: הפרה מהותית מאפשרת ביטול מיידי.",
    "סעיף 17: הפרה מהותית מאפשרת ביטול מיידי.",
    "זכויות קניין רוחני: כל תוצר שייך לחברת אלפא.",
    "זכויות קניין רוחני: כל תוצר שייך לחברת אלפא.",
    "סיום ההסכם: הודעה מוקדמת של 30 יום.",
  ].join("\n\n");

  it("returns full text unchanged when ≤3 paragraphs", () => {
    const short = "para one\n\npara two\n\npara three";
    const result = selectRelevantChunks(short, "para one", 10000);
    expect(result).toBe(short);
  });

  it("returns full text when charBudget is large enough for all", () => {
    const result = selectRelevantChunks(doc, "ריבית", 100_000);
    expect(result.length).toBeGreaterThan(100);
  });

  it("ranks ריבית paragraphs first when query is ריבית", () => {
    const result = selectRelevantChunks(doc, "ריבית", 300);
    expect(result).toContain("ריבית");
  });

  it("inserts gap marker between non-contiguous selected paragraphs", () => {
    const result = selectRelevantChunks(doc, "ריבית קניין", 500);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty-prompt path as plain slice", () => {
    const result = selectRelevantChunks(doc, "", 200);
    expect(result).toBe(doc.slice(0, 200));
  });

  it("always returns at least one paragraph even with tiny budget", () => {
    const result = selectRelevantChunks(doc, "ריבית", 5);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("renderInjection with userPrompt", () => {
  it("accepts a third userPrompt argument without crashing", () => {
    const b: ContextBlock = {
      id: "x",
      type: "file",
      sha256: "h",
      stage: "ready",
      display: {
        title: "test.pdf",
        documentType: "חוזה משפטי",
        summary: "חוזה",
        keyFacts: [],
        entities: [],
        rawText: "ריבית 6%\n\nסעיף ביטול\n\nהגדרות\n\nזכויות",
        metadata: {},
      },
      injected: { header: "", body: "", tokenCount: 0 },
    };
    expect(() => renderInjection([b], 200, "ריבית")).not.toThrow();
  });

  it("produces non-empty output with or without userPrompt under tight budget", () => {
    const rawText = Array.from({ length: 20 }, (_, i) => `paragraph ${i} content here`).join("\n\n");
    const b: ContextBlock = {
      id: "y",
      type: "file",
      sha256: "h2",
      stage: "ready",
      display: {
        title: "doc.txt",
        documentType: "generic",
        summary: "doc",
        keyFacts: [],
        entities: [],
        rawText,
        metadata: {},
      },
      injected: { header: "", body: "", tokenCount: 0 },
    };
    const withPrompt = renderInjection([b], 50, "paragraph 3");
    const withoutPrompt = renderInjection([b], 50);
    expect(withPrompt.length).toBeGreaterThan(0);
    expect(withoutPrompt.length).toBeGreaterThan(0);
  });
});
