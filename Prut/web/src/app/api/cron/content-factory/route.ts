import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { generateBlogPost, generatePromptBatch, getGenerationContext } from "@/lib/content-factory/generate";
import { generateSlugPair, ensureUniqueSlug, calculateReadTime } from "@/lib/content-factory/slug-utils";
import { findDuplicate } from "@/lib/content-factory/dedup";

export const maxDuration = 120;

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * GET /api/cron/content-factory
 *
 * Weekly cron: generate 1 blog post draft + 5 prompt drafts.
 * All content is saved as drafts (status='draft' / is_active=false)
 * for human review before publishing.
 *
 * Auth: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runId = `cron-${Date.now()}`;
  logger.info(`[Cron/ContentFactory] Starting weekly run ${runId}`);

  const result: {
    blog: { id: string; title: string } | null;
    prompts: { count: number; titles: string[] };
    errors: string[];
  } = {
    blog: null,
    prompts: { count: 0, titles: [] },
    errors: [],
  };

  try {
    // Fetch shared generation context once for both operations
    const context = await getGenerationContext(supabase);

    // ── 1. Generate blog post ────────────────────────────────────────────────
    let blogLogId: string | null = null;

    try {
      const { data: blogLog } = await supabase
        .from("content_generation_log")
        .insert({
          type: "blog",
          trigger: "cron",
          status: "generating",
        })
        .select("id")
        .single();

      blogLogId = blogLog?.id ?? null;

      const generatedBlog = await generateBlogPost({
        existingTitles: context.existingBlogTitles,
        existingCategories: context.blogCategories,
        existingPromptTitles: context.existingPromptTitles,
      });

      const duplicate = await findDuplicate(supabase, generatedBlog.title, "blog_posts");
      if (duplicate) {
        const msg = `Blog duplicate detected: "${generatedBlog.title}" similar to "${duplicate.existingTitle}"`;
        logger.warn(`[Cron/ContentFactory] ${msg}`);
        result.errors.push(msg);

        if (blogLogId) {
          await supabase
            .from("content_generation_log")
            .update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() })
            .eq("id", blogLogId);
        }
      } else {
        const { enSlug } = generateSlugPair(generatedBlog.title, generatedBlog.englishTitle);
        const uniqueSlug = await ensureUniqueSlug(supabase, enSlug, "blog_posts");
        const readTime = calculateReadTime(generatedBlog.content);

        const { data: blogPost, error: blogInsertError } = await supabase
          .from("blog_posts")
          .insert({
            title: generatedBlog.title,
            slug: uniqueSlug,
            content: generatedBlog.content,
            excerpt: generatedBlog.excerpt,
            status: "draft",
            category: generatedBlog.category,
            tags: generatedBlog.tags,
            meta_title: generatedBlog.metaTitle,
            meta_description: generatedBlog.metaDescription,
            read_time: readTime,
            source_metadata: {
              generated_by: "content-factory",
              generation_id: blogLogId,
              source: "cron",
              run_id: runId,
              internal_links: generatedBlog.internalLinks,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id, title")
          .single();

        if (blogInsertError) {
          const msg = `Blog insert failed: ${blogInsertError.message}`;
          logger.error(`[Cron/ContentFactory] ${msg}`);
          result.errors.push(msg);

          if (blogLogId) {
            await supabase
              .from("content_generation_log")
              .update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() })
              .eq("id", blogLogId);
          }
        } else {
          result.blog = { id: blogPost.id as string, title: blogPost.title as string };

          if (blogLogId) {
            await supabase
              .from("content_generation_log")
              .update({
                status: "completed",
                result_ids: [blogPost.id],
                result_count: 1,
                completed_at: new Date().toISOString(),
              })
              .eq("id", blogLogId);
          }

          logger.info(`[Cron/ContentFactory] Blog draft created: "${generatedBlog.title}" (id: ${blogPost.id})`);
        }
      }
    } catch (blogErr) {
      const msg = blogErr instanceof Error ? blogErr.message : "Blog generation failed";
      logger.error("[Cron/ContentFactory] Blog generation error:", blogErr);
      result.errors.push(`Blog: ${msg}`);

      if (blogLogId) {
        await supabase
          .from("content_generation_log")
          .update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() })
          .eq("id", blogLogId);
      }
    }

    // ── 2. Generate prompt batch ─────────────────────────────────────────────
    let promptLogId: string | null = null;

    try {
      const { data: promptLog } = await supabase
        .from("content_generation_log")
        .insert({
          type: "prompt",
          trigger: "cron",
          status: "generating",
        })
        .select("id")
        .single();

      promptLogId = promptLog?.id ?? null;

      const { prompts: generatedPrompts, usage } = await generatePromptBatch({
        existingTitles: context.existingPromptTitles,
        existingCategories: context.existingCategories,
        count: 5,
      });

      const insertedTitles: string[] = [];

      for (const promptData of generatedPrompts) {
        const duplicate = await findDuplicate(supabase, promptData.title, "public_library_prompts");
        if (duplicate) {
          logger.warn(`[Cron/ContentFactory] Prompt duplicate skipped: "${promptData.title}"`);
          continue;
        }

        // Generate unique ID + validate category
        const promptId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const validCategoryIds = context.existingCategories.map((c: any) => c.id);
        const safeCategoryId = validCategoryIds.includes(promptData.category_id) ? promptData.category_id : "general";
        const validModes = ["STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "AGENT_BUILDER", "VIDEO_GENERATION"];
        const safeMode = validModes.includes(promptData.capability_mode) ? promptData.capability_mode : "STANDARD";

        const { data: insertedPrompt, error: promptInsertError } = await supabase
          .from("public_library_prompts")
          .insert({
            id: promptId,
            title: promptData.title,
            prompt: promptData.prompt,
            use_case: promptData.use_case || "",
            variables: Array.isArray(promptData.variables) ? promptData.variables : [],
            output_format: promptData.output_format || "",
            quality_checks: Array.isArray(promptData.quality_checks) ? promptData.quality_checks : [],
            category_id: safeCategoryId,
            capability_mode: safeMode,
            is_active: false,
            source_metadata: {
              generated_by: "content-factory",
              generation_id: promptLogId,
              source: "cron",
              run_id: runId,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id, title")
          .single();

        if (promptInsertError) {
          logger.error(`[Cron/ContentFactory] Prompt insert error for "${promptData.title}":`, promptInsertError);
          result.errors.push(`Prompt insert failed: "${promptData.title}" — ${promptInsertError.message}`);
        } else {
          insertedTitles.push(insertedPrompt.title as string);
        }
      }

      result.prompts = { count: insertedTitles.length, titles: insertedTitles };

      if (promptLogId) {
        await supabase
          .from("content_generation_log")
          .update({
            status: "completed",
            result_count: insertedTitles.length,
            cost_tokens: usage?.totalTokens ?? 0,
            completed_at: new Date().toISOString(),
          })
          .eq("id", promptLogId);
      }

      logger.info(`[Cron/ContentFactory] ${insertedTitles.length} prompt drafts created`);
    } catch (promptErr) {
      const msg = promptErr instanceof Error ? promptErr.message : "Prompt generation failed";
      logger.error("[Cron/ContentFactory] Prompt generation error:", promptErr);
      result.errors.push(`Prompts: ${msg}`);

      if (promptLogId) {
        await supabase
          .from("content_generation_log")
          .update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() })
          .eq("id", promptLogId);
      }
    }

    logger.info(`[Cron/ContentFactory] Run ${runId} complete. Blog: ${result.blog?.title ?? "none"}, Prompts: ${result.prompts.count}, Errors: ${result.errors.length}`);

    return NextResponse.json({
      runId,
      blog: result.blog,
      prompts: result.prompts,
      errors: result.errors,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[Cron/ContentFactory] Fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
