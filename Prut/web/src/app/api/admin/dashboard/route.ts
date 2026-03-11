import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/dashboard
 *
 * Returns aggregated KPI data for the admin dashboard.
 */
export async function GET() {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const currentMonthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [
      { count: totalUsers },
      { data: planCounts },
      { count: totalRevenue },
      { data: apiCostsData },
      { data: manualCostsData },
      { count: promptsThisMonth },
      { count: promptsToday },
      { data: recentSignups },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('plan_tier'),
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('api_usage_logs')
        .select('estimated_cost_usd')
        .gte('created_at', firstOfMonth),
      supabase
        .from('manual_costs')
        .select('amount_usd')
        .eq('billing_period', currentMonthLabel),
      supabase
        .from('personal_library')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstOfMonth),
      supabase
        .from('personal_library')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayMidnight),
      supabase
        .from('profiles')
        .select('id, created_at, plan_tier')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('activity_logs')
        .select('id, user_id, action, created_at, details')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Aggregate free vs pro users
    const freeUsers = planCounts?.filter((p) => p.plan_tier === 'free').length ?? 0;
    const proUsers = planCounts?.filter((p) => p.plan_tier !== 'free').length ?? 0;

    // Sum API costs MTD
    const apiCostsMTD = apiCostsData?.reduce(
      (sum, row) => sum + (row.estimated_cost_usd ?? 0),
      0
    ) ?? 0;

    // Sum manual costs MTD
    const manualCostsMTD = manualCostsData?.reduce(
      (sum, row) => sum + (row.amount_usd ?? 0),
      0
    ) ?? 0;

    // Monthly trend: last 6 months, new users per month (single query instead of 6)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    const { data: trendProfiles } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', sixMonthsAgo);

    const monthlyTrend: { month: string; newUsers: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rangeStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const newUsers = (trendProfiles ?? []).filter((p) => {
        const created = new Date(p.created_at);
        return created >= rangeStart && created < rangeEnd;
      }).length;

      monthlyTrend.push({ month, newUsers });
    }

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      freeUsers,
      proUsers,
      totalRevenue: totalRevenue ?? 0,
      apiCostsMTD,
      manualCostsMTD,
      promptsThisMonth: promptsThisMonth ?? 0,
      promptsToday: promptsToday ?? 0,
      recentSignups: recentSignups ?? [],
      recentActivity: recentActivity ?? [],
      monthlyTrend,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[Admin Dashboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
