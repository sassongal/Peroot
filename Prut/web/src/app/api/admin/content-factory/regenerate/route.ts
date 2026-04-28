import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withAdminWrite } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { generateBlogPost, generatePromptBatch, getGenerationContext } from "@/lib/content-factory/generate";

export const maxDuration = 120;
import { generateSlugPair, ensureUniqueSlug, calculateReadTime } from "@/lib/content-factory/slug-utils";
import { findDuplicate } from "@/lib/content-factory/dedup";

const RegenerateSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["blog", "prompt"]),
});

/**
 * POST /api/admin/content-factory/regenerate
 *
 * Regenerate a content-factory draft.
 * Fetches the original item's topic/category for context,
 * deletes the old draft, then generates and inserts a fresh one.
 */
export const POST = withAdminWrite(async (req, supabase, _user) => {
  try {
    const body = await req.json();
    const parsed = RegenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, type } = parsed.data;

    if (type === "blog") {
      // 1. Fetch existing draft to extract original topic context
      const { data: existing, error: fetchError } = await supabase
        .from("blog_posts")
        .select("id, title, category, source_metadata, status")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        logger.error("[admin/content-factory/regenerate] Blog not found:", fetchError);
        return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
      }

      if (existing.status !== "draft") {
        return NextResponse.json({ error: "Only drafts can be regenerated" }, { status: 400 });
      }

      const originalTopic = (existing.source_metadata as Record<string, unknown>)?.topic as string | undefined;
      const originalTemplate = (existing.source_metadata as Record<string, unknown>)?.template as
        | "guide"
        | "listicle"
        | "comparison"
        | "faq"
        | undefined;

      // 2. Delete the old draft
      const { error: deleteError } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", id);

      if (deleteError) {
        logger.error("[admin/content-factory/regenerate] Delete error:", deleteError);
        return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
      }

      // 3. Create new generation log
      const { data: logEntry } = await supabase
        .from("content_generation_log")
        .insert({
          type: "blog",
          trigger: "manual",
          status: "generating",
          topic: originalTopic ?? null,
          template: originalTemplate ?? "guide",
        })
        .select("id")
        .single();

      const logId = logEntry?.id as string | undefined;

      // 4. Fetch context and regenerate
      const context = await getGenerationContext(supabase);

      logger.info(`[admin/content-factory/regenerate] Regenerating blog, topic: ${originalTopic ?? "auto"}`);
      const generated = await generateBlogPost({
        topic: originalTopic,
        template: originalTemplate ?? "guide",
        existingTitles: context.existingBlogTitles,
        existingCategories: context.blogCategories,
        existingPromptTitles: context.existingPromptTitles,
      });

      // 5. Dedup check
      const duplicate = await findDuplicate(supabase, generated.title, "blog_posts");
      if (duplicate) {
        logger.warn(`[admin/content-factory/regenerate] Duplicate detected: "${generated.title}"`);
        if (logId) {
          await supabase
            .from("content_generation_log")
            .update({
              status: "failed",
              error_message: `Duplicate: similar to "${duplicate.existingTitle}"`,
              completed_at: new Date().toISOString(),
            })
            .eq("id", logId);
        }
        return NextResponse.json(
          { error: "Duplicate content detected", duplicate },
          { status: 409 }
        );
      }

      // 6. Generate unique slug and read time
      const { enSlug } = generateSlugPair(generated.title, generated.englishTitle);
      const uniqueSlug = await ensureUniqueSlug(supabase, enSlug, "blog_posts");
      const readTime = calculateReadTime(generated.content);

      // 7. Insert the new draft
      const { data: newBlog, error: insertError } = await supabase
        .from("blog_posts")
        .insert({
          title: generated.title,
          slug: uniqueSlug,
          content: generated.content,
          excerpt: generated.excerpt,
          status: "draft",
          category: generated.category,
          tags: generated.tags,
          meta_title: generated.metaTitle,
          meta_description: generated.metaDescription,
          read_time: readTime,
          source_metadata: {
            generated_by: "content-factory",
            generation_id: logId ?? null,
            template: originalTemplate ?? "guide",
            topic: originalTopic ?? null,
            regenerated_from: id,
            internal_links: generated.internalLinks,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        logger.error("[admin/content-factory/regenerate] Blog insert error:", insertError);
        if (logId) {
          await supabase
            .from("content_generation_log")
            .update({
              status: "failed",
              error_message: `DB insert failed: ${insertError.message}`,
              completed_at: new Date().toISOString(),
            })
            .eq("id", logId);
        }
        return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
      }

      if (logId) {
        await supabase
          .from("content_generation_log")
          .update({
            status: "completed",
            result_ids: [newBlog.id],
            result_count: 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }

      logger.info(`[admin/content-factory/regenerate] Blog regenerated: "${generated.title}" (id: ${newBlog.id})`);
      return NextResponse.json({ blogPost: newBlog });
    }

    // type === "prompt"
    // 1. Fetch existing prompt draft
    const { data: existing, error: fetchError } = await supabase
      .from("public_library_prompts")
      .select("id, title, category_id, source_metadata, is_active")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      logger.error("[admin/content-factory/regenerate] Prompt not found:", fetchError);
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (existing.is_active !== false) {
      return NextResponse.json({ error: "Only inactive (pending) prompts can be regenerated" }, { status: 400 });
    }

    const originalTopic = (existing.source_metadata as Record<string, unknown>)?.topic as string | undefined;
    const originalCategory = (existing.source_metadata as Record<string, unknown>)?.category as string | undefined;

    // 2. Delete the old draft
    const { error: deleteError } = await supabase
      .from("public_library_prompts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("[admin/content-factory/regenerate] Prompt delete error:", deleteError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    // 3. Create generation log
    const { data: logEntry } = await supabase
      .from("content_generation_log")
      .insert({
        type: "prompt",
        trigger: "manual",
        status: "generating",
        topic: originalTopic ?? null,
      })
      .select("id")
      .single();

    const logId = logEntry?.id as string | undefined;

    // 4. Fetch context and regenerate (single prompt from batch)
    const context = await getGenerationContext(supabase);

    logger.info(`[admin/content-factory/regenerate] Regenerating prompt, topic: ${originalTopic ?? "auto"}`);
    const { prompts: generated } = await generatePromptBatch({
      topic: originalTopic,
      category: originalCategory,
      existingTitles: context.existingPromptTitles,
      existingCategories: context.existingCategories,
      count: 1,
    });

    if (!generated || generated.length === 0) {
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

    const newPromptData = generated[0];

    // 5. Dedup check
    const duplicate = await findDuplicate(supabase, newPromptData.title, "public_library_prompts");
    if (duplicate) {
      logger.warn(`[admin/content-factory/regenerate] Duplicate prompt: "${newPromptData.title}"`);
      if (logId) {
        await supabase
          .from("content_generation_log")
          .update({
            status: "failed",
            error_message: `Duplicate: similar to "${duplicate.existingTitle}"`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }
      return NextResponse.json(
        { error: "Duplicate content detected", duplicate },
        { status: 409 }
      );
    }

    // 6. Insert new prompt
    const promptId = `cf_${randomUUID()}`;
    const { data: newPrompt, error: insertError } = await supabase
      .from("public_library_prompts")
      .insert({
        id: promptId,
        title: newPromptData.title,
        prompt: newPromptData.prompt,
        use_case: newPromptData.use_case,
        variables: newPromptData.variables,
        output_format: newPromptData.output_format,
        quality_checks: newPromptData.quality_checks,
        category_id: newPromptData.category_id,
        capability_mode: newPromptData.capability_mode,
        is_active: false,
        source_metadata: {
          generated_by: "content-factory",
          generation_id: logId ?? null,
          topic: originalTopic ?? null,
          category: originalCategory ?? null,
          regenerated_from: id,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error("[admin/content-factory/regenerate] Prompt insert error:", insertError);
      if (logId) {
        await supabase
          .from("content_generation_log")
          .update({
            status: "failed",
            error_message: `DB insert failed: ${insertError.message}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    if (logId) {
      await supabase
        .from("content_generation_log")
        .update({
          status: "completed",
          result_ids: [newPrompt.id],
          result_count: 1,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    logger.info(`[admin/content-factory/regenerate] Prompt regenerated: "${newPromptData.title}" (id: ${newPrompt.id})`);
    return NextResponse.json({ prompt: newPrompt });
  } catch (err) {
    logger.error("[admin/content-factory/regenerate] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
