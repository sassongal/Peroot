import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { logger } from "@/lib/logger";

/**
 * GET /api/blog
 *
 * The published post list. Identical for every visitor, so it is read as the
 * anonymous role and cached, rather than being re-queried per request through
 * a cookie client that also forced the route to be dynamic.
 */
export const revalidate = 600;

export async function GET() {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, category, read_time, published_at, thumbnail_url, tags")
      .eq("status", "published")
      .eq("lang", "he")
      .order("published_at", { ascending: false });

    if (error) {
      logger.error("[blog] DB error:", error);
      return NextResponse.json(
        { error: "פעולת מסד הנתונים נכשלה", code: "db_error" },
        { status: 500 },
      );
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    logger.error("[blog] Error:", error);
    return NextResponse.json(
      { error: "שגיאת שרת פנימית", code: "internal_error" },
      { status: 500 },
    );
  }
}
