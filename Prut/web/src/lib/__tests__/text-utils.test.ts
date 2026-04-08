import { describe, it, expect } from "vitest";
import { extractPlaceholders } from "@/lib/text-utils";

describe("extractPlaceholders", () => {
    it("extracts simple single-word placeholders", () => {
        expect(extractPlaceholders("Hello {name}, welcome to {product}"))
            .toEqual(["name", "product"]);
    });

    it("deduplicates repeated placeholders", () => {
        expect(extractPlaceholders("{tone} ... {tone} ... {audience}"))
            .toEqual(["tone", "audience"]);
    });

    it("returns an empty array when there are no braces", () => {
        expect(extractPlaceholders("just a plain prompt")).toEqual([]);
    });

    it("accepts Hebrew placeholder names", () => {
        expect(extractPlaceholders("{קהל_יעד} ו-{מטרה}"))
            .toEqual(["קהל_יעד", "מטרה"]);
    });

    // Regression: the image engine's nanobanana-json / stable-diffusion-json
    // outputs are raw JSON. The old regex treated every `{…}` block as a
    // placeholder, which caused the ResultSection layout to flip into
    // variable-panel mode and squish the result column to half width —
    // users perceived it as "JSON is truncated". These tests guarantee
    // that multi-line JSON bodies are ignored.
    it("ignores JSON object bodies so they are not treated as placeholders", () => {
        const json = `{
  "subject": {
    "description": "שלזי, כלבה שחורה אלגנטית",
    "expression": "calm"
  },
  "camera": {
    "lens": "85mm",
    "aperture": "f/1.8"
  }
}`;
        expect(extractPlaceholders(json)).toEqual([]);
    });

    it("finds embedded valid tokens but still ignores the surrounding JSON structure", () => {
        // With the canonical (strict) VARIABLE_TOKEN_REGEX, the extractor
        // finds `{name}` and `{greeting}` as legitimate single-word tokens
        // — they happen to live inside a JSON string value, but as far as
        // the user is concerned they are still fillable placeholders. The
        // surrounding JSON structure (outer `{`, `"prompt":`, `"settings":
        // { "tone": "formal" }`) is correctly IGNORED because none of
        // those fragments match the strict token shape.
        const mixed = `{
  "prompt": "Hello {name}, this is {greeting}",
  "settings": { "tone": "formal" }
}`;
        expect(extractPlaceholders(mixed)).toEqual(["name", "greeting"]);
    });

    it("rejects placeholder candidates that are too long", () => {
        const over40Chars = "x".repeat(41);
        expect(extractPlaceholders(`prefix {${over40Chars}} suffix`)).toEqual([]);
    });

    it("rejects placeholder candidates that contain quotes or control characters", () => {
        expect(extractPlaceholders('{ "not_a_placeholder": "value" }')).toEqual([]);
        expect(extractPlaceholders("{with\nnewline}")).toEqual([]);
    });
});
