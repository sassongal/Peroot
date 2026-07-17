import { z } from "zod";
import { NextResponse } from "next/server";
import { AIGateway } from "@/lib/ai/gateway";
import { withUser } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import type { Question } from "@/lib/types";

export const maxDuration = 30;

const ContextBlockSchema = z.object({
  type: z.string(),
  display: z
    .object({
      title: z.string().optional(),
      rawText: z.string().optional(),
      summary: z.string().optional(),
    })
    .optional(),
});

const Schema = z.object({
  prompt: z.string().min(1).max(10000),
  enhancedPrompt: z.string().min(1).max(50000),
  category: z.string().default("כללי"),
  tone: z.string().default("Professional"),
  capability_mode: z.string().optional(),
  iteration: z.number().int().min(0).optional(),
  context: z.array(ContextBlockSchema).max(5).optional(),
  previousQuestionIds: z.array(z.number()).max(20).optional(),
});

const SYSTEM_PROMPT = `אתה מומחה בהתאמה אישית של פרומפטים. המשימה שלך: צור שאלות שיתאימו את הפרומפט המשודרג לצרכים הספציפיים של המשתמש.

הפרומפט המשודרג כבר מבניות טובות — תפקיד, משימה, פורמט, מגבלות. אל תשאל על מה שכבר קיים בו.
שאל על ה-WHO, WHERE, WHEN, FOR WHOM שיהפכו את הפרומפט לייחודי לסיטואציה הספציפית.

PERSONALIZATION QUESTION RULES:
1. ANALYZE the domain: marketing? code? content? research? education? business?
2. Ask about the USER'S SPECIFIC CONTEXT — not about the prompt's structure (already handled).
   - Marketing: target audience demographics, product name, USP, funnel stage, platform
   - Code: specific language/framework, codebase constraints, team conventions, deployment target
   - Content: publication platform, reader expertise level, brand voice examples, content length
   - Research: data sources available, audience for the research output, depth level
   - Education: learner age/level, prior knowledge assumed, learning objectives
3. DYNAMIC COUNT (2-4 questions): One clear use case → 2 questions. Broad/multi-use prompt → 3-4 questions.
4. Every question must change the LLM's output when answered — audience, tone, depth, platform, examples.
5. Include 2-3 concrete domain-relevant example answers per question.
6. Questions in Hebrew. Order by impact — most important first.

Output ONLY a JSON array with no surrounding text, no markdown fences, no explanation.
[{"id": 1, "question": "...", "description": "...", "examples": ["ex1", "ex2", "ex3"], "priority": 10, "category": "audience", "impactEstimate": "+10 נקודות", "required": true}]

FIELD DEFINITIONS:
- priority (1-10): 10 = high personalization impact, 1 = minor tweak. Order highest first.
- category: role | task | audience | format | constraints | context | platform | style | examples
- impactEstimate: Estimated improvement, e.g., "+10 נקודות"
- required: true if answering significantly personalizes the output

ALWAYS generate at least 2 questions. The prompt is structurally complete but never fully personalized.`;

function buildUserMessage(
  prompt: string,
  enhancedPrompt: string,
  category: string,
  tone: string,
  hasContext: boolean,
  previousQuestionIds: number[],
  contextSummary: string,
): string {
  const parts: string[] = [
    `קטגוריה: ${category}`,
    `טון: ${tone}`,
    `\nפרומפט מקורי:\n${prompt.slice(0, 2000)}`,
    `\nפרומפט משודרג:\n${enhancedPrompt.slice(0, 5000)}`,
  ];

  if (hasContext && contextSummary) {
    parts.push(`\nCONTEXT-AWARE QUESTION RULES (attachments exist):
- Questions should probe GAPS in the context, not repeat what's already in the files
- Ask about the user's INTENT with the uploaded material (not about the material itself)
- Never ask "what's in the file" — you already have the content
${contextSummary}`);
  }

  if (previousQuestionIds.length > 0) {
    parts.push(`\nשאלות שכבר נשאלו (IDs) — אל תחזור עליהן: ${previousQuestionIds.join(", ")}`);
  }

  parts.push("\nצור שאלות הבהרה כעת. החזר JSON array בלבד:");
  return parts.join("\n");
}

function parseQuestionsFromText(text: string): Question[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (q): q is Record<string, unknown> =>
        q !== null && typeof q === "object" && typeof q.question === "string",
    )
    .map((q) => ({
      id: typeof q.id === "number" ? q.id : 0,
      question: String(q.question),
      description: typeof q.description === "string" ? q.description : "",
      examples: Array.isArray(q.examples)
        ? q.examples.filter((e): e is string => typeof e === "string")
        : [],
      ...(typeof q.priority === "number" ? { priority: q.priority } : {}),
      ...(typeof q.category === "string" ? { category: q.category } : {}),
      ...(typeof q.impactEstimate === "string" ? { impactEstimate: q.impactEstimate } : {}),
      ...(typeof q.required === "boolean" ? { required: q.required } : {}),
    }));
}

export const POST = withUser(
  async (request, _ctx) => {
    let body: z.infer<typeof Schema>;
    try {
      const raw = await request.json();
      const result = Schema.safeParse(raw);
      if (!result.success) {
        return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
      }
      body = result.data;
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
    }

    const { prompt, enhancedPrompt, category, tone, context, previousQuestionIds = [] } = body;

    const contextSummary = context
      ? context
          .map((c) => {
            const title = c.display?.title ?? c.type;
            const text = c.display?.rawText ?? c.display?.summary ?? "";
            return text ? `[${title}] ${text.slice(0, 500)}` : null;
          })
          .filter(Boolean)
          .join("\n")
      : "";

    const userMessage = buildUserMessage(
      prompt,
      enhancedPrompt,
      category,
      tone,
      !!(context && context.length > 0),
      previousQuestionIds,
      contextSummary,
    );

    try {
      const result = await AIGateway.generateFull({
        system: SYSTEM_PROMPT,
        prompt: userMessage,
        task: "classify",
        preferredModel: "gemini-2.5-flash-lite",
        maxOutputTokens: 1024,
        temperature: 0.6,
      });

      let questions: Question[] = [];
      try {
        questions = parseQuestionsFromText(result.text);
      } catch {
        logger.warn("[enhance/questions] Failed to parse questions JSON", {
          text: result.text.slice(0, 200),
        });
      }

      return NextResponse.json({ questions });
    } catch (err) {
      logger.error("[enhance/questions] Generation failed", err);
      return NextResponse.json({ questions: [] });
    }
  },
  {
    rateLimit: "questions",
    // Background suggestions must never fail the enhance flow: on a rate-limit
    // hit, degrade to an empty question list at 200 rather than a 429.
    onRateLimit: () => NextResponse.json({ questions: [] }),
  },
);
