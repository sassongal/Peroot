import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/p/batch?ids=a,b,c
 * Returns { prompts: { id: text } } for authenticated users. Used by the
 * category grid so many cards fetch in a single round-trip. Guests get 401.
 * Auth + publicPromptFetch rate-limit owned by withUser; reads
 * public_library_prompts via the service-role client (forceServiceClient).
 */
export const GET = withUser(
  async (req, ctx) => {
    const raw = req.nextUrl.searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[a-f0-9-]{8,64}$/i.test(s))
      .slice(0, 100);

    if (ids.length === 0) {
      return NextResponse.json({ prompts: {} });
    }

    try {
      const { data } = await ctx.db
        .from("public_library_prompts")
        .select("id, prompt")
        .in("id", ids)
        .eq("is_active", true);

      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.id && typeof row.prompt === "string") map[row.id] = row.prompt;
      }
      return NextResponse.json(
        { prompts: map },
        { headers: { "Cache-Control": "private, max-age=300" } },
      );
    } catch (e) {
      logger.error("[api/p/batch] error:", e);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "publicPromptFetch", forceServiceClient: true },
);
