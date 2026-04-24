import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/scoring-stats
 *
 * Aggregates from history table for the scoring analytics dashboard:
 * - Total enhancements by capability_mode
 * - Enhancements by source (web/extension/api)
 * - Enhancements by input_source (text/file/url/image)
 * - Recent prompts sample (for client-side scoring)
 * - Daily enhancement counts (last 30 days)
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: allRows }, { data: recentSample }, { data: dailyRows }, { count: totalCount }] =
    await Promise.all([
      // Single query for all grouping columns — bounded to last 90 days to keep this fast as the table grows
      supabase
        .from("history")
        .select("capability_mode, source, input_source")
        .gte("created_at", ninetyDaysAgo),

      // Recent 200 prompts for client-side scoring sample
      supabase
        .from("history")
        .select("original, capability_mode")
        .order("created_at", { ascending: false })
        .limit(200),

      // Daily counts last 30 days
      supabase
        .from("history")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true }),

      // Total — estimated (reltuples); unfiltered count on append-only table.
      supabase.from("history").select("*", { count: "estimated", head: true }),
    ]);

  // Count by column helper
  function countBy<T extends Record<string, unknown>>(rows: T[] | null, col: keyof T) {
    const counts: Record<string, number> = {};
    if (!rows) return [];
    for (const row of rows) {
      const val = String(row[col] ?? "unknown");
      counts[val] = (counts[val] || 0) + 1;
    }
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }

  // Aggregate daily counts
  const daily: Record<string, number> = {};
  if (dailyRows) {
    for (const row of dailyRows) {
      const day = (row.created_at as string)?.slice(0, 10);
      if (day) daily[day] = (daily[day] || 0) + 1;
    }
  }

  return NextResponse.json({
    total: totalCount ?? 0,
    byMode: countBy(allRows, "capability_mode"),
    bySource: countBy(allRows, "source"),
    byInputSource: countBy(allRows, "input_source"),
    recentSample: recentSample ?? [],
    daily: Object.entries(daily).map(([date, count]) => ({ date, count })),
  });
});
