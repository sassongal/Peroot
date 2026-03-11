import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/extension-token
 * Returns the current session access_token for the Chrome extension.
 * Uses cookie-based auth (same-origin fetch from content script on peroot.space).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json({ token: null }, { status: 401 });
    }

    return NextResponse.json({
      token: session.access_token,
      expires_at: session.expires_at,
    });
  } catch {
    return NextResponse.json({ token: null }, { status: 500 });
  }
}
