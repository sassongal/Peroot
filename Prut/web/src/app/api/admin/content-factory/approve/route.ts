import { NextResponse } from "next/server";
import { withAdminWrite } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { pingGoogle } from "@/lib/google-ping";
import { submitToIndexNow } from "@/lib/indexnow";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import { z } from "zod";

const ApproveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one id is required"),
  type: z.enum(["blog", "prompt"]),
});

/**
 * POST /api/admin/content-factory/approve
 *
 * Approve (publish) content-factory drafts.
 * - blog: sets status='published' and published_at
 * - prompt: sets is_active=true
 */
export const POST = withAdminWrite(async (req, supabase, user) => {
  try {
    const body = await req.json();
    const parsed = ApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ids, type } = parsed.data;
    const now = new Date().toISOString();

    if (type === "blog") {
      const { data, error: updateError } = await supabase
        .from("blog_posts")
        .update({
          status: "published",
          published_at: now,
          updated_at: now,
        })
        .in("id", ids)
        .eq("status", "draft")
        .select("id, title, slug");

      if (updateError) {
        logger.error("[admin/content-factory/approve] Blog update error:", updateError);
        return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
      }

      logger.info(
        `[admin/content-factory/approve] Published ${data?.length ?? 0} blog posts by user ${user.id}`,
      );

      // Ping Google + IndexNow so the fresh posts get crawled within minutes
      if (data && data.length > 0) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
        pingGoogle(`${siteUrl}/sitemap.xml`);
        submitToIndexNow(data.map((p) => `${siteUrl}/blog/${p.slug}`));
      }

      return NextResponse.json({
        approved: data ?? [],
        count: data?.length ?? 0,
        type: "blog",
      });
    }

    // type === "prompt"
    const { data, error: updateError } = await supabase
      .from("public_library_prompts")
      .update({
        is_active: true,
        updated_at: now,
      })
      .in("id", ids)
      .eq("is_active", false)
      .select("id, title, category_id");

    if (updateError) {
      logger.error("[admin/content-factory/approve] Prompt update error:", updateError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    logger.info(
      `[admin/content-factory/approve] Activated ${data?.length ?? 0} prompts by user ${user.id}`,
    );

    // New prompt pages are indexable landing pages — ping them out too
    if (data && data.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
      const idToSlug = Object.fromEntries(
        Object.entries(CATEGORY_SLUG_MAP).map(([slug, d]) => [d.id.toLowerCase(), slug]),
      );
      pingGoogle(`${siteUrl}/sitemap.xml`);
      submitToIndexNow(
        data
          .filter((p) => p.category_id && idToSlug[p.category_id.toLowerCase()])
          .map((p) => `${siteUrl}/prompts/${idToSlug[p.category_id!.toLowerCase()]}/${p.id}`),
      );
    }

    return NextResponse.json({
      approved: data ?? [],
      count: data?.length ?? 0,
      type: "prompt",
    });
  } catch (err) {
    logger.error("[admin/content-factory/approve] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
