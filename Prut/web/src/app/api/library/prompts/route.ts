import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllActiveLibraryPrompts } from "@/lib/public-library";
import { logger } from "@/lib/logger";

/**
 * GET /api/library/prompts
 *
 * Fetches ALL active public library prompts (batched — no silent row cap).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const prompts = await fetchAllActiveLibraryPrompts(supabase);

    return NextResponse.json(prompts, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    logger.error("[Public Library API] Critical Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
