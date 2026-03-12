import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * GET /api/personal-library
 * Returns the user's personal prompt library.
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

    // Use service role to bypass RLS for Bearer token requests
    const client = bearerToken
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : supabase;

    const { data, error } = await client
      .from("personal_library")
      .select("id, title, prompt, category, personal_category, use_case, tags, use_count, sort_index, created_at")
      .eq("user_id", user.id)
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[personal-library] DB error:", error);
      return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    logger.error("[personal-library] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
