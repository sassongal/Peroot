import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/me/credits/ledger
 * Returns the authenticated user's last 10 credit_ledger entries.
 * RLS already restricts the table to the row owner; we filter by auth.uid()
 * defensively so the endpoint cannot return cross-user rows even if RLS is loosened.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("credit_ledger")
      .select("id, delta, balance_after, reason, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logger.error("[me/credits/ledger] query error:", error);
      return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
    }

    return NextResponse.json(
      { entries: data ?? [] },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } },
    );
  } catch (err) {
    logger.error("[me/credits/ledger] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
