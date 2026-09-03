import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@/lib/ai/models";
import { AIGateway } from "@/lib/ai/gateway";
import { getEngine } from "@/lib/engines";
import { CapabilityMode } from "@/lib/capability-mode";
import { stripTrailerForDisplay } from "@/lib/prompt-stream/trailer";
import { scoreEnhancedTextDimensions } from "@/lib/engines/scoring/prompt-dimensions";
import { parse } from "@/lib/engines/scoring/prompt-parse";
import { scriptMatchShare, type OutputLanguage } from "@/lib/output-language";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * Language evaluation set (languages spec B6).
 *
 * The same six tasks, written natively in each of the four output languages,
 * run through the real standard engine and the real model chain, then judged
 * three ways: deterministically (script share, dashes, the product's own
 * scorer) and by an AI judge (fluency, faithfulness to intent, structure).
 * Results land in `language_eval_runs`; the admin "שפות" tab shows the
 * trend. Acceptance (spec B6): judge scores for Arabic and Russian within
 * 0.5 of Hebrew, scorer within 5.
 *
 * Runs bypass credits, history and caching on purpose: this is a lab
 * measurement, not usage.
 */

export const EVAL_LANGUAGES: OutputLanguage[] = ["hebrew", "english", "arabic", "russian"];

export interface EvalCase {
  key: string;
  language: OutputLanguage;
  /** The raw user input, as a real user would type it in that language. */
  input: string;
  /** What the enhanced prompt must be about, for the judge. */
  intent: string;
}

const TASKS: Array<{ key: string; intent: string; inputs: Record<OutputLanguage, string> }> = [
  {
    key: "linkedin-launch",
    intent: "A LinkedIn post announcing a new product for small businesses",
    inputs: {
      hebrew: "תכתוב פוסט לינקדאין על המוצר החדש שלנו לעסקים קטנים",
      english: "write a linkedin post about our new product for small businesses",
      arabic: "اكتب منشور لينكد إن عن منتجنا الجديد للشركات الصغيرة",
      russian: "напиши пост для linkedin о нашем новом продукте для малого бизнеса",
    },
  },
  {
    key: "apology-email",
    intent: "An apology email to a customer about a delayed delivery",
    inputs: {
      hebrew: "מייל ללקוח שמתנצל על עיכוב במשלוח",
      english: "email to a customer apologizing for a late delivery",
      arabic: "رسالة اعتذار لعميل بسبب تأخر التوصيل",
      russian: "письмо клиенту с извинениями за задержку доставки",
    },
  },
  {
    key: "lesson-plan",
    intent: "A lesson plan about fractions for fourth graders",
    inputs: {
      hebrew: "מערך שיעור על שברים לכיתה ד",
      english: "lesson plan on fractions for 4th grade",
      arabic: "خطة درس عن الكسور للصف الرابع",
      russian: "план урока по дробям для четвёртого класса",
    },
  },
  {
    key: "sql-review",
    intent: "A code review checklist for SQL queries in a small team",
    inputs: {
      hebrew: "צ'קליסט לסקירת קוד של שאילתות SQL בצוות קטן",
      english: "code review checklist for SQL queries in a small team",
      arabic: "قائمة تحقق لمراجعة كود استعلامات SQL في فريق صغير",
      russian: "чек-лист код-ревью для SQL-запросов в небольшой команде",
    },
  },
  {
    key: "market-summary",
    intent: "A one page summary of the electric bicycle market in Israel for an investor",
    inputs: {
      hebrew: "סיכום של עמוד על שוק האופניים החשמליים בישראל למשקיע",
      english: "one page summary of the e-bike market in israel for an investor",
      arabic: "ملخص من صفحة واحدة عن سوق الدراجات الكهربائية في إسرائيل لمستثمر",
      russian: "резюме на одну страницу о рынке электровелосипедов в израиле для инвестора",
    },
  },
  {
    key: "recipe-instagram",
    intent: "An Instagram caption for a quick vegan dinner recipe",
    inputs: {
      hebrew: "כיתוב לאינסטגרם למתכון ארוחת ערב טבעונית מהירה",
      english: "instagram caption for a quick vegan dinner recipe",
      arabic: "تعليق إنستغرام لوصفة عشاء نباتي سريع",
      russian: "подпись для инстаграма к рецепту быстрого веганского ужина",
    },
  },
];

export const EVAL_CASES: EvalCase[] = TASKS.flatMap((t) =>
  EVAL_LANGUAGES.map((language) => ({
    key: t.key,
    language,
    input: t.inputs[language],
    intent: t.intent,
  })),
);

const LANGUAGE_NAME: Record<OutputLanguage, string> = {
  hebrew: "Hebrew",
  english: "English",
  arabic: "Arabic",
  russian: "Russian",
};

const JudgeSchema = z.object({
  language_ok: z.boolean().describe("Entire prompt is in the requested language"),
  fluency: z.number().int().min(1).max(5).describe("Native, natural phrasing"),
  intent: z.number().int().min(1).max(5).describe("Faithful to the user's task"),
  structure: z.number().int().min(1).max(5).describe("Clear sections and constraints"),
  notes: z.string().max(300).default(""),
});

export type JudgeVerdict = z.infer<typeof JudgeSchema>;

export interface EvalResult {
  case_key: string;
  language: OutputLanguage;
  engine_mode: string;
  model_id: string;
  language_ok: boolean;
  fluency: number;
  intent: number;
  structure: number;
  script_share: number;
  dashes: number;
  scorer_total: number;
  output_sample: string;
  judge_notes: string;
  duration_ms: number;
}

type Judge = (args: {
  language: OutputLanguage;
  intent: string;
  output: string;
}) => Promise<JudgeVerdict>;

async function defaultJudge({
  language,
  intent,
  output,
}: {
  language: OutputLanguage;
  intent: string;
  output: string;
}): Promise<JudgeVerdict> {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    schema: JudgeSchema,
    system:
      "You are a strict bilingual editor grading AI prompts. Judge only what is on the page. Reply in English.",
    prompt: `The user asked for: ${intent}.
The prompt below must be written entirely in ${LANGUAGE_NAME[language]} for an AI model.

Grade it:
- language_ok: true only if every heading, sentence and example is in ${LANGUAGE_NAME[language]} (product names may stay Latin).
- fluency 1-5: 5 reads like a native professional wrote it; 1 is machine-translated or broken.
- intent 1-5: 5 delivers exactly the user's task with sensible added specifics; 1 drifts to something else.
- structure 1-5: 5 has a role, task, audience, format and constraints, each concrete; 1 is a single vague paragraph.
- notes: one sentence, the biggest flaw.

PROMPT:
"""
${output.slice(0, 6000)}
"""`,
  });
  return object;
}

/** Deterministic part of the verdict, shared by the cron and the tests. */
export function measureOutput(output: string, language: OutputLanguage) {
  const text = stripTrailerForDisplay(output);
  const chunks = scoreEnhancedTextDimensions(text, parse(text).wordCount);
  const total = chunks.reduce((s, c) => s + c.score, 0);
  const max = chunks.reduce((s, c) => s + c.maxPoints, 0);
  return {
    text,
    script_share: Math.round(scriptMatchShare(text, language) * 100) / 100,
    dashes: (text.match(/[–—]/g) ?? []).length,
    scorer_total: max > 0 ? Math.round((total / max) * 100) : 0,
  };
}

export async function runEvalCase(c: EvalCase, judge: Judge = defaultJudge): Promise<EvalResult> {
  const started = Date.now();
  const engine = await getEngine(CapabilityMode.STANDARD, c.language);
  const out = engine.generate({
    prompt: c.input,
    tone: "Professional",
    category: "כללי",
    mode: CapabilityMode.STANDARD,
    outputLanguage: c.language,
  });
  const { text: raw, modelId } = await AIGateway.generateFull({
    system: out.systemPrompt,
    prompt: out.userPrompt,
    task: "enhance",
    outputLanguage: c.language,
  });
  const m = measureOutput(raw, c.language);
  const verdict = await judge({ language: c.language, intent: c.intent, output: m.text });
  return {
    case_key: c.key,
    language: c.language,
    engine_mode: CapabilityMode.STANDARD,
    model_id: modelId,
    language_ok: verdict.language_ok,
    fluency: verdict.fluency,
    intent: verdict.intent,
    structure: verdict.structure,
    script_share: m.script_share,
    dashes: m.dashes,
    scorer_total: m.scorer_total,
    output_sample: m.text.slice(0, 1200),
    judge_notes: verdict.notes,
    duration_ms: Date.now() - started,
  };
}

/**
 * Run the whole set with bounded concurrency and persist one row per case.
 * A failed case is logged and skipped so one flaky model call does not
 * lose the run.
 */
export async function runLanguageEval(
  opts: {
    runId?: string;
    cases?: EvalCase[];
    concurrency?: number;
    judge?: Judge;
    persist?: boolean;
  } = {},
): Promise<{ runId: string; results: EvalResult[]; failed: string[] }> {
  const runId = opts.runId ?? crypto.randomUUID();
  const cases = opts.cases ?? EVAL_CASES;
  const concurrency = opts.concurrency ?? 4;
  const results: EvalResult[] = [];
  const failed: string[] = [];
  let next = 0;

  async function worker() {
    while (next < cases.length) {
      const c = cases[next++];
      try {
        results.push(await runEvalCase(c, opts.judge));
      } catch (err) {
        failed.push(`${c.key}/${c.language}`);
        logger.error("[language-eval] case failed", { key: c.key, language: c.language, err });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));

  if (opts.persist !== false && results.length > 0) {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("language_eval_runs")
      .insert(results.map((r) => ({ run_id: runId, ...r })));
    if (error) throw new Error(`[language-eval] persist failed: ${error.message}`);
  }
  return { runId, results, failed };
}

export interface LanguageSummary {
  language: OutputLanguage;
  cases: number;
  language_ok_pct: number;
  fluency: number;
  intent: number;
  structure: number;
  scorer_total: number;
  dashes: number;
}

/** Per-language averages of one run, the shape the admin tab renders. */
export function summarizeRun(
  rows: Array<
    Pick<
      EvalResult,
      "language" | "language_ok" | "fluency" | "intent" | "structure" | "scorer_total" | "dashes"
    >
  >,
): LanguageSummary[] {
  return EVAL_LANGUAGES.map((language) => {
    const own = rows.filter((r) => r.language === language);
    const avg = (pick: (r: (typeof own)[number]) => number) =>
      own.length ? Math.round((own.reduce((s, r) => s + pick(r), 0) / own.length) * 100) / 100 : 0;
    return {
      language,
      cases: own.length,
      language_ok_pct: own.length
        ? Math.round((own.filter((r) => r.language_ok).length / own.length) * 100)
        : 0,
      fluency: avg((r) => r.fluency),
      intent: avg((r) => r.intent),
      structure: avg((r) => r.structure),
      scorer_total: avg((r) => r.scorer_total),
      dashes: own.reduce((s, r) => s + r.dashes, 0),
    };
  });
}
