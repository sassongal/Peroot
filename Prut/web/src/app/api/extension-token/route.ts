import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/extension-token
 * Returns the current session access_token for the Chrome extension (same-origin
 * cookie fetch). withUser owns auth + the free-bucket rate limit; the token
 * itself is read from the cookie-bound session client (ctx.db.auth).
 */
export const GET = withUser(
  async (_req, ctx) => {
    const {
      data: { session },
    } = await ctx.db.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ token: null }, { status: 401 });
    }

    return NextResponse.json({
      token: session.access_token,
      expires_at: session.expires_at,
    });
  },
  { rateLimit: "free" },
);
