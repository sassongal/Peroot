import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { google } from "@/lib/ai/models";
import { generateObject } from "ai";
import { logger } from "@/lib/logger";

/**
 * Structured-output schema for the style persona. generateObject uses the
 * provider's native JSON mode, which eliminates the whole class of failures
 * free-text parsing hit in production (``` fences, then unescaped Hebrew
 * quotes inside string values breaking JSON.parse).
 */
const StylePersonaSchema = z.object({
  tokens: z.array(z.string()).max(30).default([]),
  preferred_format: z.string().max(500).default(""),
  personality_brief: z.string().max(1000).default(""),
});

/**
 * Analyzes a user's prompt library and synthesizes a persistent style personality.
 * Stores the result in user_style_personality table.
 *
 * Runs ONLY from the background-jobs worker (cron context — no cookies), so it
 * uses the service client: the SSR cookie client here silently returns an empty
 * library under RLS, which is exactly the bug that kept this table at 0 rows
 * while 26 style_analysis jobs "completed".
 *
 * Returns null only when there is genuinely not enough data. AI/persist
 * failures THROW so the worker marks the job for retry instead of completing.
 */
export async function analyzeUserStyle(userId: string) {
  const supabase = createServiceClient();

  // 1. Fetch the user's library (top 15 items)
  const { data: library, error: libError } = await supabase
    .from("personal_library")
    .select("title, prompt, use_case, personal_category")
    .eq("user_id", userId)
    .order("use_count", { ascending: false })
    .limit(15);

  if (libError) throw new Error(`[analyzeUserStyle] library fetch failed: ${libError.message}`);
  if (!library || library.length < 3) return null; // Not enough data to build a persona

  // 2. Synthesize using AI (each prompt capped — style shows in the first
  //    lines; full bodies just burn tokens)
  const libraryText = library
    .map((p) => `[${p.title}]\n${(p.prompt ?? "").slice(0, 800)}`)
    .join("\n\n---\n\n");

  const analyzerPrompt = `
    Analyze the following prompt engineering styles for this user.
    Identify recurring patterns in:
    - Tone (e.g. professional, direct, creative, technical)
    - Structure (e.g. bullet points, complex scenarios, short instructions)
    - Language habits (e.g. specific Hebrew terminology, formatting preferences)
    - Precision level (detailed vs concise)

    Return: tokens (recurring words/phrases), preferred_format (description of
    structure), personality_brief (a professional brief of this user's writing
    identity, in Hebrew).

    Prompts to analyze:
    ---
    ${libraryText}
    ---
    `.trim();

  const { object: result } = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    schema: StylePersonaSchema,
    system: "You are a behavioral linguistics expert specializing in AI Prompt Engineering.",
    prompt: analyzerPrompt,
  });

  // 3. Persist to DB
  const { error } = await supabase.from("user_style_personality").upsert(
    {
      user_id: userId,
      style_tokens: result.tokens || [],
      preferred_format: result.preferred_format,
      personality_brief: result.personality_brief,
      last_analyzed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    logger.error("[analyzeUserStyle] persist failed:", error);
    throw new Error(`[analyzeUserStyle] persist failed: ${error.message}`);
  }
  return result;
}
