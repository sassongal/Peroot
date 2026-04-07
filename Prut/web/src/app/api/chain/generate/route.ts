import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AIGateway } from "@/lib/ai/gateway";
import { ConcurrencyError } from "@/lib/ai/concurrency";
import { checkAndDecrementCredits, refundCredit } from "@/lib/services/credit-service";
import { logger } from "@/lib/logger";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import type { GeneratedChain, GeneratedChainStep } from "@/lib/chain-types";

const CHAIN_CREDIT_COST = 2;

export const maxDuration = 30;

const RequestSchema = z.object({
  goal: z.string().min(3).max(2000),
  max_steps: z.number().int().min(2).max(6).default(4),
  user_context: z.object({
    role: z.string().optional(),
    recent_categories: z.array(z.string()).optional(),
  }).optional(),
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
            .map(v => ({
              name: String(v.name || ""),
              label: String(v.label || v.name || ""),
              default: String(v.default || ""),
            }))
        : [],
      input_from_step: typeof s.input_from_step === "number" ? s.input_from_step : null,
      output_description: typeof s.output_description === "string" ? s.output_description : "",
    }))
    .filter(s => s.prompt.length > 0); // Drop empty-prompt steps
}

export async function POST(req: Request) {
  let userId: string | undefined;

  try {
    const json = await req.json();
    const { goal, max_steps, user_context } = RequestSchema.parse(json);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
    const isGuest = !userId;

    let tier: "free" | "pro" | "guest" = "guest";

    if (isGuest) {
      return NextResponse.json(
        { error: "יש להתחבר כדי לבנות שרשרת פרומפטים." },
        { status: 401 }
      );
    } else {
      // Authenticated users: deduct 2 credits
      const { data: profile } = await supabase.from("profiles").select("plan_tier").eq("id", userId).maybeSingle();
      tier = (profile?.plan_tier as "free" | "pro") || "free";

      const creditResult = await checkAndDecrementCredits(userId!, tier, supabase, CHAIN_CREDIT_COST);
      if (!creditResult.allowed) {
        return NextResponse.json(
          { error: `אין מספיק קרדיטים. בניית שרשרת עולה ${CHAIN_CREDIT_COST} קרדיטים.`, remaining: creditResult.remaining },
          { status: 403 }
        );
      }
    }

    // Build concise user prompt (minimize tokens)
    let userPrompt = `מטרה: "${goal}"\nמקסימום שלבים: ${max_steps}`;
    if (user_context?.role) userPrompt += `\nתפקיד: ${user_context.role}`;
    if (user_context?.recent_categories?.length) {
      userPrompt += `\nקטגוריות: ${user_context.recent_categories.join(", ")}`;
    }

    // Use generateFull (non-streaming) — more efficient for JSON output.
    // Do not pass temperature here: pickDefaults('chain') in gateway.ts
    // returns 0.4 by design, which is the same value we used to hardcode.
    // Letting the gateway own it means a future tweak to the chain preset
    // automatically propagates without callers drifting out of sync.
    const chainStartTime = Date.now();
    const { text: fullText, modelId, usage: chainUsage } = await AIGateway.generateFull({
      system: CHAIN_BUILDER_SYSTEM_PROMPT,
      prompt: userPrompt,
      task: "chain",    // Uses flash-first routing for cost efficiency
      userTier: tier,
    });

    logger.info(`[chain/generate] Model: ${modelId}, response length: ${fullText.length}`);

    // Track usage for the cost dashboard. Fire-and-forget.
    const chainUsageTyped = chainUsage as
        | { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number }
        | undefined;
    trackApiUsage({
      userId,
      modelId,
      inputTokens: chainUsageTyped?.inputTokens ?? chainUsageTyped?.promptTokens ?? 0,
      outputTokens: chainUsageTyped?.outputTokens ?? chainUsageTyped?.completionTokens ?? 0,
      durationMs: Date.now() - chainStartTime,
      endpoint: "chain",
    });

    // Parse JSON — refund credits on failure
    const cleaned = extractJSON(fullText);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error("[chain/generate] JSON parse failed:", cleaned.slice(0, 300));
      if (userId) await refundCredit(userId, CHAIN_CREDIT_COST);
      return NextResponse.json({ error: "AI returned invalid format. Please try again." }, { status: 500 });
    }

    // Validate structure — refund on incomplete
    if (typeof parsed.title !== "string" || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      logger.error("[chain/generate] Incomplete chain:", JSON.stringify(parsed).slice(0, 300));
      if (userId) await refundCredit(userId, CHAIN_CREDIT_COST);
      return NextResponse.json({ error: "Generated chain is incomplete. Please try again." }, { status: 500 });
    }

    const steps = normalizeSteps(parsed.steps);
    if (steps.length < 2) {
      if (userId) await refundCredit(userId, CHAIN_CREDIT_COST);
      return NextResponse.json({ error: "Chain must have at least 2 valid steps." }, { status: 500 });
    }

    const chain: GeneratedChain = {
      chain_id: `ch_${crypto.randomUUID().slice(0, 12)}`,
      title: parsed.title,
      description: typeof parsed.description === "string" ? parsed.description : "",
      steps,
    };

    return NextResponse.json(chain);

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Validation error — no credits were charged yet
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    // AI or concurrency error after credits were charged — refund
    if (userId) await refundCredit(userId, CHAIN_CREDIT_COST);
    if (error instanceof ConcurrencyError) {
      return NextResponse.json({ error: "Server is busy. Please try again in a moment." }, { status: 503 });
    }
    logger.error("[chain/generate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
