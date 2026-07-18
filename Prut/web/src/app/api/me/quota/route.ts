import { NextResponse } from "next/server";
import { getRefreshAt } from "@/lib/services/credit-service";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/me/quota
 * Returns the authenticated user's quota + rolling-window refresh time (drives
 * the QuotaExhaustedModal countdown). Read-only. Auth + client scoping owned by
 * withUser (cookie or Bearer for the extension).
 */
export const GET = withUser(
  async (_req, ctx) => {
    try {
      const user = ctx.user!;
      const queryClient = ctx.db;

      const [{ data: profile }, { data: settings }, { data: adminRole }] = await Promise.all([
        queryClient
          .from("profiles")
          .select("plan_tier, credits_balance, last_prompt_at")
          .eq("id", user.id)
          .maybeSingle(),
        queryClient.from("site_settings").select("daily_free_limit").maybeSingle(),
        // Safety net: if plan_tier is out of sync, user_roles is authoritative for admin
        queryClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      const profileTier = (profile?.plan_tier as "free" | "pro" | "admin") || "free";
      const tier: "free" | "pro" | "admin" = adminRole ? "admin" : profileTier;
      const dailyLimit = settings?.daily_free_limit ?? 2;
      const refreshAt = await getRefreshAt(user.id);

      // Reflect the rolling-window reset in the returned balance (the actual
      // reset happens at spend-time inside the RPC; surface the refilled value
      // so UIs don't gate on a stale 0). The RPC remains the atomic truth.
      const rawBalance = profile?.credits_balance ?? 0;
      const lastPromptAt = profile?.last_prompt_at ?? null;
      const shouldReset =
        tier === "free" &&
        (!lastPromptAt || Date.now() - new Date(lastPromptAt).getTime() >= 24 * 60 * 60 * 1000);
      const displayBalance = shouldReset ? dailyLimit : rawBalance;

      return NextResponse.json(
        {
          plan_tier: tier,
          credits_balance: displayBalance,
          daily_limit: dailyLimit,
          refresh_at: refreshAt ? refreshAt.toISOString() : null,
          last_prompt_at: lastPromptAt,
        },
        { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } },
      );
    } catch (error) {
      logger.error("[me/quota] Error:", error);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "none" },
);
