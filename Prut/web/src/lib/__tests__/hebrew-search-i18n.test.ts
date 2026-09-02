/**
 * The one text normalizer behind every prompt search also has to serve
 * Arabic and Russian prompts (languages spec B5): vowel marks and spelling
 * variants must not hide a match, and the Hebrew behaviour must not move.
 */
import { describe, it, expect } from "vitest";
import { normalizeHebrew, hebrewFuzzyMatch } from "../hebrew-search";

describe("normalizeHebrew across scripts", () => {
  it("still strips niqqud and lowercases", () => {
    expect(normalizeHebrew("פֵּרוּט ABC")).toBe("פרוט abc");
  });

  it("strips Arabic tashkeel and folds hamza, taa marbuta and alef maqsura", () => {
    expect(normalizeHebrew("كِتَاب")).toBe("كتاب");
    expect(normalizeHebrew("أحمد إبراهيم آمال")).toBe("احمد ابراهيم امال");
    expect(normalizeHebrew("مدرسة")).toBe("مدرسه");
    expect(normalizeHebrew("مصطفى")).toBe("مصطفي");
  });

  it("folds Russian ё to е", () => {
    expect(normalizeHebrew("Ещё Тёплый")).toBe("еще теплый");
  });
});

describe("hebrewFuzzyMatch across scripts", () => {
  it("finds an Arabic prompt whether or not the query carries vowel marks", () => {
    const text = "اكتب رسالة إلى العملاء عن إطلاق المنتج";
    expect(hebrewFuzzyMatch(text, "رِسالة")).toBe(true);
    expect(hebrewFuzzyMatch(text, "الى العملاء")).toBe(true);
    expect(hebrewFuzzyMatch(text, "منتج")).toBe(true);
  });

  it("finds a Russian prompt typed with or without ё", () => {
    const text = "Напишите тёплое письмо клиенту";
    expect(hebrewFuzzyMatch(text, "теплое")).toBe(true);
    expect(hebrewFuzzyMatch(text, "Клиенту")).toBe(true);
    expect(hebrewFuzzyMatch(text, "договор")).toBe(false);
  });
});
