import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { generateBlogPost, getGenerationContext } from "@/lib/content-factory/generate";
import { generateSlugPair, ensureUniqueSlug, calculateReadTime } from "@/lib/content-factory/slug-utils";
import { findDuplicate } from "@/lib/content-factory/dedup";
import { checkHebrewQuality } from "@/lib/content-factory/qa";

// AI generation can take 30-60s for a full blog post
export const maxDuration = 120;

const GenerateBlogSchema = z.object({
  topic: z.string().max(500).optional().transform(v => v?.trim() || undefined),
  template: z.enum(["guide", "listicle", "comparison", "faq"]).optional(),
});

/**
 * POST /api/admin/content-factory/generate-blog
 *
 * Generate a single blog post draft using AI.
 * Logs the generation attempt in content_generation_log.
 * Performs dedup check before inserting into blog_posts.
 */
export async function POST(req: NextRequest) {
  const { error, supabase, user } = await validateAdminSession();
  if (error || !supabase || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });
  }

  let logId: string | null = null;

  try {
    const body = await req.json();
    const parsed = GenerateBlogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { topic, template = "guide" } = parsed.data;

    // 1. Create generation log entry with status='generating'
    const { data: logEntry, error: logInsertError } = await supabase
      .from("content_generation_log")
      .insert({
        type: "blog",
        trigger: "manual",
        status: "generating",
        topic: topic ?? null,
        template,
      })
      .select("id")
      .single();

    if (logInsertError) {
      logger.error("[admin/content-factory/generate-blog] Failed to create log entry:", logInsertError);
    } else {
      logId = logEntry.id as string;
    }

    // 2. Fetch generation context (existing titles, slugs, categories)
    const context = await getGenerationContext(supabase);

    // 3. Generate the blog post via AI
    logger.info(`[admin/content-factory/generate-blog] Generating blog post, topic: ${topic ?? "auto"}, template: ${template}`);
    const generated = await generateBlogPost({
      topic,
      template,
      existingTitles: context.existingBlogTitles,
      existingCategories: context.blogCategories,
      existingPromptTitles: context.existingPromptTitles,
    });

    // 4. Check for duplicates
    const duplicate = await findDuplicate(supabase, generated.title, "blog_posts");
    if (duplicate) {
      logger.warn(
        `[admin/content-factory/generate-blog] Duplicate detected: "${generated.title}" similar to "${duplicate.existingTitle}" (score: ${duplicate.score})`
      );

      if (logId) {
        await supabase
          .from("content_generation_log")
          .update({
            status: "failed",
            error_message: `Duplicate title detected: too similar to "${duplicate.existingTitle}" (similarity: ${(duplicate.score * 100).toFixed(0)}%)`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }

      return NextResponse.json(
        {
          error: "Duplicate content detected",
          duplicate: {
            existingTitle: duplicate.existingTitle,
            score: duplicate.score,
          },
        },
        { status: 409 }
      );
    }

    // 5. Generate unique slugs
    const { enSlug } = generateSlugPair(generated.title, generated.englishTitle);
    const uniqueSlug = await ensureUniqueSlug(supabase, enSlug, "blog_posts");

    // 6. Calculate read time
    const readTime = calculateReadTime(generated.content);

    // 6b. Run Hebrew quality check
    const qa = checkHebrewQuality(generated.content);
    if (qa.issues.length > 0) {
      logger.info(`[admin/content-factory/generate-blog] QA score: ${qa.score}, issues: ${qa.issues.join("; ")}`);
    }

    // 7. Insert into blog_posts as draft
    const { data: blogPost, error: insertError } = await supabase
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
          generation_id: logId,
          template,
          topic: topic ?? null,
          internal_links: generated.internalLinks,
          qa_score: qa.score,
          qa_issues: qa.issues,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error("[admin/content-factory/generate-blog] Insert error:", insertError);

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

    // 8. Update generation log with success
    if (logId) {
      await supabase
        .from("content_generation_log")
        .update({
          status: "completed",
          result_ids: [blogPost.id],
          result_count: 1,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    logger.info(`[admin/content-factory/generate-blog] Blog post created: "${generated.title}" (id: ${blogPost.id})`);

    return NextResponse.json({ blogPost }, { status: 201 });
  } catch (err) {
    logger.error("[admin/content-factory/generate-blog] Error:", err);

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
