import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/me/credits/ledger
 * Returns the authenticated user's last 10 credit_ledger entries. RLS already
 * restricts the table to the row owner; we filter by ctx.user.id defensively so
 * the endpoint cannot return cross-user rows even if RLS is loosened.
 * Read-only. Auth owned by withUser.
 */
export const GET = withUser(
  async (_req, ctx) => {
    const { data, error } = await ctx.db
      .from("credit_ledger")
      .select("id, delta, balance_after, reason, source, created_at")
      .eq("user_id", ctx.user!.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logger.error("[me/credits/ledger] query error:", error);
      return NextResponse.json(
        { error: "טעינת ההיסטוריה נכשלה", code: "load_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { entries: data ?? [] },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } },
    );
  },
  { rateLimit: "none" },
);
