import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { escapePostgrestValue } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/library/search?q=searchterm&limit=20
 *
 * Full-text search across public library prompts (title, use_case, prompt).
 * Word-split AND search (U3.2): a single `%whole phrase%` pattern returned 0
 * results unless the exact word sequence appeared — the same bug Connect's
 * library search already fixed. Each word must match SOME field; words
 * combine with AND, so more words narrow rather than kill the search.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q")?.trim() ?? "";
    const limitParam = parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    // Empty query returns empty results immediately
    if (!query) {
      return NextResponse.json([]);
    }

    const supabase = await createClient();
    const words = query
      .replace(/[%_,().]/g, " ")
      .split(/\s+/)
      .map((w) => escapePostgrestValue(w))
      .filter(Boolean)
      .slice(0, 5);
    if (words.length === 0) {
      return NextResponse.json([]);
    }

    let q = supabase
      .from("public_library_prompts")
      .select("id, title, category_id, use_case, variables, capability_mode")
      .eq("is_active", true);
    for (const w of words) {
      const pattern = `%${w}%`;
      q = q.or(`title.ilike.${pattern},use_case.ilike.${pattern},prompt.ilike.${pattern}`);
    }
    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);

    if (error) {
      logger.error("[Library Search API] Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    logger.error("[Library Search API] Critical error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
