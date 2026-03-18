import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";
import { pingGoogle } from "@/lib/google-ping";
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
export async function POST(req: NextRequest) {
  try {
    const { error, supabase, user } = await validateAdminSession();
    if (error || !supabase || !user) {
      return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
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

      logger.info(`[admin/content-factory/approve] Published ${data?.length ?? 0} blog posts by user ${user.id}`);

      // Ping Google to re-crawl sitemap after publishing
      if (data && data.length > 0) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
        pingGoogle(`${siteUrl}/sitemap.xml`);
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

    logger.info(`[admin/content-factory/approve] Activated ${data?.length ?? 0} prompts by user ${user.id}`);

    return NextResponse.json({
      approved: data ?? [],
      count: data?.length ?? 0,
      type: "prompt",
    });
  } catch (err) {
    logger.error("[admin/content-factory/approve] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
