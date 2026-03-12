import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * GET /api/favorites
 * Returns the user's favorited prompts (from public library).
 * Supports Bearer token auth (Chrome extension).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = bearerToken
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : supabase;

    // Get favorite IDs
    const { data: favs } = await client
      .from("prompt_favorites")
      .select("item_id, item_type")
      .eq("user_id", user.id);

    if (!favs || favs.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get library favorites (from public ai_prompts)
    const libraryIds = favs.filter(f => f.item_type === "library").map(f => f.item_id);
    const personalIds = favs.filter(f => f.item_type === "personal").map(f => f.item_id);

    const results: Array<{ id: string; title: string; prompt: string; category: string; type: string }> = [];

    if (libraryIds.length > 0) {
      const { data } = await client
        .from("ai_prompts")
        .select("id, title, prompt, category")
        .in("id", libraryIds);
      if (data) {
        results.push(...data.map(d => ({ ...d, id: String(d.id), type: "library" })));
      }
    }

    if (personalIds.length > 0) {
      const { data } = await client
        .from("personal_library")
        .select("id, title, prompt, category")
        .in("id", personalIds)
        .eq("user_id", user.id);
      if (data) {
        results.push(...data.map(d => ({ ...d, type: "personal" })));
      }
    }

    return NextResponse.json({ items: results });
  } catch (error) {
    logger.error("[favorites] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
