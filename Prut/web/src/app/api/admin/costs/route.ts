import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const CACHE_KEY_PREFIX = "admin:costs:v1:";
const CACHE_TTL = 300; // 5 minutes

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
export const GET = withAdmin(async (req) => {
  const supabase = createServiceClient();
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const from = searchParams.get("from") ?? defaultFrom;
    const to = searchParams.get("to") ?? now.toISOString();
    const provider = searchParams.get("provider");

    // Validate date params to prevent injection
    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}/.test(d);
    if (from && !isValidDate(from))
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    if (to && !isValidDate(to))
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });

    const cacheKey = `${CACHE_KEY_PREFIX}${from}:${to}:${provider ?? "all"}`;
    try {
      const cached = await redis.get<Record<string, unknown>>(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch (err) {
      logger.warn("[Admin Costs] Redis cache read failed:", err);
    }

    // Cap the result set. api_usage_logs grows unbounded; the 90-day retention
    // cron only trims >30-day rows, so an admin opening this page with the
    // default 30-day window can pull every row. Hard cap prevents OOM; when
    // the cap is hit we surface a `truncated` flag so the UI can warn.
    const ROW_LIMIT = 50_000;
    let baseQuery = supabase
      .from("api_usage_logs")
      .select(
        "estimated_cost_usd, input_tokens, output_tokens, provider, model, user_id, created_at",
      )
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT);

    if (provider) {
      baseQuery = baseQuery.eq("provider", provider);
    }

    const { data: logs, error: logsError } = await baseQuery;

    if (logsError) {
      logger.error("[Admin Costs] Logs query error:", logsError);
      return NextResponse.json({ error: "Failed to fetch usage logs" }, { status: 500 });
    }

    const rows = logs ?? [];
    const truncated = rows.length >= ROW_LIMIT;
    if (truncated) {
      logger.warn(
        `[Admin Costs] Query hit ROW_LIMIT (${ROW_LIMIT}); results are partial for range ${from}..${to}`,
      );
    }

    // --- Summary ---
    const totalCost = rows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);

    // Manual costs for the selected window's months
    const { data: manualRows } = await supabase
      .from("manual_costs")
      .select("amount_usd, billing_period")
      .gte("billing_period", from.slice(0, 7))
      .lte("billing_period", to.slice(0, 7));

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
      const key = `${row.provider ?? "unknown"}::${row.model ?? "unknown"}`;
      const existing = providerMap.get(key);
      if (existing) {
        existing.totalCost += row.estimated_cost_usd ?? 0;
        existing.totalInputTokens += row.input_tokens ?? 0;
        existing.totalOutputTokens += row.output_tokens ?? 0;
        existing.requestCount += 1;
      } else {
        providerMap.set(key, {
          provider: row.provider ?? "unknown",
          model: row.model ?? "unknown",
          totalCost: row.estimated_cost_usd ?? 0,
          totalInputTokens: row.input_tokens ?? 0,
          totalOutputTokens: row.output_tokens ?? 0,
          requestCount: 1,
        });
      }
    }

    const byProvider = Array.from(providerMap.values()).sort((a, b) => b.totalCost - a.totalCost);

    // --- Top 10 users by cost ---
    const userMap = new Map<string, { user_id: string; totalCost: number; requestCount: number }>();

    for (const row of rows) {
      const uid = row.user_id ?? "unknown";
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

    const topUserIds = Array.from(userMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map((u) => u.user_id)
      .filter((id) => id !== "unknown");

    const { data: topProfiles } =
      topUserIds.length > 0
        ? await supabase.from("profiles").select("id, email, full_name").in("id", topUserIds)
        : { data: [] };

    const profileEmailMap = new Map(
      (topProfiles ?? []).map((p) => [p.id, p.email ?? p.full_name ?? null]),
    );

    const byUser = Array.from(userMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map((u) => ({ ...u, email: profileEmailMap.get(u.user_id) ?? null }));

    // --- 12-month rolling trend (2 parallel queries + JS bucketing,
    // replacing the old 24-sequential-query loop) ---
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
    const trendEndLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const trendStartLabel = trendStart.slice(0, 7);

    const TREND_ROW_LIMIT = 200_000;
    const [{ data: trendLogs }, { data: trendManual }] = await Promise.all([
      supabase
        .from("api_usage_logs")
        .select("estimated_cost_usd, created_at")
        .gte("created_at", trendStart)
        .order("created_at", { ascending: false })
        .limit(TREND_ROW_LIMIT),
      supabase
        .from("manual_costs")
        .select("amount_usd, billing_period")
        .gte("billing_period", trendStartLabel)
        .lte("billing_period", trendEndLabel),
    ]);

    const llmByMonth = new Map<string, number>();
    for (const r of trendLogs ?? []) {
      const month = (r.created_at as string)?.slice(0, 7);
      if (!month) continue;
      llmByMonth.set(month, (llmByMonth.get(month) ?? 0) + (r.estimated_cost_usd ?? 0));
    }

    const manualByMonth = new Map<string, number>();
    for (const r of trendManual ?? []) {
      const month = (r.billing_period as string) ?? "";
      if (!month) continue;
      manualByMonth.set(month, (manualByMonth.get(month) ?? 0) + (r.amount_usd ?? 0));
    }

    const monthly: { month: string; llmCost: number; manualCost: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly.push({
        month: monthLabel,
        llmCost: llmByMonth.get(monthLabel) ?? 0,
        manualCost: manualByMonth.get(monthLabel) ?? 0,
      });
    }

    const payload = { summary, byProvider, byUser, monthly, truncated };

    try {
      await redis.set(cacheKey, payload, { ex: CACHE_TTL });
    } catch (err) {
      logger.warn("[Admin Costs] Redis cache write failed:", err);
    }

    return NextResponse.json(payload);
  } catch (err) {
    logger.error("[Admin Costs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
