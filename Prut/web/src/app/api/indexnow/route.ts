import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { submitToIndexNowAwait } from "@/lib/indexnow";

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
export const POST = withAdmin(async (req, supabase) => {
  if (!INDEXNOW_KEY) {
    return NextResponse.json({ error: "INDEXNOW_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let urls: string[] = body.urls || [];

    if (urls.length === 0) {
      const staticUrls = [
        SITE_URL,
        `${SITE_URL}/pricing`,
        `${SITE_URL}/blog`,
        `${SITE_URL}/contact`,
      ];

      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug")
        .eq("status", "published");

      const blogUrls = (posts ?? []).map((p: { slug: string }) => `${SITE_URL}/blog/${p.slug}`);
      urls = [...staticUrls, ...blogUrls];
    }

    const result = await submitToIndexNowAwait(urls);

    return NextResponse.json({
      success: result.ok,
      status: result.status,
      urlsSubmitted: result.submitted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
