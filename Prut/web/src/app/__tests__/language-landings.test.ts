/**
 * The language landing pages (languages spec B7): /en, /ar, /ru.
 *
 * What has to stay true: each page is in its language and direction, the
 * four pages plus the Hebrew home form one hreflang cluster with x-default
 * on Hebrew, no copy carries a quota number or a dash, and the CTA presets
 * the output language on the home page.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LANDINGS, LANDING_LOCALES, LANGUAGE_ALTERNATES } from "@/lib/landing/language-landings";

const HEBREW = /[֐-׿]/;
const DASHES = /[–—]/;

function walkStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value as Record<string, unknown>).forEach((v) => walkStrings(v, out));
  return out;
}

describe("language landings", () => {
  it("exist for English, Arabic and Russian with the right direction", () => {
    expect(LANDING_LOCALES).toEqual(["en", "ar", "ru"]);
    expect(LANDINGS.ar.dir).toBe("rtl");
    expect(LANDINGS.en.dir).toBe("ltr");
    expect(LANDINGS.ru.dir).toBe("ltr");
  });

  it("carry no Hebrew (except the switcher label) and no dashes in their copy", () => {
    for (const locale of LANDING_LOCALES) {
      const { switcher: _switcher, ...copy } = LANDINGS[locale];
      const strings = walkStrings(copy).concat(
        LANDINGS[locale].freePlanLine(1),
        LANDINGS[locale].freePlanLine(2),
      );
      for (const s of strings) {
        expect(s, `${locale}: ${s}`).not.toMatch(HEBREW);
        expect(s, `${locale}: ${s}`).not.toMatch(DASHES);
      }
    }
  });

  it("never write a quota number into the copy: the line is built from the policy", () => {
    for (const locale of LANDING_LOCALES) {
      const c = LANDINGS[locale];
      expect(c.freePlanLine(1)).not.toBe(c.freePlanLine(3));
      const fixed = walkStrings({ ...c, freePlanLine: undefined, switcher: undefined });
      for (const s of fixed) expect(s).not.toMatch(/\b\d+\s+(enhancements?|улучшени|تحسين)/i);
    }
  });

  it("form one hreflang cluster with the Hebrew home as x-default", () => {
    expect(LANGUAGE_ALTERNATES["x-default"]).toBe("/");
    expect(LANGUAGE_ALTERNATES["he-IL"]).toBe("/");
    const layout = readFileSync(path.resolve(__dirname, "../layout.tsx"), "utf8");
    for (const l of LANDING_LOCALES) {
      expect(LANGUAGE_ALTERNATES[l]).toBe(`/${l}`);
      expect(layout).toContain(`${l}: "/${l}"`);
      const page = readFileSync(path.resolve(__dirname, `../(public)/${l}/page.tsx`), "utf8");
      expect(page).toContain(`canonical: "/${l}"`);
      expect(page).toContain("languages: LANGUAGE_ALTERNATES");
    }
  });

  it("the CTA lands on the home page with the language preset, and the app honours it", () => {
    const landing = readFileSync(
      path.resolve(__dirname, "../../components/landing/LanguageLanding.tsx"),
      "utf8",
    );
    expect(landing).toContain("`/?lang=${locale}`");
    expect(landing).toMatch(/<main[\s\S]*dir=\{c\.dir\}[\s\S]*lang=\{locale\}/);
    const home = readFileSync(path.resolve(__dirname, "../HomeClient.tsx"), "utf8");
    expect(home).toContain('searchParams.get("lang")');
    expect(home).toContain('"landing"');
  });
});
