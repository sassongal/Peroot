import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/me
 * Returns current user info (name, tier, credits).
 *
 * Auth (cookie or Bearer for the Chrome extension) and the correctly-scoped
 * client are owned by withUser. This handler keeps its own profile read because
 * it needs credits_balance / display_name, not just the plan tier.
 */
export const GET = withUser(
  async (_req, ctx) => {
    const user = ctx.user!;
    const queryClient = ctx.db;

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

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || user.user_metadata?.full_name || null,
        plan_tier: isAdmin ? "admin" : profile?.plan_tier || "free",
        credits_balance: profile?.credits_balance ?? 0,
      },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
    );
  },
  { rateLimit: "me" },
);
