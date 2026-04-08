import { describe, it, expect } from "vitest";
import {
    extractVariables,
    getVariableLabel,
    getVariablePlaceholder,
    substituteVariables,
    VARIABLE_TOKEN_REGEX,
} from "@/lib/variable-utils";

describe("VARIABLE_TOKEN_REGEX", () => {
    it("is a global regex so matchAll works across all occurrences", () => {
        expect(VARIABLE_TOKEN_REGEX.flags).toContain("g");
    });
});

describe("extractVariables", () => {
    it("returns an empty list for empty / whitespace input", () => {
        expect(extractVariables("")).toEqual([]);
        expect(extractVariables("   ")).toEqual([]);
    });

    it("preserves first-appearance order and deduplicates", () => {
        const text = "A {tone}, later {brand}, then {tone} again, then {audience}";
        expect(extractVariables(text)).toEqual(["tone", "brand", "audience"]);
    });

    it("accepts Hebrew identifiers", () => {
        expect(extractVariables("{קהל_יעד} עם {מטרה}")).toEqual(["קהל_יעד", "מטרה"]);
    });

    it("accepts hyphen and single-space multi-word keys", () => {
        expect(extractVariables("{target audience} and {tone-style}"))
            .toEqual(["target audience", "tone-style"]);
    });

    it("rejects JSON object bodies even when they are the whole input", () => {
        const json = `{
  "subject": {
    "description": "a child",
    "expression": "calm"
  },
  "camera": { "lens": "50mm" }
}`;
        // The outer `{` is followed by a newline — not a valid identifier
        // first-character — so it's skipped. None of the JSON body
        // substrings (`subject":`, `"description":`, etc.) match the
        // identifier shape either.
        expect(extractVariables(json)).toEqual([]);
    });

    it("rejects empty braces and malformed tokens", () => {
        expect(extractVariables("{} {} { }")).toEqual([]);
        expect(extractVariables("{123name}")).toEqual([]); // starts with digit
        expect(extractVariables("{name with , comma}")).toEqual([]);
        expect(extractVariables('{ "quoted" }')).toEqual([]);
    });

    it("rejects tokens longer than the 40-character ceiling", () => {
        const tooLong = "a".repeat(41);
        expect(extractVariables(`{${tooLong}}`)).toEqual([]);
        const justFits = "a".repeat(40);
        expect(extractVariables(`{${justFits}}`)).toEqual([justFits]);
    });
});

describe("getVariableLabel", () => {
    it("returns the Hebrew label for a canonical registry key", () => {
        expect(getVariableLabel("brand_name")).toBe("שם המותג");
        expect(getVariableLabel("target_audience")).toBe("קהל יעד");
        expect(getVariableLabel("main_goal")).toBe("המטרה המרכזית");
    });

    it("is case-insensitive and tolerates whitespace", () => {
        expect(getVariableLabel("BRAND_NAME")).toBe("שם המותג");
        expect(getVariableLabel(" target audience ")).toBe("קהל יעד");
    });

    it("resolves common engine aliases that are not in the registry", () => {
        expect(getVariableLabel("tone")).toBe("טון");
        expect(getVariableLabel("format")).toBe("פורמט");
        expect(getVariableLabel("audience")).toBe("קהל יעד");
    });

    it("falls back to a humanized form for unknown keys", () => {
        // No registry or alias match — should strip underscores and
        // return something readable, NEVER raw snake_case.
        expect(getVariableLabel("unknown_custom_thing")).toBe("unknown custom thing");
    });

    it("returns empty string for empty input", () => {
        expect(getVariableLabel("")).toBe("");
        expect(getVariableLabel("   ")).toBe("");
    });

    it("never echoes raw snake_case back to the user for registered keys", () => {
        // Regression guard: a previous version of the Variables Panel
        // rendered the raw key as the label, exposing English snake_case
        // strings to Hebrew-speaking users.
        const registered = ["brand_name", "target_audience", "tone_style", "publish_platform"];
        for (const key of registered) {
            const label = getVariableLabel(key);
            expect(label, `key=${key}`).not.toContain("_");
        }
    });
});

describe("substituteVariables", () => {
    it("substitutes a single token", () => {
        expect(substituteVariables("Hello {name}", { name: "Gal" }))
            .toBe("Hello Gal");
    });

    it("substitutes multiple distinct tokens", () => {
        expect(
            substituteVariables("{greeting}, {name}! Welcome to {product}.", {
                greeting: "שלום",
                name: "גל",
                product: "Peroot",
            })
        ).toBe("שלום, גל! Welcome to Peroot.");
    });

    it("leaves a token untouched when its value is missing or empty", () => {
        expect(substituteVariables("A {a} B {b} C", { a: "ONE" }))
            .toBe("A ONE B {b} C");
        expect(substituteVariables("A {a}", { a: "" })).toBe("A {a}");
        expect(substituteVariables("A {a}", { a: "   " })).toBe("A {a}");
    });

    it("does not touch JSON-shaped braces inside the text", () => {
        const text = `Use JSON: { "k": "v" } and fill {brand_name}`;
        expect(
            substituteVariables(text, { brand_name: "Peroot" })
        ).toBe(`Use JSON: { "k": "v" } and fill Peroot`);
    });

    it("handles Hebrew values and Hebrew identifiers", () => {
        expect(
            substituteVariables("קהל: {קהל_יעד}, טון: {טון}", {
                קהל_יעד: "מפתחים",
                טון: "מקצועי",
            })
        ).toBe("קהל: מפתחים, טון: מקצועי");
    });
});

describe("getVariablePlaceholder", () => {
    it("returns the canonical example for a registered key", () => {
        expect(getVariablePlaceholder("brand_name")).toBe("Peroot");
        expect(getVariablePlaceholder("target_audience")).toBe("בעלי עסקים קטנים");
    });

    it("falls back to a Hebrew hint for unknown keys — never raw snake_case", () => {
        const hint = getVariablePlaceholder("something_weird_42");
        expect(hint).toContain("לדוגמה:");
        expect(hint).not.toContain("_");
    });
});
