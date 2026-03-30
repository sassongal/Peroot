import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

const PRO_PRICE_ILS = 3.99;

/**
 * GET /api/admin/revenue
 *
 * Returns:
 *   - KPI summary: MRR, active subs, churn, new this month, ARPU, conversion rate
 *   - Monthly subscription growth (last 6 months)
 *   - Plan-tier breakdown (free / pro / premium counts)
 *   - Recent subscription events from activity_logs
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // ── Parallel queries ────────────────────────────────────────────────────
    const [
      activeSubsResult,
      newThisMonthResult,
      churnedResult,
      allSubsResult,
      totalUsersResult,
      planBreakdownResult,
      recentEventsResult,
    ] = await Promise.all([
      // Active subscriptions
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // New subscriptions this month
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),

      // Churned (cancelled or expired)
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['cancelled', 'expired']),

      // All subscriptions with created_at for monthly grouping
      supabase
        .from('subscriptions')
        .select('id, user_id, created_at, status, plan_name, customer_email, customer_name, renews_at, ends_at, updated_at')
        .order('created_at', { ascending: true }),

      // Total users for conversion rate
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      // Plan tier breakdown from profiles
      supabase
        .from('profiles')
        .select('plan_tier'),

      // Recent subscription events from activity_logs
      supabase
        .from('activity_logs')
        .select('id, user_id, action, details, created_at')
        .or('action.ilike.%subscription%,action.ilike.%upgrade%,action.ilike.%downgrade%')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (activeSubsResult.error) {
      logger.error('[Admin Revenue] Active subs query error:', activeSubsResult.error);
    }

    const activeSubs = activeSubsResult.count ?? 0;
    const newThisMonth = newThisMonthResult.count ?? 0;
    const churned = churnedResult.count ?? 0;
    const totalUsers = totalUsersResult.count ?? 0;

    // ── MRR calculation (active subs × price) ─────────────────────────────
    const mrr = activeSubs * PRO_PRICE_ILS;

    // ── Churn rate (churned / (active + churned)) ──────────────────────────
    const churnDenominator = activeSubs + churned;
    const churnRate = churnDenominator > 0 ? (churned / churnDenominator) * 100 : 0;

    // ── Conversion rate (active pro / total users) ─────────────────────────
    const conversionRate = totalUsers > 0 ? (activeSubs / totalUsers) * 100 : 0;

    // ── ARPU ───────────────────────────────────────────────────────────────
    const arpu = totalUsers > 0 ? mrr / totalUsers : 0;

    // ── Monthly growth - last 6 months ─────────────────────────────────────
    const allSubs = allSubsResult.data ?? [];
    const months: { month: string; label: string; newSubs: number; activeSubs: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const newInMonth = allSubs.filter(
        (s) => s.created_at >= monthStart && s.created_at <= monthEnd
      ).length;

      const activeUpToMonth = allSubs.filter(
        (s) => s.created_at <= monthEnd && s.status === 'active'
      ).length;

      months.push({ month: monthKey, label, newSubs: newInMonth, activeSubs: activeUpToMonth });
    }

    // ── Plan tier breakdown ────────────────────────────────────────────────
    const profiles = planBreakdownResult.data ?? [];
    const planCounts: Record<string, number> = { free: 0, pro: 0, premium: 0 };
    for (const p of profiles) {
      const tier = (p.plan_tier ?? 'free').toLowerCase();
      if (tier in planCounts) {
        planCounts[tier]++;
      } else {
        planCounts['free']++;
      }
    }

    // ── Recent events ──────────────────────────────────────────────────────
    const recentEvents = (recentEventsResult.data ?? []).map((e) => ({
      id: e.id,
      user_id: e.user_id,
      action: e.action,
      details: e.details,
      created_at: e.created_at,
    }));

    // ── Subscriber list (full details for admin) ───────────────────────────
    const subscribers = allSubs.map((s) => ({
      id: s.id,
      user_id: s.user_id,
      status: s.status,
      plan_name: s.plan_name,
      customer_email: s.customer_email,
      customer_name: s.customer_name,
      renews_at: s.renews_at,
      ends_at: s.ends_at,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    // ── Also find pro users from profiles who might not have subscription records ──
    const proProfiles = profiles.filter(
      (p) => (p.plan_tier ?? 'free').toLowerCase() !== 'free'
    );
    const subUserIds = new Set(allSubs.map((s) => s.user_id));

    // Recalculate activeSubs to also count profiles with pro tier but no subscription record
    const effectiveActiveSubs = Math.max(activeSubs, proProfiles.length);
    const effectiveMrr = effectiveActiveSubs * PRO_PRICE_ILS;

    return NextResponse.json({
      kpi: {
        mrr: effectiveMrr,
        activeSubs: effectiveActiveSubs,
        newThisMonth,
        churned,
        churnRate: parseFloat(churnRate.toFixed(2)),
        conversionRate: totalUsers > 0 ? parseFloat(((effectiveActiveSubs / totalUsers) * 100).toFixed(2)) : 0,
        arpu: totalUsers > 0 ? parseFloat((effectiveMrr / totalUsers).toFixed(2)) : 0,
        totalUsers,
        proUsersWithoutSub: proProfiles.length - subUserIds.size,
      },
      monthly: months,
      planBreakdown: planCounts,
      subscribers,
      recentEvents,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    logger.error('[Admin Revenue] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
