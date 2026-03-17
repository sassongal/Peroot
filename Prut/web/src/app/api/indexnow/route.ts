import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateAdminSession } from "@/lib/admin/admin-security";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/**
 * POST /api/indexnow
 * Submits URLs to IndexNow (Bing, Yandex, etc.) for faster indexing.
 * Requires admin authentication.
 *
 * Body: { urls?: string[] }
 * If no URLs provided, submits all published blog posts + static pages.
 */
export async function POST(req: NextRequest) {
  const { error: authError } = await validateAdminSession();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!INDEXNOW_KEY) {
    return NextResponse.json({ error: "INDEXNOW_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let urls: string[] = body.urls || [];

    // If no specific URLs, submit all key pages
    if (urls.length === 0) {
      const staticUrls = [
        SITE_URL,
        `${SITE_URL}/pricing`,
        `${SITE_URL}/blog`,
        `${SITE_URL}/contact`,
      ];

      const supabase = await createClient();
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug")
        .eq("status", "published");

      const blogUrls = (posts ?? []).map((p) => `${SITE_URL}/blog/${p.slug}`);
      urls = [...staticUrls, ...blogUrls];
    }

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: new URL(SITE_URL).hostname,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      urlsSubmitted: urls.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
