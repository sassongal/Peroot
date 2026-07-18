import { describe, it, expect } from "vitest";
import { DOCUMENT_CAPABILITY } from "../capability";
import { selectEnrichPrompt } from "../prompts";
import { resolveRole } from "../role-mapper";
import { enrichImage } from "../prompts/enrich-image";
import type { DocumentType } from "../types";

const ALL_TYPES: DocumentType[] = [
  "חוזה משפטי",
  "מסמך משפטי",
  "דוח כספי",
  "מאמר אקדמי",
  "דף שיווקי",
  "טבלת נתונים",
  "קוד מקור",
  "אימייל/התכתבות",
  "דף אינטרנט",
  "תמונה",
  "generic",
];

describe("DOCUMENT_CAPABILITY", () => {
  it("has an entry for every DocumentType (exhaustive — no silent drift)", () => {
    expect(Object.keys(DOCUMENT_CAPABILITY).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("preserves the compression mapping", () => {
    expect(DOCUMENT_CAPABILITY["קוד מקור"].compression).toBe("code");
    expect(DOCUMENT_CAPABILITY["טבלת נתונים"].compression).toBe("data");
    expect(DOCUMENT_CAPABILITY["חוזה משפטי"].compression).toBe("contract");
    expect(DOCUMENT_CAPABILITY["מסמך משפטי"].compression).toBe("contract");
    expect(DOCUMENT_CAPABILITY["מאמר אקדמי"].compression).toBe("academic");
    expect(DOCUMENT_CAPABILITY["דוח כספי"].compression).toBe("default"); // historical fall-through
  });

  it("characterizes the two drift types as the generic role (behavior preserved)", () => {
    const generic = DOCUMENT_CAPABILITY["generic"].role.role;
    expect(resolveRole(["מסמך משפטי"]).role).toBe(generic);
    expect(resolveRole(["דוח כספי"]).role).toBe(generic);
  });

  it("resolveRole still honors priority", () => {
    expect(resolveRole(["דף שיווקי", "חוזה משפטי"]).role).toBe("יועץ משפטי בכיר");
    expect(resolveRole(["מאמר אקדמי"]).role).toBe("חוקר בתחום התוכן");
    expect(resolveRole([]).role).toBe(DOCUMENT_CAPABILITY["generic"].role.role);
  });

  it("selectEnrichPrompt: image overrides type; otherwise the table entry", () => {
    expect(selectEnrichPrompt("חוזה משפטי", true)).toBe(enrichImage);
    expect(selectEnrichPrompt("חוזה משפטי", false)).toBe(
      DOCUMENT_CAPABILITY["חוזה משפטי"].enrichPrompt,
    );
    expect(selectEnrichPrompt("דוח כספי", false)).toBe(
      DOCUMENT_CAPABILITY["דוח כספי"].enrichPrompt,
    );
  });
});
