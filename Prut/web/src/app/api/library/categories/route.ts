import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * GET /api/library/categories
 *
 * The public category list. Cookie free for the same reason as
 * /api/library/prompts: the SSR client made the route dynamic, so the three
 * cache headers below described a response the CDN was never offered.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("library_categories")
      .select("id, name_en, name_he, icon, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data || [], {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Vercel-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
