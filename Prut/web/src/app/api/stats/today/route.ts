import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Deterministic daily baseline: seeded from date so it's consistent
 * across requests but different each day. Range: 120–180.
 */
function getDailyBaseline(): number {
  const now = getIsraelDay();
  // Simple hash from date string → number in [120, 180]
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return 120 + (seed % 61); // 0-60 range → 120-180
}

/** Get current date in Israel timezone, with day starting at 06:00 */
function getIsraelDay(): Date {
  // Israel is UTC+2 (winter) or UTC+3 (summer). Use Intl to get the real offset.
  const israelNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  // If before 6 AM, count as previous day
  if (israelNow.getHours() < 6) {
    israelNow.setDate(israelNow.getDate() - 1);
  }
  return israelNow;
}

/** Get start of "today" (6:00 AM Israel time) as UTC ISO string for DB query */
function getTodayResetUTC(): string {
  const israelDay = getIsraelDay();
  // Set to 6:00 AM on that day in Israel time
  israelDay.setHours(6, 0, 0, 0);
  // More reliable: compute offset manually
  const israelOffset = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
  const israelDate = new Date(israelOffset);
  const utcDate = new Date();
  const offsetMs = israelDate.getTime() - utcDate.getTime();
  // 6 AM Israel = 6:00 - offset in UTC
  const resetIsrael = new Date(israelDay);
  resetIsrael.setHours(6, 0, 0, 0);
  const resetUTC = new Date(resetIsrael.getTime() - offsetMs);
  return resetUTC.toISOString();
}

export async function GET() {
  try {
    const supabase = await createClient();
    const baseline = getDailyBaseline();

    // Count enhances since 6 AM Israel time today
    const todayStart = getTodayResetUTC();

    const { count, error } = await supabase
      .from("prompt_usage_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "enhance")
      .gte("created_at", todayStart);

    if (error) {
      logger.warn("Failed to fetch today's stats", error);
      return Response.json(
        { count: baseline },
        { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=10" } }
      );
    }

    return Response.json(
      { count: (count ?? 0) + baseline },
      { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=10" } }
    );
  } catch (e) {
    logger.error("Stats today error:", e);
    return Response.json(
      { count: getDailyBaseline() },
      { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=10" } }
    );
  }
}
