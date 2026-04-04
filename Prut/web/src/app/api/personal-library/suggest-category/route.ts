import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

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
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    const {
      data: { user },
    } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const rateLimit = await checkRateLimit(user.id, 'personalLibrary');
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { promptText, existingCategories } = body as {
      promptText: string;
      existingCategories: string[];
    };

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json(
        { error: "promptText is required" },
        { status: 400 }
      );
    }

    const cats = Array.isArray(existingCategories) ? existingCategories : [];

    // Truncate very long prompts to save tokens
    const truncated = promptText.slice(0, 1500);

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      prompt: `Prompt text:\n${truncated}\n\nExisting categories:\n${cats.join(", ") || "(none)"}`,
      maxOutputTokens: 200,
    });

    // Parse the JSON response from the model
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[suggest-category] Failed to parse model response:", text);
      return NextResponse.json(
        { error: "Failed to parse suggestion" },
        { status: 500 }
      );
    }

    let parsed: { category: string; tags: string[]; isNew: boolean };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      logger.warn("[suggest-category] Invalid JSON from model:", jsonMatch[0]);
      return NextResponse.json(
        { error: "Failed to parse suggestion" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestedCategory: parsed.category,
      suggestedTags: parsed.tags || [],
      isNewCategory: parsed.isNew ?? !cats.includes(parsed.category),
    });
  } catch (error) {
    logger.error("[suggest-category] Error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
