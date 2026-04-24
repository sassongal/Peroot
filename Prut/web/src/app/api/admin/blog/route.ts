import { NextResponse } from "next/server";
import { withAdmin, withAdminWrite } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { pingGoogle } from "@/lib/google-ping";
import { z } from "zod";

const BlogPostSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(300),
  content: z.string().min(1),
  excerpt: z.string().max(1000).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  featured_image: z.string().url().optional().or(z.literal("")),
});

const BlogPostUpdateSchema = BlogPostSchema.partial().extend({
  id: z.string().uuid(),
});

const BlogPostDeleteSchema = z.object({
  id: z.string().uuid(),
});

// GET - list all posts (including drafts) for admin
export const GET = withAdmin(async (_req, supabase) => {
  try {
    const { data, error: dbError } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("[admin/blog] GET DB error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

// POST - create new post
export const POST = withAdminWrite(async (req, supabase) => {
  try {
    const raw = await req.json();
    const parsed = BlogPostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid blog post data", details: parsed.error.flatten() }, { status: 400 });
    }
    const { data, error: dbError } = await supabase
      .from("blog_posts")
      .insert(parsed.data)
      .select()
      .single();

    if (dbError) {
      logger.error("[admin/blog] POST DB error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

// PUT - update existing post
export const PUT = withAdminWrite(async (req, supabase) => {
  try {
    const body = await req.json();
    const parsed = BlogPostUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update data", details: parsed.error.flatten() }, { status: 400 });
    }
    const { id, ...updates } = parsed.data;

    // Check if status is changing to "published" — we'll ping Google after
    const isPublishing = updates.status === "published";

    const { data, error: dbError } = await supabase
      .from("blog_posts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      logger.error("[admin/blog] PUT DB error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    // Ping Google when a post is published
    if (isPublishing && data) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
      pingGoogle(`${siteUrl}/sitemap.xml`);
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

// DELETE - delete a post
export const DELETE = withAdminWrite(async (req, supabase) => {
  try {
    const body = await req.json();
    const parsed = BlogPostDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid or missing post id" }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", parsed.data.id);

    if (dbError) {
      logger.error("[admin/blog] DELETE DB error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
