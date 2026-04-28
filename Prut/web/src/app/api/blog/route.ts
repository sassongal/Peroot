import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "slug, title, excerpt, category, read_time, published_at, thumbnail_url, tags"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      logger.error("[blog] DB error:", error);
      return NextResponse.json({ error: "פעולת מסד הנתונים נכשלה", code: "db_error" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[blog] Error:", error);
    return NextResponse.json({ error: "שגיאת שרת פנימית", code: "internal_error" }, { status: 500 });
  }
}
