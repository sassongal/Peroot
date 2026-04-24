import { NextRequest, NextResponse } from "next/server";
import { resolveGuestId, applyGuestCookie, getGuestQuotaStatus } from "@/lib/guest-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/guest/quota
 * Read-only guest quota status for the UI. Creates a guest id on first
 * call and returns remaining prompts + refresh time.
 */
export async function GET(req: NextRequest) {
  try {
    const { id, needsCookie } = await resolveGuestId(req);
    const status = await getGuestQuotaStatus(id);

    const body = {
      guest_id: id,
      credits_balance: status.remaining,
      daily_limit: status.dailyLimit,
      refresh_at: status.refreshAt ? status.refreshAt.toISOString() : null,
    };

    const res = NextResponse.json(body, {
      headers: { "Cache-Control": "private, no-store" },
    });
    if (needsCookie) applyGuestCookie(res, id);
    return res;
  } catch (error) {
    logger.error("[guest/quota] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
