import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const CACHE_KEY_PREFIX = "admin:analytics:";
const CACHE_TTL = 300; // 5 minutes

interface CachedAnalytics {
  engineBreakdown: Array<{ mode: string; count: number }>;
  dau: number;
  wau: number;
  mau: number;
  generatedAt: string;
}

/**
 * GET /api/admin/analytics?range=7|30|90
 *
 * Returns:
 *  - engineBreakdown: counts by capability_mode from history table
 *  - dau / wau / mau: distinct active users (today / last 7d / last 30d) from activity_logs
 *
 * Cached in Redis for 5 minutes to reduce Supabase load.
 */
export const GET = withAdmin(async (req, supabase) => {
  const url = new URL(req.url);
  const range = parseInt(url.searchParams.get("range") ?? "30", 10);
  const rangeKey = [7, 30, 90].includes(range) ? range : 30;
  const cacheKey = `${CACHE_KEY_PREFIX}${rangeKey}`;

  try {
    const cached = await redis.get<CachedAnalytics>(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch (err) {
    logger.warn("[Admin Analytics] Redis cache read failed:", err);
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const minus7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const minus30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const engineWindow = new Date(now.getTime() - rangeKey * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      { data: engineRows, error: engineErr },
      { data: dauRows, error: dauErr },
      { data: wauRows, error: wauErr },
      { data: mauRows, error: mauErr },
    ] = await Promise.all([
      supabase.from("history").select("capability_mode").gte("created_at", engineWindow),
      supabase.from("activity_logs").select("user_id").gte("created_at", startOfToday),
      supabase.from("activity_logs").select("user_id").gte("created_at", minus7d),
      supabase.from("activity_logs").select("user_id").gte("created_at", minus30d),
    ]);

    if (engineErr) logger.warn("[Admin Analytics] engine query:", engineErr);
    if (dauErr) logger.warn("[Admin Analytics] dau query:", dauErr);
    if (wauErr) logger.warn("[Admin Analytics] wau query:", wauErr);
    if (mauErr) logger.warn("[Admin Analytics] mau query:", mauErr);

    const modeCounts: Record<string, number> = {};
    for (const row of engineRows ?? []) {
      const mode = (row.capability_mode as string) || "STANDARD";
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    }
    const engineBreakdown = Object.entries(modeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([mode, count]) => ({ mode, count }));

    const countDistinct = (rows: { user_id: string | null }[] | null) =>
      new Set((rows ?? []).map((r) => r.user_id).filter(Boolean)).size;

    const payload: CachedAnalytics = {
      engineBreakdown,
      dau: countDistinct(dauRows),
      wau: countDistinct(wauRows),
      mau: countDistinct(mauRows),
      generatedAt: now.toISOString(),
    };

    try {
      await redis.set(cacheKey, payload, { ex: CACHE_TTL });
    } catch (err) {
      logger.warn("[Admin Analytics] Redis cache write failed:", err);
    }

    return NextResponse.json(payload);
  } catch (err) {
    logger.error("[Admin Analytics] Query error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
