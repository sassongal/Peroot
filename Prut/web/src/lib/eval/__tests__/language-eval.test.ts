/**
 * The language evaluation set (spec B6): the fixtures are native, the
 * deterministic measurements are right, and the per-language summary is
 * what the admin tab renders. No network here: the runner is exercised
 * with a stubbed engine chain in the route tests of the cron.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/ai/gateway", () => ({ AIGateway: { generateFull: vi.fn() } }));
vi.mock("@/lib/engines", () => ({ getEngine: vi.fn() }));
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/ai/models", () => ({ google: () => ({}) }));

const { EVAL_CASES, EVAL_LANGUAGES, measureOutput, summarizeRun } = await import(
  "../language-eval"
);

const SCRIPT: Record<string, RegExp> = {
  hebrew: /[֐-׿]/,
  english: /[A-Za-z]/,
  arabic: /[؀-ۿ]/,
  russian: /[Ѐ-ӿ]/,
};

describe("EVAL_CASES", () => {
  it("covers six tasks in all four languages", () => {
    expect(EVAL_CASES).toHaveLength(24);
    for (const language of EVAL_LANGUAGES) {
      expect(EVAL_CASES.filter((c) => c.language === language)).toHaveLength(6);
    }
  });

  it("every input is written in its own language and carries no dashes", () => {
    for (const c of EVAL_CASES) {
      expect(c.input, `${c.key}/${c.language}`).toMatch(SCRIPT[c.language]);
      if (c.language !== "hebrew") expect(c.input).not.toMatch(SCRIPT.hebrew);
      expect(c.input).not.toMatch(/[–—]/);
    }
  });
});

describe("measureOutput", () => {
  it("reads the script share, the dashes and the scorer off a finished prompt", () => {
    const m = measureOutput(
      "## Роль\nВы старший маркетолог с 10-летним опытом.\n## Задача\nНапишите пост, 150-200 слов, для владельцев малого бизнеса. Избегайте жаргона.\n[PROMPT_TITLE]Пост[/PROMPT_TITLE]",
      "russian",
    );
    expect(m.script_share).toBeGreaterThan(0.9);
    expect(m.dashes).toBe(0);
    expect(m.scorer_total).toBeGreaterThan(20);
    expect(m.text).not.toContain("PROMPT_TITLE");
  });
});

describe("summarizeRun", () => {
  it("averages per language and counts language failures", () => {
    const rows = [
      { language: "hebrew" as const, language_ok: true, fluency: 5, intent: 4, structure: 5, scorer_total: 80, dashes: 0 },
      { language: "hebrew" as const, language_ok: true, fluency: 4, intent: 4, structure: 4, scorer_total: 70, dashes: 1 },
      { language: "arabic" as const, language_ok: false, fluency: 3, intent: 4, structure: 4, scorer_total: 60, dashes: 0 },
    ];
    const s = summarizeRun(rows);
    const he = s.find((x) => x.language === "hebrew")!;
    const ar = s.find((x) => x.language === "arabic")!;
    const ru = s.find((x) => x.language === "russian")!;
    expect(he).toMatchObject({ cases: 2, language_ok_pct: 100, fluency: 4.5, scorer_total: 75, dashes: 1 });
    expect(ar).toMatchObject({ cases: 1, language_ok_pct: 0, fluency: 3 });
    expect(ru).toMatchObject({ cases: 0, language_ok_pct: 0 });
  });
});
