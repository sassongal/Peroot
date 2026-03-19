import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

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

    const rateLimit = await checkRateLimit(user.id, 'me');
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    // When using Bearer token, RLS won't have auth.uid() set,
    // so use service role client to query profiles
    const queryClient = bearerToken
      ? createServiceClient()
      : supabase;

    const [{ data: profile }, { data: adminRole }] = await Promise.all([
      queryClient
        .from("profiles")
        .select("plan_tier, credits_balance, display_name")
        .eq("id", user.id)
        .maybeSingle(),
      queryClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    const isAdmin = user.app_metadata?.role === "admin" || !!adminRole;

    return NextResponse.json({
      id: user.id,
      email: user.email,
      display_name: profile?.display_name || user.user_metadata?.full_name || null,
      plan_tier: isAdmin ? "admin" : (profile?.plan_tier || "free"),
      credits_balance: profile?.credits_balance ?? 0,
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    logger.error("[me] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
