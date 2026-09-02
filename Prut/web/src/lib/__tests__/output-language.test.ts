/**
 * Script detection is what makes the output language a suggestion instead of
 * a setting nobody finds. It has to be right about the common shapes of real
 * input here: Hebrew full of English product names, short fragments that are
 * not a language yet, and clean Arabic, Russian and English.
 */
import { describe, it, expect } from "vitest";
import {
  detectScriptLanguage,
  scriptMatchShare,
  SCRIPT_MATCH_MIN,
  OUTPUT_LANGUAGES,
  isOutputLanguage,
} from "../output-language";

describe("detectScriptLanguage", () => {
  it("reads Hebrew as Hebrew", () => {
    expect(detectScriptLanguage("כתוב פוסט לרשתות החברתיות על המוצר החדש").language).toBe("hebrew");
  });

  it("keeps Hebrew with English product names as Hebrew", () => {
    // The most common shape of input on the site. Latin must not win here.
    const r = detectScriptLanguage("כתוב לי פוסט על ChatGPT ו-Notion AI לקהל של מנהלי מוצר");
    expect(r.language).toBe("hebrew");
  });

  it("reads Arabic as Arabic", () => {
    expect(detectScriptLanguage("اكتب منشورا تسويقيا لمنتج جديد موجها للشباب").language).toBe(
      "arabic",
    );
  });

  it("reads Russian as Russian", () => {
    expect(
      detectScriptLanguage("Напиши маркетинговый пост о новом продукте для молодой аудитории")
        .language,
    ).toBe("russian");
  });

  it("reads English as English only when it clearly dominates", () => {
    expect(
      detectScriptLanguage("Write a marketing post about our new product for a young audience")
        .language,
    ).toBe("english");
    // Half and half is not English.
    expect(
      detectScriptLanguage("Write a post על המוצר החדש שלנו for young people").language,
    ).toBeNull();
  });

  it("decides nothing on a few characters", () => {
    expect(detectScriptLanguage("hi").language).toBeNull();
    expect(detectScriptLanguage("שלום").language).toBeNull();
  });

  it("ignores digits, urls and punctuation", () => {
    const r = detectScriptLanguage(
      "סכם את המאמר https://example.com/a/b?c=1 ב-3 נקודות, 2024-2025",
    );
    expect(r.language).toBe("hebrew");
  });
});

describe("scriptMatchShare", () => {
  it("is high when the output is in the requested script", () => {
    expect(scriptMatchShare("Вы эксперт по маркетингу. Напишите пост.", "russian")).toBeGreaterThan(
      SCRIPT_MATCH_MIN,
    );
  });

  it("is low when the model answered in Hebrew instead of Arabic", () => {
    expect(scriptMatchShare("אתה מומחה שיווק. כתוב פוסט קצר.", "arabic")).toBeLessThan(
      SCRIPT_MATCH_MIN,
    );
  });

  it("tolerates code identifiers inside a Hebrew answer", () => {
    const text = "אתה מהנדס. כתוב פונקציה בשם parseUser שמחזירה JSON. הסבר בעברית.";
    expect(scriptMatchShare(text, "hebrew")).toBeGreaterThan(SCRIPT_MATCH_MIN);
  });
});

describe("the language table", () => {
  it("names every language in its own script and never with a flag", () => {
    for (const l of OUTPUT_LANGUAGES) {
      expect(l.native).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
      expect(l.native.length).toBeGreaterThan(0);
    }
  });

  it("validates codes", () => {
    expect(isOutputLanguage("arabic")).toBe(true);
    expect(isOutputLanguage("klingon")).toBe(false);
    expect(isOutputLanguage(null)).toBe(false);
  });
});
