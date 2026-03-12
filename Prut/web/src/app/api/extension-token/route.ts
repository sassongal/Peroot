import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * GET /api/extension-token
 * Returns the current session access_token for the Chrome extension.
 * Uses cookie-based auth (same-origin fetch from content script on peroot.space).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json({ token: null }, { status: 401 });
    }

    // Rate limit: 10 requests per minute per user
    const identifier = session.user?.id || req.headers.get("x-forwarded-for") || "anonymous";
    const limitResult = await checkRateLimit(identifier, "free");
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: limitResult.reset },
        { status: 429 }
      );
    }

    return NextResponse.json({
      token: session.access_token,
      expires_at: session.expires_at,
    });
  } catch {
    return NextResponse.json({ token: null }, { status: 500 });
  }
}
