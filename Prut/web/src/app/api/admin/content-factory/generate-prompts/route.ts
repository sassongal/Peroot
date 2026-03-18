import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { generatePromptBatch, getGenerationContext } from "@/lib/content-factory/generate";
import { findDuplicate } from "@/lib/content-factory/dedup";

const GeneratePromptsSchema = z.object({
  topic: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(200).optional(),
});

/**
 * POST /api/admin/content-factory/generate-prompts
 *
 * Generate a batch of 5 prompt drafts using AI.
 * Each prompt is dedup-checked before insertion.
 * Inserts into public_library_prompts with is_active=false.
 */
export async function POST(req: NextRequest) {
  const { error, supabase, user } = await validateAdminSession();
  if (error || !supabase || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });
  }

  let logId: string | null = null;

  try {
    const body = await req.json();
    const parsed = GeneratePromptsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, category } = parsed.data;

    // 1. Create generation log entry with status='generating'
    const { data: logEntry, error: logInsertError } = await supabase
      .from("content_generation_log")
      .insert({
        type: "prompt",
        trigger: "manual",
        status: "generating",
        topic: topic ?? null,
      })
      .select("id")
      .single();

    if (logInsertError) {
      logger.error("[admin/content-factory/generate-prompts] Failed to create log entry:", logInsertError);
    } else {
      logId = logEntry.id as string;
    }

    // 2. Fetch generation context
    const context = await getGenerationContext(supabase);

    // 3. Generate prompt batch via AI
    logger.info(`[admin/content-factory/generate-prompts] Generating 5 prompts, topic: ${topic ?? "auto"}, category: ${category ?? "auto"}`);
    const { prompts: generatedPrompts, usage } = await generatePromptBatch({
      topic,
      category,
      existingTitles: context.existingPromptTitles,
      existingCategories: context.existingCategories,
      count: 5,
    });

    if (!generatedPrompts || generatedPrompts.length === 0) {
      if (logId) {
        await supabase
          .from("content_generation_log")
          .update({
            status: "failed",
            error_message: "AI returned no prompts",
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }
      return NextResponse.json({ error: "AI returned no prompts" }, { status: 500 });
    }

    // 4. Dedup-check each prompt and insert unique ones
    const inserted = [];
    const skipped = [];

    for (const prompt of generatedPrompts) {
      const duplicate = await findDuplicate(supabase, prompt.title, "public_library_prompts");

      if (duplicate) {
        logger.warn(
          `[admin/content-factory/generate-prompts] Skipping duplicate: "${prompt.title}" similar to "${duplicate.existingTitle}" (score: ${duplicate.score})`
        );
        skipped.push({ title: prompt.title, reason: `Similar to: "${duplicate.existingTitle}"` });
        continue;
      }

      const { data: insertedPrompt, error: insertError } = await supabase
        .from("public_library_prompts")
        .insert({
          title: prompt.title,
          prompt: prompt.prompt,
          use_case: prompt.use_case,
          variables: prompt.variables,
          output_format: prompt.output_format,
          quality_checks: prompt.quality_checks,
          category_id: prompt.category_id,
          capability_mode: prompt.capability_mode,
          is_active: false,
          source_metadata: {
            generated_by: "content-factory",
            generation_id: logId,
            topic: topic ?? null,
            category: category ?? null,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, title, category_id")
        .single();

      if (insertError) {
        logger.error(`[admin/content-factory/generate-prompts] Insert error for "${prompt.title}":`, insertError);
        skipped.push({ title: prompt.title, reason: `DB error: ${insertError.message}` });
        continue;
      }

      inserted.push(insertedPrompt);
    }

    // 5. Update generation log with success
    if (logId) {
      await supabase
        .from("content_generation_log")
        .update({
          status: "completed",
          result_count: inserted.length,
          result_ids: inserted.map((p: any) => p.id),
          cost_tokens: usage?.totalTokens ?? 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    logger.info(`[admin/content-factory/generate-prompts] Inserted ${inserted.length} prompts, skipped ${skipped.length}`);

    return NextResponse.json(
      {
        prompts: inserted,
        skipped,
        count: inserted.length,
        tokenUsage: usage,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[admin/content-factory/generate-prompts] Error:", err);

    if (logId && supabase) {
      await supabase
        .from("content_generation_log")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
