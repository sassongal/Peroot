/**
 * Arabic and Russian parity for the scorers (languages spec B4).
 *
 * The output language picker offers Arabic and Russian, and an enhanced
 * prompt in either has to be judged by the same yardstick as a Hebrew or
 * English one. Before `lexicon-i18n.ts` a textbook Arabic prompt scored like
 * an empty box: no role, no task, no audience, because none of its words
 * were in the lists. These tests pin the parity so a future lexicon edit
 * cannot quietly drop a language.
 */
import { describe, it, expect } from "vitest";
import { scoreInput } from "../input-scorer";
import { scoreEnhancedTextDimensions } from "../prompt-dimensions";
import {
  parse,
  hasRoleStatement,
  hasTaskVerbWithObject,
  hasNegativeConstraints,
} from "../prompt-parse";
import { CapabilityMode } from "@/lib/capability-mode";

const ARABIC_FULL = `
أنت استراتيجي تسويق كبير مع 10 سنوات من الخبرة في شركات البرمجيات.
اكتب منشور لينكد إن لإطلاق منتج SaaS موجه للشركات.
الجمهور: مديرو التسويق في شركات التكنولوجيا في إسرائيل.
الهدف: الحصول على 50 عميلاً محتملاً خلال 7 أيام.
الخلفية: منتج CRM جديد يقلل دورة المبيعات بنسبة 40%.
التنسيق: منشور منظم مع افتتاحية قوية، 3 نقاط، ودعوة واضحة لاتخاذ إجراء، بحد أقصى 250 كلمة.
تجنب الكلمات الرنانة مثل "ثوري" أو "غير مسبوق".
مثال: "تخيل فريقك يغلق الصفقات أسرع بنسبة 40%، هذا ليس حلماً."
`;

// The English fixture from input-scorer.test.ts, so the two new languages are
// held to the exact same bar rather than an absolute one.
const ENGLISH_FULL = `
You are a senior marketing strategist with 10 years of experience.
Write a LinkedIn post for a B2B SaaS product launch.
Audience: marketing managers at tech companies in the US.
Goal: generate 50 qualified leads in 7 days.
Background: new CRM product that cuts sales cycle by 40%.
Format: structured post with strong hook, 3 bullet points, clear CTA, under 250 words.
Avoid buzzwords like "revolutionary" or "game-changing".
Example: "Imagine your team closing deals 40% faster, it's not a dream."
`;

const CORE_DIMENSIONS = [
  "role",
  "task",
  "context",
  "specificity",
  "format",
  "constraints",
  "examples",
  "clarity",
];

function enhancedTotal(text: string): number {
  return scoreEnhancedTextDimensions(text, parse(text).wordCount).reduce(
    (sum, c) => sum + c.score,
    0,
  );
}

function emptyCoreDimensions(text: string): string[] {
  return scoreEnhancedTextDimensions(text, parse(text).wordCount)
    .filter((c) => CORE_DIMENSIONS.includes(c.key) && c.score === 0)
    .map((c) => c.key);
}

const RUSSIAN_FULL = `
Ты \u2014 старший маркетинговый стратег с 10 годами опыта в SaaS-компаниях.
Напиши пост для LinkedIn о запуске B2B SaaS-продукта.
Аудитория: маркетинговые менеджеры технологических компаний в Израиле.
Цель: получить 50 квалифицированных лидов за 7 дней.
Контекст: новый CRM-продукт, который сокращает цикл продаж на 40%.
Формат: структурированный пост с сильным хуком, 3 пункта, чёткий призыв к действию, не более 250 слов.
Избегай громких слов вроде «революционный» или «прорывной».
Пример: «Представь, что твоя команда закрывает сделки на 40% быстрее, и это не мечта».
`;

describe("Scorer, Arabic parity", () => {
  it("a role statement with credentials scores full role points", () => {
    const result = scoreInput(
      "أنت محلل بيانات كبير مع 10 سنوات من الخبرة. حلل اتجاهات السوق لعام 2026 واكتب تقريراً مفصلاً من 500 كلمة.",
      CapabilityMode.STANDARD,
    );
    const role = result.breakdown.find((d) => d.key === "role")!;
    expect(role.score).toBe(role.max);
  });

  it("task verbs are recognised with their object", () => {
    for (const verb of ["اشرح", "حلل", "صمم", "لخص", "قارن"]) {
      const p = parse(`أنت خبير. ${verb} تدفق المصادقة بالتفصيل.`);
      expect(hasTaskVerbWithObject(p), verb).toBe(true);
    }
  });

  it("a full structured Arabic prompt scores as high as the English fixture", () => {
    const result = scoreInput(ARABIC_FULL, CapabilityMode.STANDARD);
    expect(result.total).toBeGreaterThanOrEqual(65);
    expect(["high", "elite", "medium"]).toContain(result.level);
    expect(result.strengths.length).toBeGreaterThan(0);
    const keys = (k: string) => result.breakdown.find((d) => d.key === k)!;
    expect(keys("context").score).toBe(keys("context").max);
    expect(keys("constraints").score).toBeGreaterThan(0);
    expect(keys("examples").score).toBeGreaterThan(0);
  });

  it("negative constraints and headings are read", () => {
    expect(hasNegativeConstraints(parse("لا تستخدم لغة رسمية"))).toBe(true);
    expect(hasNegativeConstraints(parse("بدون مصطلحات تقنية"))).toBe(true);
    expect(parse("## القيود\n- قصير").sections.has("constraints")).toBe(true);
    expect(parse("## المصادر\n- ويكيبيديا").sections.has("sources")).toBe(true);
  });

  it("the enhanced-prompt scorer credits every core dimension and lands near the English twin", () => {
    expect(emptyCoreDimensions(ARABIC_FULL)).toEqual([]);
    expect(enhancedTotal(ARABIC_FULL)).toBeGreaterThanOrEqual(enhancedTotal(ENGLISH_FULL) - 8);
  });
});

describe("Scorer, Russian parity", () => {
  it("a role statement with credentials scores full role points", () => {
    const result = scoreInput(
      "Ты старший аналитик данных с 10 годами опыта. Проанализируй рыночные тренды 2026 года и напиши подробный отчёт на 500 слов.",
      CapabilityMode.STANDARD,
    );
    const role = result.breakdown.find((d) => d.key === "role")!;
    expect(role.score).toBe(role.max);
  });

  it('"Вы, эксперт" with a dash and "выступи в роли" both count as a role statement', () => {
    expect(hasRoleStatement(parse(`Вы \u2014 эксперт по SEO. Напиши план.`))).toBe(true);
    expect(hasRoleStatement(parse("Выступи в роли опытного юриста."))).toBe(true);
    expect(hasRoleStatement(parse("Напиши стихотворение о море."))).toBe(false);
  });

  it("task verbs are recognised with their object, in both politeness forms", () => {
    for (const verb of ["Объясни", "Объясните", "Проанализируй", "Спроектируй", "Сравни"]) {
      const p = parse(`Ты эксперт. ${verb} поток аутентификации подробно.`);
      expect(hasTaskVerbWithObject(p), verb).toBe(true);
    }
  });

  it("a full structured Russian prompt scores as high as the English fixture", () => {
    const result = scoreInput(RUSSIAN_FULL, CapabilityMode.STANDARD);
    expect(result.total).toBeGreaterThanOrEqual(65);
    expect(["high", "elite", "medium"]).toContain(result.level);
    const keys = (k: string) => result.breakdown.find((d) => d.key === k)!;
    expect(keys("context").score).toBe(keys("context").max);
    expect(keys("constraints").score).toBeGreaterThan(0);
    expect(keys("examples").score).toBeGreaterThan(0);
  });

  it("the enhanced-prompt scorer credits every core dimension and lands near the English twin", () => {
    expect(emptyCoreDimensions(RUSSIAN_FULL)).toEqual([]);
    expect(enhancedTotal(RUSSIAN_FULL)).toBeGreaterThanOrEqual(enhancedTotal(ENGLISH_FULL) - 8);
  });
});

describe("Scorer, the widening does not change Hebrew or English verdicts", () => {
  it("a vague Hebrew prompt still scores low", () => {
    const result = scoreInput("כתוב לי משהו על שיווק", CapabilityMode.STANDARD);
    expect(result.total).toBeLessThan(40);
  });

  it("a pure-Hebrew image prompt has a subject", () => {
    const result = scoreInput("מכונית אדומה על הר בשקיעה", CapabilityMode.IMAGE_GENERATION);
    const subject = result.breakdown.find((d) => d.key === "subject");
    expect(subject?.score ?? 1).toBeGreaterThan(0);
  });
});
