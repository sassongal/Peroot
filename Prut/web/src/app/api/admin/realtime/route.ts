import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/realtime
 *
 * Returns real-time activity data:
 *  - activeUsers: users who triggered an event in the last 5 minutes
 *  - activeSessions: count of distinct users in the last 5 minutes
 *  - feed: last 50 activity events
 *  - activePages: most common action types in the last hour
 *  - heatmap: activity count per hour for the last 24 hours
 *  - topUsers: most active users in the last 30 minutes
 *  - counters: { activeNow, eventsPerMin, pagesLastHour, apiCallsLastHour }
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  try {
    const now = new Date();
    const minus5m = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const minus30m = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const minus1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const minus24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // ── Active users in last 5 minutes ─────────────────────────────────────
    const { data: recentActivity5m } = await supabase
      .from("activity_logs")
      .select("user_id")
      .gte("created_at", minus5m);

    const activeUserIds = [
      ...new Set((recentActivity5m ?? []).map((r) => r.user_id).filter(Boolean)),
    ];
    const activeSessions = activeUserIds.length;

    // ── Live feed: last 200 events ─────────────────────────────────────────
    const { data: feedRows, error: feedError } = await supabase
      .from("activity_logs")
      .select("id, user_id, action, entity_type, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (feedError) {
      logger.error("[Admin Realtime] Feed query error:", feedError);
    }

    const feed = (feedRows ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id ? String(row.user_id).slice(0, 8) + "…" : "anon",
      action: row.action ?? "unknown",
      entityType: row.entity_type ?? null,
      details: row.details
        ? typeof row.details === "object"
          ? Object.entries(row.details as Record<string, unknown>)
              .slice(0, 2)
              .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
              .join(", ")
          : String(row.details).slice(0, 60)
        : null,
      createdAt: row.created_at,
    }));

    // ── Active pages: most common actions in last hour ──────────────────────
    const { data: hourActivity } = await supabase
      .from("activity_logs")
      .select("action")
      .gte("created_at", minus1h);

    const actionCounts = new Map<string, number>();
    for (const row of hourActivity ?? []) {
      if (row.action) {
        actionCounts.set(row.action, (actionCounts.get(row.action) ?? 0) + 1);
      }
    }
    const activePages = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([action, count]) => ({ action, count }));

    // ── Heatmap: activity count per hour for last 24 hours ─────────────────
    const { data: heatmapRows } = await supabase
      .from("activity_logs")
      .select("created_at")
      .gte("created_at", minus24h);

    const heatmap: { hour: number; label: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const slotStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
      const slotEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
      const count = (heatmapRows ?? []).filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= slotStart.getTime() && t < slotEnd.getTime();
      }).length;
      heatmap.push({
        hour: slotStart.getUTCHours(),
        label: `${String(slotStart.getHours()).padStart(2, "0")}:00`,
        count,
      });
    }

    // ── Top active users in last 30 minutes ────────────────────────────────
    const { data: activity30m } = await supabase
      .from("activity_logs")
      .select("user_id, action")
      .gte("created_at", minus30m);

    const userActivity = new Map<string, number>();
    for (const row of activity30m ?? []) {
      if (row.user_id) {
        userActivity.set(row.user_id, (userActivity.get(row.user_id) ?? 0) + 1);
      }
    }
    const topUserIds = Array.from(userActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    const { data: topProfiles } =
      topUserIds.length > 0
        ? await supabase.from("profiles").select("id, email, full_name").in("id", topUserIds)
        : { data: [] };

    const profileMap = new Map((topProfiles ?? []).map((p) => [p.id, p]));

    const topUsers = topUserIds.map((userId) => {
      const profile = profileMap.get(userId);
      return {
        userId: userId.slice(0, 8) + "…",
        email: profile?.email ?? null,
        displayName: profile?.full_name || profile?.email || userId.slice(0, 8) + "…",
        eventCount: userActivity.get(userId) ?? 0,
      };
    });

    // ── Counters ────────────────────────────────────────────────────────────
    // Events/min: events in last 5 minutes / 5
    const eventsLast5m = recentActivity5m?.length ?? 0;
    const eventsPerMin = Math.round((eventsLast5m / 5) * 10) / 10;

    // Pages viewed last hour: count of non-API actions
    const pagesLastHour = (hourActivity ?? []).filter(
      (r) => r.action && !r.action.toLowerCase().includes("api"),
    ).length;

    // API calls last hour: from api_usage_logs
    const { count: apiCallsLastHour } = await supabase
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", minus1h);

    const counters = {
      activeNow: activeSessions,
      eventsPerMin,
      pagesLastHour,
      apiCallsLastHour: apiCallsLastHour ?? 0,
    };

    return NextResponse.json({
      activeSessions,
      activeUserIds,
      feed,
      activePages,
      heatmap,
      topUsers,
      counters,
      fetchedAt: now.toISOString(),
    });
  } catch (err) {
    logger.error("[Admin Realtime] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
