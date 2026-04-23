import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const CACHE_KEY = "admin:dashboard:v1";
const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/admin/dashboard
 *
 * Returns aggregated KPI data for the admin dashboard.
 * Cached in Redis for 5 minutes to avoid re-running 17 parallel Supabase
 * queries on every admin page load.
 */
export const GET = withAdmin(async (_req, supabase, _user) => {
  try {
    const cached = await redis.get<Record<string, unknown>>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  } catch (err) {
    logger.warn("[Admin Dashboard] Redis cache read failed:", err);
  }

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const currentMonthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [
    { count: totalUsers },
    { count: proUsersCount },
    { count: totalRevenue },
    { data: apiCostsData },
    { data: manualCostsData },
    { count: promptsThisMonth },
    { count: promptsToday },
    { data: recentSignups },
    { data: recentActivity },
    { count: totalGenerations },
    { count: generationsToday },
    { count: generationsThisMonth },
    { data: dauData },
    { data: wauData },
    { data: mauData },
    { data: modeBreakdown },
    { count: errorCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("plan_tier", "free"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("api_usage_logs")
      .select("estimated_cost_usd")
      .gte("created_at", firstOfMonth)
      .limit(50000),
    supabase.from("manual_costs").select("amount_usd").eq("billing_period", currentMonthLabel),
    supabase
      .from("personal_library")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstOfMonth),
    supabase
      .from("personal_library")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayMidnight),
    supabase
      .from("profiles")
      .select("id, created_at, plan_tier, email")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("activity_logs")
      .select("id, user_id, action, created_at, details")
      .order("created_at", { ascending: false })
      .limit(10),
    // Total generation history count
    supabase.from("history").select("*", { count: "exact", head: true }),
    // Generations today
    supabase
      .from("history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayMidnight),
    // Generations this month
    supabase
      .from("history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstOfMonth),
    // DAU: distinct users with activity today — use history count (exact, no cap needed)
    supabase.from("history").select("user_id").gte("created_at", todayMidnight),
    // WAU: distinct users in last 7 days
    supabase.from("history").select("user_id").gte("created_at", sevenDaysAgo),
    // MAU: distinct users in last 30 days
    supabase.from("history").select("user_id").gte("created_at", thirtyDaysAgo),
    // Engine mode breakdown from history (has capability_mode column, no cap)
    supabase.from("history").select("capability_mode").gte("created_at", firstOfMonth),
    // Error count (failed generations)
    supabase
      .from("api_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("endpoint", "enhance")
      .gte("created_at", firstOfMonth)
      .lte("estimated_cost_usd", 0),
  ]);

  // Aggregate free vs pro users (two head:true counts — no row fetch)
  const proUsers = proUsersCount ?? 0;
  const freeUsers = Math.max((totalUsers ?? 0) - proUsers, 0);

  // Conversion rate
  const conversionRate =
    (totalUsers ?? 0) > 0 ? ((proUsers / (totalUsers ?? 1)) * 100).toFixed(1) : "0";

  // Sum API costs MTD
  const apiCostsMTD =
    apiCostsData?.reduce((sum, row) => sum + (row.estimated_cost_usd ?? 0), 0) ?? 0;

  // Sum manual costs MTD
  const manualCostsMTD = manualCostsData?.reduce((sum, row) => sum + (row.amount_usd ?? 0), 0) ?? 0;

  // DAU / WAU / MAU (distinct user counts)
  const dau = new Set((dauData ?? []).map((r) => r.user_id)).size;
  const wau = new Set((wauData ?? []).map((r) => r.user_id)).size;
  const mau = new Set((mauData ?? []).map((r) => r.user_id)).size;

  // Avg prompts per active user
  const avgPromptsPerUser = mau > 0 ? ((generationsThisMonth ?? 0) / mau).toFixed(1) : "0";

  // Engine mode distribution — direct from history.capability_mode (no JSON parsing)
  const modeDistribution: Record<string, number> = {};
  for (const row of modeBreakdown ?? []) {
    const mode = (row.capability_mode as string) || "STANDARD";
    modeDistribution[mode] = (modeDistribution[mode] || 0) + 1;
  }

  // Monthly trend: last 6 months, new users per month (single query instead of 6)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
  const { data: trendProfiles } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", sixMonthsAgo);

  const monthlyTrend: { month: string; newUsers: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rangeStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const newUsers = (trendProfiles ?? []).filter((p) => {
      const created = new Date(p.created_at);
      return created >= rangeStart && created < rangeEnd;
    }).length;

    monthlyTrend.push({ month, newUsers });
  }

  const payload = {
    totalUsers: totalUsers ?? 0,
    freeUsers,
    proUsers,
    conversionRate,
    totalRevenue: totalRevenue ?? 0,
    apiCostsMTD,
    manualCostsMTD,
    promptsThisMonth: promptsThisMonth ?? 0,
    promptsToday: promptsToday ?? 0,
    totalGenerations: totalGenerations ?? 0,
    generationsToday: generationsToday ?? 0,
    generationsThisMonth: generationsThisMonth ?? 0,
    dau,
    wau,
    mau,
    avgPromptsPerUser,
    modeDistribution,
    errorCountMTD: errorCount ?? 0,
    recentSignups: recentSignups ?? [],
    recentActivity: recentActivity ?? [],
    monthlyTrend,
    generatedAt: new Date().toISOString(),
  };

  try {
    await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL });
  } catch (err) {
    logger.warn("[Admin Dashboard] Redis cache write failed:", err);
  }

  return NextResponse.json(payload);
});
