import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/stats
 *
 * Comprehensive admin statistics — synced with dashboard metrics.
 * Uses service client so RLS on history/personal_library/activity_logs
 * doesn't silently scope counts to the requesting admin.
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalPrompts },
    { count: todayPrompts },
    { count: totalActivity },
    { count: totalStyles },
    { count: totalGenerations },
    { count: generationsToday },
    { count: generationsThisMonth },
    { count: activeSubscriptions },
    { data: dauData },
    { data: wauData },
    { data: mauData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    // Append-only tables — use planner estimate (reltuples) for global totals.
    // Filtered counts below still use "exact" because the planner estimate is
    // row-total only, not filter-aware.
    supabase.from("personal_library").select("*", { count: "estimated", head: true }),
    supabase
      .from("personal_library")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayMidnight),
    supabase.from("activity_logs").select("*", { count: "estimated", head: true }),
    supabase.from("user_style_personality").select("*", { count: "exact", head: true }),
    supabase.from("history").select("*", { count: "estimated", head: true }),
    supabase
      .from("history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayMidnight),
    supabase
      .from("history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstOfMonth),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("activity_logs").select("user_id").gte("created_at", todayMidnight).limit(50000),
    supabase.from("activity_logs").select("user_id").gte("created_at", sevenDaysAgo).limit(50000),
    supabase.from("activity_logs").select("user_id").gte("created_at", thirtyDaysAgo).limit(50000),
  ]);

  const dau = new Set((dauData ?? []).map((r) => r.user_id)).size;
  const wau = new Set((wauData ?? []).map((r) => r.user_id)).size;
  const mau = new Set((mauData ?? []).map((r) => r.user_id)).size;

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    totalPrompts: totalPrompts || 0,
    todayPrompts: todayPrompts || 0,
    totalActivity: totalActivity || 0,
    totalStyles: totalStyles || 0,
    totalGenerations: totalGenerations || 0,
    generationsToday: generationsToday || 0,
    generationsThisMonth: generationsThisMonth || 0,
    activeSubscriptions: activeSubscriptions || 0,
    dau,
    wau,
    mau,
    timestamp: new Date().toISOString(),
  });
});
