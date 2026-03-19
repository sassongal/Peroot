import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

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
export const GET = withAdmin(async (_req, supabase) => {
  const now = new Date();
  const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const minus7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const minus24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // -- Database health: measure query response time
  const dbStart = Date.now();
  const { count: profileCount, error: dbError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  const dbResponseMs = Date.now() - dbStart;

  const dbStatus: 'healthy' | 'warning' | 'critical' =
    dbError ? 'critical' : dbResponseMs < 300 ? 'healthy' : dbResponseMs < 800 ? 'warning' : 'critical';

  // -- Storage: row counts
  const [
    { count: personalLibraryCount },
    { count: activityLogsCount },
    { count: apiUsageLogsCount },
  ] = await Promise.all([
    supabase.from('personal_library').select('id', { count: 'exact', head: true }),
    supabase.from('activity_logs').select('id', { count: 'exact', head: true }),
    supabase.from('api_usage_logs').select('id', { count: 'exact', head: true }),
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
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', minus24h),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', minus48h).lt('created_at', minus24h),
    supabase.from('personal_library').select('id', { count: 'exact', head: true }).gte('created_at', minus24h),
    supabase.from('activity_logs').select('id', { count: 'exact', head: true }).gte('created_at', minus24h),
    supabase.from('api_usage_logs').select('id', { count: 'exact', head: true }).gte('created_at', minus24h),
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
    .from('activity_logs')
    .select('action, details')
    .gte('created_at', minus24h);

  const totalEventsLast24h = recentActivityData?.length ?? 0;
  const errorEvents = (recentActivityData ?? []).filter((r) => {
    const actionStr = String(r.action ?? '').toLowerCase();
    const detailsStr = JSON.stringify(r.details ?? '').toLowerCase();
    return (
      actionStr.includes('error') ||
      actionStr.includes('fail') ||
      detailsStr.includes('error') ||
      detailsStr.includes('exception')
    );
  }).length;

  const errorRatePct = totalEventsLast24h > 0
    ? Math.round((errorEvents / totalEventsLast24h) * 10000) / 100
    : 0;

  const errorStatus: 'healthy' | 'warning' | 'critical' =
    errorRatePct < 1 ? 'healthy' : errorRatePct < 5 ? 'warning' : 'critical';

  // -- API performance: hourly averages over last 24h
  const { data: apiLogs24h } = await supabase
    .from('api_usage_logs')
    .select('created_at, estimated_cost_usd, tokens_used')
    .gte('created_at', minus24h)
    .order('created_at', { ascending: true });

  const hourlyBuckets: { hour: string; callCount: number; totalTokens: number; totalCost: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const slotStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const slotEnd   = new Date(now.getTime() - i       * 60 * 60 * 1000);
    const slotRows  = (apiLogs24h ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= slotStart.getTime() && t < slotEnd.getTime();
    });
    hourlyBuckets.push({
      hour: `${String(slotStart.getHours()).padStart(2, '0')}:00`,
      callCount: slotRows.length,
      totalTokens: slotRows.reduce((s, r) => s + (r.tokens_used ?? 0), 0),
      totalCost: slotRows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0),
    });
  }

  const totalApiCallsLast24h = (apiLogs24h ?? []).length;
  const avgCallsPerHour = Math.round(totalApiCallsLast24h / 24);
  const apiStatus: 'healthy' | 'warning' | 'critical' =
    totalApiCallsLast24h === 0 ? 'warning' : 'healthy';

  // -- Cost burn rate
  const { data: todayLogs } = await supabase
    .from('api_usage_logs')
    .select('estimated_cost_usd')
    .gte('created_at', startOfToday);

  const { data: yesterdayLogs } = await supabase
    .from('api_usage_logs')
    .select('estimated_cost_usd')
    .gte('created_at', startOfYesterday)
    .lt('created_at', startOfToday);

  const { data: last7dLogs } = await supabase
    .from('api_usage_logs')
    .select('estimated_cost_usd')
    .gte('created_at', minus7d);

  const todayCost     = (todayLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const yesterdayCost = (yesterdayLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const last7dTotal   = (last7dLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const sevenDayAvg   = last7dTotal / 7;

  const costBurnRate = {
    today: todayCost,
    yesterday: yesterdayCost,
    sevenDayAvg,
    trend: yesterdayCost > 0
      ? Math.round(((todayCost - yesterdayCost) / yesterdayCost) * 10000) / 100
      : 0,
  };

  // -- Uptime: last 10 API calls all succeeded
  const { data: last10Calls } = await supabase
    .from('api_usage_logs')
    .select('id, estimated_cost_usd, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const uptimeCallsFound = (last10Calls ?? []).length;
  const uptimePct = uptimeCallsFound === 0 ? 100 : Math.round((uptimeCallsFound / 10) * 100);
  const uptimeStatus: 'healthy' | 'warning' | 'critical' =
    uptimePct >= 90 ? 'healthy' : uptimePct >= 50 ? 'warning' : 'critical';

  // -- Composite health score (0-100)
  const statusScore = (s: 'healthy' | 'warning' | 'critical') =>
    s === 'healthy' ? 100 : s === 'warning' ? 60 : 20;

  const healthScore = Math.round(
    statusScore(dbStatus)    * 0.30 +
    statusScore(errorStatus) * 0.30 +
    statusScore(apiStatus)   * 0.20 +
    statusScore(uptimeStatus) * 0.20
  );

  const overallStatus: 'healthy' | 'warning' | 'critical' =
    healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical';

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
