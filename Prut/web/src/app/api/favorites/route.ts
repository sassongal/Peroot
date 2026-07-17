import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/favorites
 * Returns the user's favorited prompts (public library + personal).
 *
 * Auth (cookie or Bearer, for the Chrome extension) and the correctly-scoped
 * client (RLS cookie / service-role for Bearer) are owned by withUser — the
 * handler just reads `ctx.db` and `ctx.user`.
 */
export const GET = withUser(
  async (_req, ctx) => {
    const user = ctx.user!;
    const client = ctx.db;

    // Get favorite IDs
    const { data: favs } = await client
      .from("prompt_favorites")
      .select("item_id, item_type")
      .eq("user_id", user.id);

    if (!favs || favs.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get library favorites (from public ai_prompts)
    const libraryIds = favs.filter((f) => f.item_type === "library").map((f) => f.item_id);
    const personalIds = favs.filter((f) => f.item_type === "personal").map((f) => f.item_id);

    const results: Array<{
      id: string;
      title: string;
      prompt: string;
      category: string;
      type: string;
    }> = [];

    if (libraryIds.length > 0) {
      const { data } = await client
        .from("ai_prompts")
        .select("id, title, prompt, category")
        .in("id", libraryIds);
      if (data) {
        results.push(...data.map((d) => ({ ...d, id: String(d.id), type: "library" })));
      }
    }

    if (personalIds.length > 0) {
      const { data } = await client
        .from("personal_library")
        .select("id, title, prompt, category")
        .in("id", personalIds)
        .eq("user_id", user.id);
      if (data) {
        results.push(...data.map((d) => ({ ...d, type: "personal" })));
      }
    }

    return NextResponse.json(
      { items: results },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
    );
  },
  { rateLimit: "favorites" },
);
