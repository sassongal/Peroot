import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * GET /api/p/batch?ids=a,b,c
 * Returns { prompts: { id: text } } for authenticated users. Used by the
 * category grid (PromptCardBodyGate) so 60 cards can fetch in a single
 * round-trip rather than 60. Guests get 401; the grid renders preview-only
 * text in server HTML until this endpoint succeeds.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const raw = req.nextUrl.searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[a-f0-9-]{8,64}$/i.test(s))
      .slice(0, 100);

    if (ids.length === 0) {
      return NextResponse.json({ prompts: {} });
    }

    const service = createServiceClient();
    const { data } = await service
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
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
