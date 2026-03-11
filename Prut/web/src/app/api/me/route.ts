import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/me
 * Returns current user info (name, tier, credits).
 * Supports both cookie-based auth (web) and Bearer token auth (Chrome extension).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Support Bearer token auth for Chrome extension
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier, credits_balance, display_name")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      display_name: profile?.display_name || user.user_metadata?.full_name || null,
      plan_tier: profile?.plan_tier || "free",
      credits_balance: profile?.credits_balance ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
