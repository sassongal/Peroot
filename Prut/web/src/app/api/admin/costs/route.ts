import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/costs
 *
 * Query params:
 *   from       ISO date string (defaults to 30 days ago)
 *   to         ISO date string (defaults to now)
 *   provider   optional provider filter
 *
 * Returns cost summary, breakdown by provider/model, top users by cost,
 * and a 12-month rolling cost trend.
 */
export async function GET(req: NextRequest) {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const from = searchParams.get('from') ?? defaultFrom;
    const to = searchParams.get('to') ?? now.toISOString();
    const provider = searchParams.get('provider');

    // Validate date params to prevent injection
    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}/.test(d);
    if (from && !isValidDate(from)) return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    if (to && !isValidDate(to)) return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });

    // Build base query for the selected window
    let baseQuery = supabase
      .from('api_usage_logs')
      .select('estimated_cost_usd, input_tokens, output_tokens, provider, model, user_id, created_at')
      .gte('created_at', from)
      .lte('created_at', to);

    if (provider) {
      baseQuery = baseQuery.eq('provider', provider);
    }

    const { data: logs, error: logsError } = await baseQuery;

    if (logsError) {
      logger.error('[Admin Costs] Logs query error:', logsError);
      return NextResponse.json({ error: 'Failed to fetch usage logs' }, { status: 500 });
    }

    const rows = logs ?? [];

    // --- Summary ---
    const totalCost = rows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);

    // Manual costs for the selected window's months
    const { data: manualRows } = await supabase
      .from('manual_costs')
      .select('amount_usd, billing_period')
      .gte('billing_period', from.slice(0, 7))
      .lte('billing_period', to.slice(0, 7));

    const manualCost = (manualRows ?? []).reduce((s, r) => s + (r.amount_usd ?? 0), 0);
    const promptCount = rows.length;
    const avgCostPerPrompt = promptCount > 0 ? totalCost / promptCount : 0;

    const summary = {
      totalCost: totalCost + manualCost,
      llmCost: totalCost,
      manualCost,
      avgCostPerPrompt,
    };

    // --- By provider / model (aggregated in JS) ---
    const providerMap = new Map<
      string,
      {
        provider: string;
        model: string;
        totalCost: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        requestCount: number;
      }
    >();

    for (const row of rows) {
      const key = `${row.provider ?? 'unknown'}::${row.model ?? 'unknown'}`;
      const existing = providerMap.get(key);
      if (existing) {
        existing.totalCost += row.estimated_cost_usd ?? 0;
        existing.totalInputTokens += row.input_tokens ?? 0;
        existing.totalOutputTokens += row.output_tokens ?? 0;
        existing.requestCount += 1;
      } else {
        providerMap.set(key, {
          provider: row.provider ?? 'unknown',
          model: row.model ?? 'unknown',
          totalCost: row.estimated_cost_usd ?? 0,
          totalInputTokens: row.input_tokens ?? 0,
          totalOutputTokens: row.output_tokens ?? 0,
          requestCount: 1,
        });
      }
    }

    const byProvider = Array.from(providerMap.values()).sort(
      (a, b) => b.totalCost - a.totalCost
    );

    // --- Top 10 users by cost ---
    const userMap = new Map<string, { user_id: string; totalCost: number; requestCount: number }>();

    for (const row of rows) {
      const uid = row.user_id ?? 'unknown';
      const existing = userMap.get(uid);
      if (existing) {
        existing.totalCost += row.estimated_cost_usd ?? 0;
        existing.requestCount += 1;
      } else {
        userMap.set(uid, {
          user_id: uid,
          totalCost: row.estimated_cost_usd ?? 0,
          requestCount: 1,
        });
      }
    }

    const byUser = Array.from(userMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    // --- 12-month rolling trend ---
    const monthly: { month: string; llmCost: number; manualCost: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rangeStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

      const { data: monthLogs } = await supabase
        .from('api_usage_logs')
        .select('estimated_cost_usd')
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd);

      const { data: monthManual } = await supabase
        .from('manual_costs')
        .select('amount_usd')
        .eq('billing_period', monthLabel);

      const llmCost = (monthLogs ?? []).reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
      const manualCostMonth = (monthManual ?? []).reduce((s, r) => s + (r.amount_usd ?? 0), 0);

      monthly.push({ month: monthLabel, llmCost, manualCost: manualCostMonth });
    }

    return NextResponse.json({ summary, byProvider, byUser, monthly });
  } catch (err) {
    logger.error('[Admin Costs] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
