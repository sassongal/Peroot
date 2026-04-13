import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
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
export const GET = withAdmin(async (_req, supabase, _user) => {
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
      apiCostsMTDResult,
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
        .order('created_at', { ascending: true })
        .limit(5000),

      // Total users for conversion rate
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      // Plan tier breakdown from profiles (include id, email for pro user matching + cohort/churn)
      supabase
        .from('profiles')
        .select('id, plan_tier, email, full_name, created_at, churned_at'),

      // API costs MTD grouped by user (for gross margin calculation)
      supabase
        .from('api_usage_logs')
        .select('user_id, estimated_cost_usd')
        .gte('created_at', startOfMonth)
        .limit(50000),

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

    // ── Churn rate (churned / (active + churned)) ──────────────────────────
    const churnDenominator = activeSubs + churned;
    const churnRate = churnDenominator > 0 ? (churned / churnDenominator) * 100 : 0;

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
      is_manual: false as boolean,
    }));

    // ── Also find pro users from profiles who might not have subscription records ──
    const proProfiles = profiles.filter(
      (p) => (p.plan_tier ?? 'free').toLowerCase() !== 'free'
    );
    const subUserIds = new Set(allSubs.map((s) => s.user_id));

    // Add pro users without subscription records to the subscriber list
    for (const p of proProfiles) {
      if (!subUserIds.has(p.id)) {
        subscribers.push({
          id: `manual-${p.id}`,
          user_id: p.id,
          status: 'active',
          plan_name: (p.plan_tier as string) || 'pro',
          customer_email: (p.email as string) || '',
          customer_name: (p.full_name as string) || '',
          renews_at: null,
          ends_at: null,
          created_at: p.created_at as string,
          updated_at: p.created_at as string,
          is_manual: true,
        });
      }
    }

    // Recalculate activeSubs to also count profiles with pro tier but no subscription record
    const effectiveActiveSubs = Math.max(activeSubs, proProfiles.length);
    const effectiveMrr = effectiveActiveSubs * PRO_PRICE_ILS;

    // ── Unit Economics ─────────────────────────────────────────────────────
    // Build per-user cost map from api_usage_logs this month
    const userCostMap = new Map<string, number>();
    for (const r of apiCostsMTDResult.data ?? []) {
      if (r.user_id) {
        userCostMap.set(r.user_id, (userCostMap.get(r.user_id) ?? 0) + (r.estimated_cost_usd ?? 0));
      }
    }

    // Aggregate costs by tier
    const tierCosts: Record<string, number> = { free: 0, pro: 0, premium: 0 };
    for (const p of profiles) {
      const tier = ((p.plan_tier as string) ?? 'free').toLowerCase();
      const cost = userCostMap.get(p.id as string) ?? 0;
      if (tier in tierCosts) tierCosts[tier] += cost;
      else tierCosts['free'] += cost;
    }

    // Gross margin (Pro tier, MTD)
    const proRevenueMTD = planCounts['pro'] * PRO_PRICE_ILS;
    const proMargin = proRevenueMTD - tierCosts['pro'];
    const proMarginPct = proRevenueMTD > 0 ? (proMargin / proRevenueMTD) * 100 : 0;

    const costPerProUser = planCounts['pro'] > 0 ? tierCosts['pro'] / planCounts['pro'] : 0;
    const costPerFreeUser = planCounts['free'] > 0 ? tierCosts['free'] / planCounts['free'] : 0;

    // LTV: ARPU / monthly_churn_rate (capped at 24 months)
    const churnedProfileCount = profiles.filter(p => p.churned_at).length;
    const everProCount = profiles.filter(p => ((p.plan_tier as string) ?? 'free') !== 'free' || p.churned_at).length;
    const monthlyChurnRate = everProCount > 0 ? churnedProfileCount / everProCount : 0;
    const ltv = monthlyChurnRate > 0 ? PRO_PRICE_ILS / monthlyChurnRate : PRO_PRICE_ILS * 24;

    // Cohort MRR: last 6 months of signups × months active
    const cohortMrr: { cohort: string; months: { month: number; activeCount: number; mrr: number }[] }[] = [];
    for (let i = 5; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const cohortKey = `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, '0')}`;

      const cohortProfiles = profiles.filter(p => {
        const ca = new Date(p.created_at as string);
        return ca >= cohortStart && ca <= cohortEnd;
      });

      const monthsData: { month: number; activeCount: number; mrr: number }[] = [];
      for (let m = 0; m <= 5 - i; m++) {
        const checkDate = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m + 1, 1);
        if (checkDate > now) break;

        const activeCount = cohortProfiles.filter(p => {
          const isPro = ((p.plan_tier as string) ?? 'free') !== 'free';
          const stillActive = !p.churned_at || new Date(p.churned_at as string) > checkDate;
          return isPro && stillActive;
        }).length;

        monthsData.push({ month: m, activeCount, mrr: parseFloat((activeCount * PRO_PRICE_ILS).toFixed(2)) });
      }
      cohortMrr.push({ cohort: cohortKey, months: monthsData });
    }

    const unitEconomics = {
      grossMarginByTier: {
        pro: {
          revenue: parseFloat(proRevenueMTD.toFixed(2)),
          cost: parseFloat(tierCosts['pro'].toFixed(4)),
          margin: parseFloat(proMargin.toFixed(2)),
          marginPct: parseFloat(proMarginPct.toFixed(1)),
        },
        free: {
          revenue: 0,
          cost: parseFloat(tierCosts['free'].toFixed(4)),
          margin: parseFloat((-tierCosts['free']).toFixed(2)),
        },
      },
      costPerUserByTier: {
        pro: parseFloat(costPerProUser.toFixed(4)),
        free: parseFloat(costPerFreeUser.toFixed(4)),
      },
      ltv: {
        arpu: PRO_PRICE_ILS,
        churnRate: parseFloat((monthlyChurnRate * 100).toFixed(2)),
        ltv: parseFloat(ltv.toFixed(2)),
      },
      cohortMrr,
    };

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
        proUsersWithoutSub: Math.max(0, proProfiles.length - subUserIds.size),
      },
      monthly: months,
      planBreakdown: planCounts,
      subscribers,
      recentEvents,
      unitEconomics,
      timestamp: now.toISOString(),
    });
});
