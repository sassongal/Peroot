import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/personal-library
 * Returns the user's personal prompt library (web + Chrome extension).
 * Auth + client scoping owned by withUser.
 */
export const GET = withUser(
  async (_req, ctx) => {
    const { data, error } = await ctx.db
      .from("personal_library")
      .select(
        "id, title, prompt, category, personal_category, use_case, tags, use_count, sort_index, created_at",
      )
      .eq("user_id", ctx.user!.id)
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      logger.error("[personal-library] DB error:", error);
      return NextResponse.json(
        { error: "טעינת הספרייה נכשלה", code: "load_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ items: data || [] });
  },
  { rateLimit: "personalLibrary" },
);
