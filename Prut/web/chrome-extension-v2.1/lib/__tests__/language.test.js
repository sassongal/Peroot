import { describe, expect, it } from "vitest";
import lang from "../language.js";

describe("extension language module", () => {
  it("detects the four scripts and stays null when unsure", () => {
    expect(lang.detectScriptLanguage("תכתוב פוסט לינקדאין על המוצר החדש שלנו").language).toBe("hebrew");
    expect(lang.detectScriptLanguage("write a linkedin post about our new product").language).toBe("english");
    expect(lang.detectScriptLanguage("اكتب منشور لينكد إن عن منتجنا الجديد").language).toBe("arabic");
    expect(lang.detectScriptLanguage("напиши пост для linkedin о нашем продукте").language).toBe("russian");
    expect(lang.detectScriptLanguage("hi").language).toBeNull();
    // Hebrew with English product names is still Hebrew.
    expect(lang.detectScriptLanguage("כתוב פוסט על ChatGPT ו-Notion למנהלי מוצר").language).toBe("hebrew");
  });

  it("sends the language only when it is not the server default", () => {
    expect(lang.resolveOutputLanguage("hebrew", "anything")).toBeNull();
    expect(lang.resolveOutputLanguage("arabic", "anything")).toBe("arabic");
    expect(lang.resolveOutputLanguage("auto", "write a linkedin post about our new product")).toBe("english");
    expect(lang.resolveOutputLanguage("auto", "תכתוב פוסט לינקדאין על המוצר")).toBeNull();
    expect(lang.resolveOutputLanguage("nonsense", "x")).toBeNull();
  });

  it("gives a direction for result boxes", () => {
    expect(lang.textDirection("Русский текст здесь")).toBe("ltr");
    expect(lang.textDirection("טקסט בעברית כאן")).toBe("rtl");
    expect(lang.textDirection("12")).toBe("auto");
  });
});
