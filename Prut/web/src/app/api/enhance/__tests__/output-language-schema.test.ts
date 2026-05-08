import { describe, it, expect } from "vitest";
import { z } from "zod";

const outputLanguageSchema = z.enum(["hebrew", "english", "arabic", "russian"]).optional();

describe("output_language Zod schema", () => {
  it("accepts hebrew", () => expect(outputLanguageSchema.parse("hebrew")).toBe("hebrew"));
  it("accepts english", () => expect(outputLanguageSchema.parse("english")).toBe("english"));
  it("accepts arabic", () => expect(outputLanguageSchema.parse("arabic")).toBe("arabic"));
  it("accepts russian", () => expect(outputLanguageSchema.parse("russian")).toBe("russian"));
  it("accepts undefined", () => expect(outputLanguageSchema.parse(undefined)).toBeUndefined());
  it("rejects unknown value", () => expect(() => outputLanguageSchema.parse("french")).toThrow());
});
