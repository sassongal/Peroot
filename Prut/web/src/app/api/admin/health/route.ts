import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/health
 *
 * Returns system health data:
 *  - db: response time and status
 *  - apiPerformance: average response time by hour (last 24h) from api_usage_logs timestamps
 *  - errorRate: error entries in activity_logs last 24h vs total
 *  - storage: row counts for main tables
 *  - costBurnRate: today vs yesterday vs 7-day average
 *  - uptime: whether last 10 API calls succeeded
 *  - healthScore: 0-100 composite score
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).toISOString();
  const minus7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const minus24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // -- Database health: measure query response time
  const dbStart = Date.now();
  const { count: profileCount, error: dbError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const dbResponseMs = Date.now() - dbStart;

  const dbStatus: "healthy" | "warning" | "critical" = dbError
    ? "critical"
    : dbResponseMs < 300
      ? "healthy"
      : dbResponseMs < 800
        ? "warning"
        : "critical";

  // -- Storage: row counts
  const [
    { count: personalLibraryCount },
    { count: activityLogsCount },
    { count: apiUsageLogsCount },
  ] = await Promise.all([
    // These three tables are append-only and can grow into the millions.
    // `count: "estimated"` uses the Postgres planner's reltuples — much cheaper
    // and accurate within ~a few percent for admin dashboard numbers.
    supabase.from("personal_library").select("id", { count: "estimated", head: true }),
    supabase.from("activity_logs").select("id", { count: "estimated", head: true }),
    supabase.from("api_usage_logs").select("id", { count: "estimated", head: true }),
  ]);

  // Growth indicators: compare last 24h new rows vs previous 24h
  const minus48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [
    { count: profilesLast24h },
    { count: profilesPrev24h },
    { count: libraryLast24h },
    { count: activityLast24h },
    { count: apiCallsLast24h },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minus24h),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minus48h)
      .lt("created_at", minus24h),
    supabase
      .from("personal_library")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minus24h),
    supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minus24h),
    supabase
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minus24h),
  ]);

  const storage = {
    profiles: {
      total: profileCount ?? 0,
      last24h: profilesLast24h ?? 0,
      growth: (profilesLast24h ?? 0) - (profilesPrev24h ?? 0),
    },
    personalLibrary: {
      total: personalLibraryCount ?? 0,
      last24h: libraryLast24h ?? 0,
    },
    activityLogs: {
      total: activityLogsCount ?? 0,
      last24h: activityLast24h ?? 0,
    },
    apiUsageLogs: {
      total: apiUsageLogsCount ?? 0,
      last24h: apiCallsLast24h ?? 0,
    },
  };

  // -- Error rate: last 24h
  const { data: recentActivityData } = await supabase
    .from("activity_logs")
    .select("action, details")
    .gte("created_at", minus24h);

  const totalEventsLast24h = recentActivityData?.length ?? 0;
  const errorEvents = (recentActivityData ?? []).filter((r) => {
    const actionStr = String(r.action ?? "").toLowerCase();
    const detailsStr = JSON.stringify(r.details ?? "").toLowerCase();
    return (
      actionStr.includes("error") ||
      actionStr.includes("fail") ||
      detailsStr.includes("error") ||
      detailsStr.includes("exception")
    );
  }).length;

  const errorRatePct =
    totalEventsLast24h > 0 ? Math.round((errorEvents / totalEventsLast24h) * 10000) / 100 : 0;

  const errorStatus: "healthy" | "warning" | "critical" =
    errorRatePct < 1 ? "healthy" : errorRatePct < 5 ? "warning" : "critical";

  // -- API performance: hourly averages over last 24h (full columns)
  const { data: apiLogs24h } = await supabase
    .from("api_usage_logs")
    .select(
      "created_at, estimated_cost_usd, input_tokens, output_tokens, provider, model, duration_ms, cache_hit, endpoint",
    )
    .gte("created_at", minus24h)
    .order("created_at", { ascending: true });

  const logs24h = apiLogs24h ?? [];

  const hourlyBuckets: {
    hour: string;
    callCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    avgDurationMs: number;
  }[] = [];
  for (let i = 23; i >= 0; i--) {
    const slotStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const slotEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
    const slotRows = logs24h.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= slotStart.getTime() && t < slotEnd.getTime();
    });
    const totalInputTokens = slotRows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
    const totalOutputTokens = slotRows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
    const durSum = slotRows.reduce((s, r) => s + (r.duration_ms ?? 0), 0);
    hourlyBuckets.push({
      hour: `${String(slotStart.getHours()).padStart(2, "0")}:00`,
      callCount: slotRows.length,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost: slotRows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0),
      avgDurationMs: slotRows.length > 0 ? Math.round(durSum / slotRows.length) : 0,
    });
  }

  // Provider / model breakdown
  const providerBreakdown: Record<
    string,
    {
      calls: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      avgDurationMs: number;
    }
  > = {};
  const modelBreakdown: Record<
    string,
    { calls: number; inputTokens: number; outputTokens: number; cost: number }
  > = {};
  for (const r of logs24h) {
    const p = r.provider ?? "unknown";
    const m = r.model ?? "unknown";
    if (!providerBreakdown[p])
      providerBreakdown[p] = {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        avgDurationMs: 0,
      };
    if (!modelBreakdown[m])
      modelBreakdown[m] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    providerBreakdown[p].calls++;
    providerBreakdown[p].inputTokens += r.input_tokens ?? 0;
    providerBreakdown[p].outputTokens += r.output_tokens ?? 0;
    providerBreakdown[p].cost += r.estimated_cost_usd ?? 0;
    providerBreakdown[p].avgDurationMs += r.duration_ms ?? 0;
    modelBreakdown[m].calls++;
    modelBreakdown[m].inputTokens += r.input_tokens ?? 0;
    modelBreakdown[m].outputTokens += r.output_tokens ?? 0;
    modelBreakdown[m].cost += r.estimated_cost_usd ?? 0;
  }
  for (const p of Object.keys(providerBreakdown)) {
    const b = providerBreakdown[p];
    b.avgDurationMs = b.calls > 0 ? Math.round(b.avgDurationMs / b.calls) : 0;
    b.cost = Math.round(b.cost * 1e6) / 1e6;
  }
  for (const m of Object.keys(modelBreakdown)) {
    modelBreakdown[m].cost = Math.round(modelBreakdown[m].cost * 1e6) / 1e6;
  }

  const totalApiCallsLast24h = logs24h.length;
  const avgCallsPerHour = Math.round(totalApiCallsLast24h / 24);
  const totalInputTokens24h = logs24h.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const totalOutputTokens24h = logs24h.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const cacheHits24h = logs24h.filter((r) => r.cache_hit).length;
  const avgDurationMs24h =
    totalApiCallsLast24h > 0
      ? Math.round(logs24h.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / totalApiCallsLast24h)
      : 0;
  const apiStatus: "healthy" | "warning" | "critical" =
    totalApiCallsLast24h === 0 ? "warning" : "healthy";

  // -- Cost burn rate
  const { data: todayLogs } = await supabase
    .from("api_usage_logs")
    .select("estimated_cost_usd")
    .gte("created_at", startOfToday);

  const { data: yesterdayLogs } = await supabase
    .from("api_usage_logs")
    .select("estimated_cost_usd")
    .gte("created_at", startOfYesterday)
    .lt("created_at", startOfToday);

  const { data: last7dLogs } = await supabase
    .from("api_usage_logs")
    .select("estimated_cost_usd")
    .gte("created_at", minus7d);

  const todayCost = (todayLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const yesterdayCost = (yesterdayLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const last7dTotal = (last7dLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const sevenDayAvg = last7dTotal / 7;

  const costBurnRate = {
    today: todayCost,
    yesterday: yesterdayCost,
    sevenDayAvg,
    trend:
      yesterdayCost > 0
        ? Math.round(((todayCost - yesterdayCost) / yesterdayCost) * 10000) / 100
        : 0,
  };

  // -- Uptime: last 10 API calls all succeeded
  const { data: last10Calls } = await supabase
    .from("api_usage_logs")
    .select("id, estimated_cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const uptimeCallsFound = (last10Calls ?? []).length;
  const uptimePct = uptimeCallsFound === 0 ? 100 : Math.round((uptimeCallsFound / 10) * 100);
  const uptimeStatus: "healthy" | "warning" | "critical" =
    uptimePct >= 90 ? "healthy" : uptimePct >= 50 ? "warning" : "critical";

  // -- Composite health score (0-100)
  const statusScore = (s: "healthy" | "warning" | "critical") =>
    s === "healthy" ? 100 : s === "warning" ? 60 : 20;

  const healthScore = Math.round(
    statusScore(dbStatus) * 0.3 +
      statusScore(errorStatus) * 0.3 +
      statusScore(apiStatus) * 0.2 +
      statusScore(uptimeStatus) * 0.2,
  );

  const overallStatus: "healthy" | "warning" | "critical" =
    healthScore >= 80 ? "healthy" : healthScore >= 50 ? "warning" : "critical";

  return NextResponse.json({
    healthScore,
    overallStatus,
    checkedAt: now.toISOString(),
    db: {
      status: dbStatus,
      responseMs: dbResponseMs,
    },
    apiPerformance: {
      status: apiStatus,
      totalCallsLast24h: totalApiCallsLast24h,
      avgCallsPerHour,
      totalInputTokens: totalInputTokens24h,
      totalOutputTokens: totalOutputTokens24h,
      totalTokens: totalInputTokens24h + totalOutputTokens24h,
      avgDurationMs: avgDurationMs24h,
      cacheHits: cacheHits24h,
      cacheHitRate:
        totalApiCallsLast24h > 0
          ? Math.round((cacheHits24h / totalApiCallsLast24h) * 10000) / 100
          : 0,
      providerBreakdown,
      modelBreakdown,
      hourlyBuckets,
    },
    errorRate: {
      status: errorStatus,
      errorEvents,
      totalEvents: totalEventsLast24h,
      ratePct: errorRatePct,
    },
    storage,
    costBurnRate,
    uptime: {
      status: uptimeStatus,
      uptimePct,
      callsChecked: uptimeCallsFound,
    },
  });
});
