import { z } from "zod";
import { NextResponse } from "next/server";
import { AIGateway } from "@/lib/ai/gateway";
import { ConcurrencyError } from "@/lib/ai/concurrency";
import { withUser } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import type { GeneratedChain, GeneratedChainStep } from "@/lib/chain-types";

const CHAIN_CREDIT_COST = 2;

export const maxDuration = 120;

const RequestSchema = z.object({
  goal: z.string().min(3).max(2000),
  max_steps: z.number().int().min(2).max(6).default(4),
  user_context: z
    .object({
      role: z.string().max(200).optional(),
      recent_categories: z.array(z.string().max(100)).max(10).optional(),
    })
    .optional(),
});

// Cost-optimized system prompt: concise, structured instructions with clear JSON schema.
// Kept short to minimize input tokens while maintaining quality.
const CHAIN_BUILDER_SYSTEM_PROMPT = `בנה שרשרת פרומפטים (Prompt Chain) בעברית. כל שלב = פרומפט מקצועי מלא.

כללים:
- 3-6 שלבים. שלב 1 = מחקר/הכנה. אחרון = פלט סופי.
- כל prompt חייב לכלול: תפקיד, משימה, מבנה פלט, מגבלות (לא רק כותרת).
- variables רק בשלב 1 (שאר השלבים מקבלים מהפלט).
- כשיש input_from_step, פתח ב: "בהתבסס על הפלט הקודם:"
- פשטות — אם מספיק 3 שלבים, אל תייצר 6.

החזר JSON בלבד (ללא markdown):
{"title":"שם","description":"תיאור","steps":[{"step_number":1,"title":"שם","mode":"text|research|image|video|agent","prompt":"פרומפט מלא","variables":[{"name":"x","label":"תווית","default":"ברירת מחדל"}],"input_from_step":null,"output_description":"פלט צפוי"}]}`;

/**
 * Extract JSON from AI response, handling common formatting issues.
 */
function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  }

  // Find JSON object boundaries if there's surrounding text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 || (lastBrace >= 0 && lastBrace < cleaned.length - 1)) {
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  return cleaned;
}

/**
 * Validate and normalize steps array from AI response.
 */
function normalizeSteps(rawSteps: unknown[]): GeneratedChainStep[] {
  const validModes = new Set(["text", "research", "image", "video", "agent"]);

  return rawSteps
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s, i) => ({
      step_number: i + 1,
      title: typeof s.title === "string" ? s.title : `שלב ${i + 1}`,
      mode: (typeof s.mode === "string" && validModes.has(s.mode)
        ? s.mode
        : "text") as GeneratedChainStep["mode"],
      prompt: typeof s.prompt === "string" ? s.prompt : "",
      variables: Array.isArray(s.variables)
        ? s.variables
            .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
            .map((v) => ({
              name: String(v.name || ""),
              label: String(v.label || v.name || ""),
              default: String(v.default || ""),
            }))
        : [],
      input_from_step: typeof s.input_from_step === "number" ? s.input_from_step : null,
      output_description: typeof s.output_description === "string" ? s.output_description : "",
    }))
    .filter((s) => s.prompt.length > 0); // Drop empty-prompt steps
}

/**
 * POST /api/chain/generate — build a prompt chain from a goal.
 *
 * withUser owns auth (login required), tier resolution, the free/pro rate-limit
 * bucket, and the CHAIN_CREDIT_COST charge. Refunds are automatic: any response
 * this handler returns with status >= 400 refunds the charge (only a 2xx keeps
 * it), so there is no manual refund bookkeeping here. Admins bypass the charge
 * and the rate limit.
 */
export const POST = withUser(
  async (req, ctx) => {
    const userId = ctx.user!.id;

    // Validate input. (withUser charges before the handler runs; an invalid
    // request returns 400 here and the charge is auto-refunded — net zero.)
    let input: z.infer<typeof RequestSchema>;
    try {
      input = RequestSchema.parse(await req.json());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "בקשה לא תקינה", code: "invalid_request", details: error.issues },
          { status: 400 },
        );
      }
      logger.error("[chain/generate] Bad request body:", error);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }

    const { goal, max_steps, user_context } = input;
    const tier = await ctx.tier();

    // Build concise user prompt (minimize tokens)
    let userPrompt = `מטרה: "${goal}"\nמקסימום שלבים: ${max_steps}`;
    if (user_context?.role) userPrompt += `\nתפקיד: ${user_context.role}`;
    if (user_context?.recent_categories?.length) {
      userPrompt += `\nקטגוריות: ${user_context.recent_categories.join(", ")}`;
    }

    // Use generateFull (non-streaming) — more efficient for JSON output.
    // pickDefaults('chain') owns temperature (0.4) — do not pass it here.
    const chainStartTime = Date.now();
    let gen: Awaited<ReturnType<typeof AIGateway.generateFull>>;
    try {
      gen = await AIGateway.generateFull({
        system: CHAIN_BUILDER_SYSTEM_PROMPT,
        prompt: userPrompt,
        task: "chain", // Uses flash-first routing for cost efficiency
        userTier: tier === "admin" ? "pro" : tier,
      });
    } catch (error) {
      if (error instanceof ConcurrencyError) {
        return NextResponse.json(
          { error: "השרת עמוס. נסה שוב בעוד רגע", code: "server_busy" },
          { status: 503 },
        );
      }
      logger.error("[chain/generate] Error:", error);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }
    const { text: fullText, modelId, usage: chainUsage } = gen;

    logger.info(`[chain/generate] Model: ${modelId}, response length: ${fullText.length}`);

    // Track usage for the cost dashboard. Fire-and-forget.
    const chainUsageTyped = chainUsage as
      | {
          inputTokens?: number;
          outputTokens?: number;
          promptTokens?: number;
          completionTokens?: number;
        }
      | undefined;
    trackApiUsage({
      userId,
      modelId,
      inputTokens: chainUsageTyped?.inputTokens ?? chainUsageTyped?.promptTokens ?? 0,
      outputTokens: chainUsageTyped?.outputTokens ?? chainUsageTyped?.completionTokens ?? 0,
      durationMs: Date.now() - chainStartTime,
      endpoint: "chain",
      engineMode: "chain",
    });

    // Parse JSON — a >= 400 return auto-refunds the credit.
    const cleaned = extractJSON(fullText);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error("[chain/generate] JSON parse failed:", cleaned.slice(0, 300));
      return NextResponse.json(
        { error: "ה-AI החזיר תשובה בפורמט לא תקין. נסה שוב", code: "ai_invalid_format" },
        { status: 500 },
      );
    }

    // Validate structure
    if (
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.steps) ||
      parsed.steps.length === 0
    ) {
      logger.error("[chain/generate] Incomplete chain:", JSON.stringify(parsed).slice(0, 300));
      return NextResponse.json(
        { error: "השרשרת שנוצרה אינה שלמה. נסה שוב", code: "ai_incomplete" },
        { status: 500 },
      );
    }

    const steps = normalizeSteps(parsed.steps);
    if (steps.length < 2) {
      return NextResponse.json(
        { error: "Chain must have at least 2 valid steps." },
        { status: 500 },
      );
    }

    const chain: GeneratedChain = {
      chain_id: `ch_${crypto.randomUUID().slice(0, 12)}`,
      title: parsed.title,
      description: typeof parsed.description === "string" ? parsed.description : "",
      steps,
    };

    return NextResponse.json(chain);
  },
  {
    // Login required (no guests); free tier uses the "free" bucket, everyone
    // else "pro". Admins bypass both the bucket and the credit charge.
    rateLimit: (tier) => (tier === "free" ? "free" : "pro"),
    credits: CHAIN_CREDIT_COST,
  },
);
