/**
 * Native standard-engine templates (languages spec B3.5).
 *
 * The point of a native template is that the model imitates demonstrations
 * written in the target language instead of translating Hebrew ones, so the
 * tests check the demonstrations are there, that no Hebrew leaked into the
 * template, and that the engine still appends the enforcement override.
 */
import { describe, it, expect } from "vitest";
import { buildStandardTemplates, hasNativeStandardTemplate } from "../standard-locales";
import { StandardEngine } from "../standard-engine";
import { CapabilityMode } from "@/lib/capability-mode";

const HEBREW = /[֐-׿]/;

describe("buildStandardTemplates", () => {
  it("exists for English, Arabic and Russian, not for Hebrew", () => {
    expect(hasNativeStandardTemplate("english")).toBe(true);
    expect(hasNativeStandardTemplate("arabic")).toBe(true);
    expect(hasNativeStandardTemplate("russian")).toBe(true);
    expect(hasNativeStandardTemplate("hebrew")).toBe(false);
    expect(hasNativeStandardTemplate(undefined)).toBe(false);
  });

  it("carries the section names and the quality anchor in the target language", () => {
    const ar = buildStandardTemplates("arabic");
    expect(ar.system_prompt_template).toContain("## الدور والهوية");
    expect(ar.system_prompt_template).toContain("الفصحى");
    expect(ar.system_prompt_template).toContain("أنت استراتيجي محتوى B2B");
    const ru = buildStandardTemplates("russian");
    expect(ru.system_prompt_template).toContain("## Роль и идентичность");
    expect(ru.system_prompt_template).toContain("Вы стратег B2B-контента");
    const en = buildStandardTemplates("english");
    expect(en.system_prompt_template).toContain("## Role and Identity");
  });

  it("contains no Hebrew at all, and keeps the template variables", () => {
    for (const lang of ["english", "arabic", "russian"] as const) {
      const t = buildStandardTemplates(lang);
      expect(t.system_prompt_template, lang).not.toMatch(HEBREW);
      expect(t.user_prompt_template, lang).not.toMatch(HEBREW);
      expect(t.system_prompt_template).toContain("{{tone}}");
      expect(t.system_prompt_template).toContain("{{category}}");
      expect(t.user_prompt_template).toContain("{{input}}");
      expect(t.system_prompt_template).not.toMatch(/[–—]/);
    }
  });

  it("mirrors the Hebrew template's architecture section for section", () => {
    const he = new StandardEngine() as unknown as { config: { system_prompt_template: string } };
    const en = buildStandardTemplates("english").system_prompt_template;
    for (const marker of [
      "PROMPT ARCHITECTURE",
      "ADVANCED OPTIMIZATION TECHNIQUES",
      "ANTI-PATTERNS, NEVER DO THESE",
      "PROPORTIONAL COMPLEXITY",
      "QUALITY ANCHOR",
      "QUALITY CHECKLIST",
    ]) {
      expect(he.config.system_prompt_template, marker).toContain(marker);
      expect(en, marker).toContain(marker);
    }
  });

  it("a StandardEngine built on the Russian template still appends the override", () => {
    const engine = new StandardEngine({
      mode: CapabilityMode.STANDARD,
      name: "Standard Engine",
      ...buildStandardTemplates("russian"),
    });
    const out = engine.generate({
      prompt: "напиши пост о запуске продукта",
      tone: "professional",
      category: "general",
      mode: CapabilityMode.STANDARD,
      outputLanguage: "russian",
    });
    expect(out.systemPrompt).toContain("## Роль и идентичность");
    expect(out.systemPrompt).toContain(
      "[OUTPUT_LANGUAGE_OVERRIDE, HIGHEST PRIORITY, READ THIS LAST]",
    );
    expect(out.userPrompt).toContain("Output ONLY the final Russian prompt");
  });
});
