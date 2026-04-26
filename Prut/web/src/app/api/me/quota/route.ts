import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRefreshAt } from "@/lib/services/credit-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/me/quota
 * Returns the authenticated user's quota + rolling-window refresh time.
 * Used by the UI to drive the countdown timer in QuotaExhaustedModal.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const {
      data: { user },
    } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const queryClient = bearerToken ? createServiceClient() : supabase;

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
    // user_roles.admin overrides a stale plan_tier (e.g. before grant_admin synced profiles)
    const tier: "free" | "pro" | "admin" = adminRole ? "admin" : profileTier;
    const dailyLimit = settings?.daily_free_limit ?? 2;
    const refreshAt = await getRefreshAt(user.id);

    // Reflect the rolling-window reset in the returned balance: a free-tier
    // user whose last_prompt_at is > 24h ago still shows `credits_balance = 0`
    // in the DB (the reset happens at spend-time inside the RPC). To prevent
    // UIs from gating on a stale 0, surface the refilled value here. The
    // server-side RPC remains the atomic source of truth for actual spends.
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
      {
        headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" },
      },
    );
  } catch (error) {
    logger.error("[me/quota] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
