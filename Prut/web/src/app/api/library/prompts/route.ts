import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { fetchAllActiveLibraryPrompts } from "@/lib/public-library";
import { logger } from "@/lib/logger";

/**
 * GET /api/library/prompts
 *
 * The whole active public catalogue (batched, so no silent row cap).
 *
 * Deliberately cookie free. The SSR client reads cookies, which makes the
 * route dynamic, and a dynamic route's `s-maxage` is a header the CDN never
 * gets to act on: this endpoint advertised a one hour shared cache and was
 * re-queried on every visit. The catalogue is identical for everyone, so it is
 * fetched as the anonymous role and cached once for all of them.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const prompts = await fetchAllActiveLibraryPrompts(createAnonClient());

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
