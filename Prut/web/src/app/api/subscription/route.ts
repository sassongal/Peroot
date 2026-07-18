import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

const cacheHeaders = { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" };

/**
 * GET /api/subscription
 * Returns the current user's subscription status. Guests get a "free" default
 * (no rate-limit — cheap, cache-headered). Auth owned by withUser.
 */
export const GET = withUser(
  async (_req, ctx) => {
    if (!ctx.user) {
      return NextResponse.json(
        {
          status: "free",
          plan_name: "Free",
          renews_at: null,
          ends_at: null,
          trial_ends_at: null,
          lemonsqueezy_subscription_id: null,
        },
        { headers: cacheHeaders },
      );
    }

    const user = ctx.user;
    try {
      const [{ data: subscription }, { data: profile }, { data: adminRole }] = await Promise.all([
        ctx.db
          .from("subscriptions")
          .select(
            "status, plan_name, renews_at, ends_at, trial_ends_at, lemonsqueezy_subscription_id",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        ctx.db.from("profiles").select("plan_tier").eq("id", user.id).maybeSingle(),
        ctx.db
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      const isAdmin = user.app_metadata?.role === "admin" || !!adminRole;
      const planTier = isAdmin ? "admin" : profile?.plan_tier || "free";

      if (!subscription) {
        return NextResponse.json(
          {
            status: planTier === "pro" || planTier === "admin" ? "active" : "free",
            plan_name: planTier === "admin" ? "Admin" : planTier === "pro" ? "Pro" : "Free",
            plan_tier: planTier,
            renews_at: null,
            ends_at: null,
            trial_ends_at: null,
            lemonsqueezy_subscription_id: null,
          },
          { headers: cacheHeaders },
        );
      }

      return NextResponse.json({ ...subscription, plan_tier: planTier }, { headers: cacheHeaders });
    } catch (error) {
      logger.error("[Subscription API] Error:", error);
      return NextResponse.json(
        { error: "טעינת סטטוס המנוי נכשלה", code: "load_failed" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "none", allowGuest: true },
);
