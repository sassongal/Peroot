import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { logger } from "@/lib/logger";

/**
 * GET /api/announcements
 *
 * The live "מה חדש" notes, newest and highest priority first. Identical for
 * every visitor (RLS already limits the read to live rows), so it is read as
 * the anonymous role and cached for an hour at the CDN: the home page must
 * not pay a database query per visit for one line of text.
 */
export const revalidate = 3600;

export interface PublicAnnouncement {
  id: string;
  title: string;
  body: string;
  href: string | null;
  href_label: string | null;
  audience: "all" | "guests" | "users" | "pro";
  lang: "he" | "en" | "ar" | "ru";
  starts_at: string;
}

export async function GET(req: NextRequest) {
  try {
    // Audience filtering happens HERE, not only in the banner: without it an
    // anonymous curl received the full text of users/pro-targeted notes. The
    // viewer rides as a query param (3 values) so the CDN still caches — one
    // variant per audience instead of one per visitor.
    const viewerParam = req.nextUrl.searchParams.get("viewer");
    const viewer = viewerParam === "user" || viewerParam === "pro" ? viewerParam : "guest";
    const audiences =
      viewer === "pro"
        ? ["all", "users", "pro"]
        : viewer === "user"
          ? ["all", "users"]
          : ["all", "guests"];

    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, href, href_label, audience, lang, starts_at")
      .in("audience", audiences)
      .order("priority", { ascending: false })
      .order("starts_at", { ascending: false })
      .limit(5);

    if (error) {
      logger.error("[announcements] DB error:", error);
      return NextResponse.json(
        { error: "פעולת מסד הנתונים נכשלה", code: "db_error" },
        { status: 500 },
      );
    }
    return NextResponse.json((data ?? []) as PublicAnnouncement[], {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    logger.error("[announcements] Error:", error);
    return NextResponse.json(
      { error: "שגיאת שרת פנימית", code: "internal_error" },
      { status: 500 },
    );
  }
}
