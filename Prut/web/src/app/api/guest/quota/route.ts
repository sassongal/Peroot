import { NextRequest, NextResponse } from "next/server";
import { isIP } from "net";
import { resolveGuestId, applyGuestCookie, getGuestQuotaStatus } from "@/lib/guest-service";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * GET /api/guest/quota
 * Read-only guest quota status for the UI. Creates a guest id on first
 * call and returns remaining prompts + refresh time.
 */
export async function GET(req: NextRequest) {
  try {
    // Rate-limited: every call runs a Redis mint/claim, so an anonymous loop
    // otherwise drives unbounded (billed) Upstash writes. GET requests skip
    // CSRF entirely, so this is the only guard on the endpoint.
    const rawRealIp = req.headers.get("x-real-ip");
    const rawXff = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    const clientIp =
      (rawRealIp && isIP(rawRealIp) ? rawRealIp : null) ?? (rawXff && isIP(rawXff) ? rawXff : null);
    if (clientIp) {
      const limit = await checkRateLimit(`guest-quota:${clientIp}`, "free");
      if (!limit.success) {
        return NextResponse.json(
          { error: "יותר מדי בקשות", code: "rate_limited" },
          { status: 429 },
        );
      }
    }

    const { id, needsCookie } = await resolveGuestId(req);
    const status = await getGuestQuotaStatus(id);

    // The guest id is deliberately NOT returned: echoing it back would make
    // the cookie's HttpOnly flag decorative (any injected script could just
    // fetch it). The UI only needs the balance and the refresh time.
    const body = {
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
    return NextResponse.json(
      { error: "שגיאת שרת פנימית", code: "internal_error" },
      { status: 500 },
    );
  }
}
