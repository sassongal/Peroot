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

    it("does not leak placeholders from inside a JSON envelope", () => {
        // The regex is greedy and advances past each matched region. The
        // first match swallows `{\n  "prompt": "Hello {name}` as one
        // compound token (filtered out because it contains quotes/newlines),
        // so the `{name}` inside the JSON string is intentionally NOT
        // picked up as a placeholder. `{greeting}` sits in a clean region
        // after that match and IS detected. This is the desired behavior:
        // when the output is a JSON envelope, we do not want to prompt the
        // user to "fill in" tokens that appear inside JSON string values.
        const mixed = `{
  "prompt": "Hello {name}, this is {greeting}",
  "settings": { "tone": "formal" }
}`;
        expect(extractPlaceholders(mixed)).toEqual(["greeting"]);
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
