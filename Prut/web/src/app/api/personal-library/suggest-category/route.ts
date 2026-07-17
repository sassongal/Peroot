import { NextResponse } from "next/server";
import { AIGateway } from "@/lib/ai/gateway";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";
import { trackApiUsage } from "@/lib/admin/track-api-usage";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a Hebrew prompt categorization assistant. Given a prompt text and a list of existing categories, suggest the best category and 2-3 relevant Hebrew tags.

Rules:
- Prefer existing categories when they fit
- If no existing category fits, suggest a new short Hebrew category name
- Tags should be short Hebrew words/phrases
- Response must be valid JSON: {"category": "...", "tags": ["...", "..."], "isNew": true/false}`;

// ---------------------------------------------------------------------------
// POST /api/personal-library/suggest-category
// Auth + rate-limit (personalLibrary bucket) owned by withUser. No credits.
// ---------------------------------------------------------------------------

export const POST = withUser(
  async (req, ctx) => {
    const body = await req.json();
    const { promptText, existingCategories } = body as {
      promptText: string;
      existingCategories: string[];
    };

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "promptText is required" }, { status: 400 });
    }

    const cats = Array.isArray(existingCategories) ? existingCategories : [];

    // Truncate very long prompts to save tokens
    const truncated = promptText.slice(0, 1500);

    const suggestStart = Date.now();
    const { text, modelId, usage } = await AIGateway.generateFull({
      system: SYSTEM_PROMPT,
      prompt: `Prompt text:\n${truncated}\n\nExisting categories:\n${cats.join(", ") || "(none)"}`,
      maxOutputTokens: 200,
      task: "classify",
    });

    // Track usage for the cost dashboard. Fire-and-forget.
    const usageTyped = usage as
      | {
          inputTokens?: number;
          outputTokens?: number;
          promptTokens?: number;
          completionTokens?: number;
        }
      | undefined;
    trackApiUsage({
      userId: ctx.user!.id,
      modelId,
      inputTokens: usageTyped?.inputTokens ?? usageTyped?.promptTokens ?? 0,
      outputTokens: usageTyped?.outputTokens ?? usageTyped?.completionTokens ?? 0,
      durationMs: Date.now() - suggestStart,
      endpoint: "suggest-category",
    });

    // Parse the JSON response from the model
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[suggest-category] Failed to parse model response:", text);
      return NextResponse.json(
        { error: "שגיאה בעיבוד ההצעה", code: "parse_failed" },
        { status: 500 },
      );
    }

    let parsed: { category: string; tags: string[]; isNew: boolean };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      logger.warn("[suggest-category] Invalid JSON from model:", jsonMatch[0]);
      return NextResponse.json(
        { error: "שגיאה בעיבוד ההצעה", code: "parse_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      suggestedCategory: parsed.category,
      suggestedTags: parsed.tags || [],
      isNewCategory: parsed.isNew ?? !cats.includes(parsed.category),
    });
  },
  { rateLimit: "personalLibrary" },
);
