import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/signout
 *
 * Server-side sign-out: clears the Supabase session via the SSR client so the
 * HttpOnly auth cookies are properly expired in the response. Client-side
 * supabase.auth.signOut() alone cannot clear HttpOnly cookies set by the server.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
