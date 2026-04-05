import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/** Daily baseline added to real count for social proof */
const DAILY_BASELINE = 340;

export async function GET() {
  try {
    const supabase = await createClient();

    // Count today's enhance events (UTC day)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("prompt_usage_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "enhance")
      .gte("created_at", todayStart.toISOString());

    if (error) {
      logger.warn("Failed to fetch today's stats", error);
      return new Response(JSON.stringify({ count: DAILY_BASELINE }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    return new Response(
      JSON.stringify({ count: (count ?? 0) + DAILY_BASELINE }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    logger.error("Stats today error:", e);
    return new Response(JSON.stringify({ count: DAILY_BASELINE }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  }
}
