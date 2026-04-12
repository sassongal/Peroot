import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/engines
 *
 * Returns all prompt engines and aggregated api_usage_logs metrics.
 */
export const GET = withAdmin(async (_req, supabase, _user) => {
    // Fetch engines + usage logs in parallel
    const [{ data: engines, error: enginesError }, { data: usageLogs }] =
      await Promise.all([
        supabase.from("prompt_engines").select("*").order("mode"),
        supabase
          .from("api_usage_logs")
          .select(
            "engine_mode, duration_ms, input_tokens, output_tokens, created_at"
          ),
      ]);

    if (enginesError) {
      logger.error("[admin/engines] DB error:", enginesError);
      return NextResponse.json(
        { error: "Failed to load engines" },
        { status: 500 }
      );
    }

    // Compute per-engine metrics
    const engineMetrics: Record<
      string,
      { avgLatencyMs: number; requestCount: number }
    > = {};
    let computeLoadPct = 0;
    let tokenVelocityPct = 0;

    if (usageLogs && usageLogs.length > 0) {
      const byMode: Record<string, { totalMs: number; count: number }> = {};
      for (const row of usageLogs) {
        const mode = row.engine_mode || "unknown";
        if (!byMode[mode]) byMode[mode] = { totalMs: 0, count: 0 };
        byMode[mode].count++;
        byMode[mode].totalMs += row.duration_ms ?? 0;
      }

      for (const [mode, { totalMs, count }] of Object.entries(byMode)) {
        engineMetrics[mode] = {
          avgLatencyMs: count > 0 ? Math.round(totalMs / count) : 0,
          requestCount: count,
        };
      }

      // Compute Load: requests in last hour / 100 capacity, capped at 100
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recentCount = usageLogs.filter(
        (r) => r.created_at >= oneHourAgo
      ).length;
      computeLoadPct = Math.min(Math.round((recentCount / 100) * 100), 100);

      // Token Velocity: avg total tokens / 4000 max, capped at 100
      const totalTokens = usageLogs.reduce(
        (sum, r) => sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
        0
      );
      const avgTokens = totalTokens / usageLogs.length;
      tokenVelocityPct = Math.min(Math.round((avgTokens / 4000) * 100), 100);
    }

    return NextResponse.json({
      engines: engines ?? [],
      engineMetrics,
      pipeline: { computeLoadPct, tokenVelocityPct },
    });
});
