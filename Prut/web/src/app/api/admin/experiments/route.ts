import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/experiments
 *
 * Hybrid experiments dashboard:
 *  - Queries activity_logs for feature usage and experiment-related events
 *  - Compares pro vs free user engagement segments
 *  - Returns feature adoption rates based on last 30 days of activity
 */
export const GET = withAdmin(async (req, supabase) => {
  try {
    const url = new URL(req.url);
    const rangeParam = parseInt(url.searchParams.get("range") ?? "30", 10);
    const periodDays = [7, 30, 90].includes(rangeParam) ? rangeParam : 30;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // ── 1. Total user count ──────────────────────────────────────────────────
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const totalUserCount = totalUsers ?? 1;

    // ── 2. Fetch all activity logs in last 30 days ───────────────────────────
    const { data: activityLogs, error: logsError } = await supabase
      .from("activity_logs")
      .select("user_id, action, entity_type, details, created_at")
      .gte("created_at", thirtyDaysAgo);

    if (logsError) {
      logger.error("[Admin Experiments] activity_logs query error:", logsError);
      return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }

    const logs = activityLogs ?? [];

    // ── 3. Feature adoption: group by action type, count distinct users ──────
    const actionUserMap = new Map<string, Set<string>>();

    for (const log of logs) {
      const action = (log.action as string) ?? "unknown";
      if (!actionUserMap.has(action)) {
        actionUserMap.set(action, new Set());
      }
      actionUserMap.get(action)!.add(log.user_id as string);
    }

    // Build feature adoption array
    const featureAdoption = Array.from(actionUserMap.entries())
      .map(([action, userSet]) => ({
        action,
        distinctUsers: userSet.size,
        adoptionRate: parseFloat(((userSet.size / totalUserCount) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.distinctUsers - a.distinctUsers)
      .slice(0, 20); // top 20 features

    // ── 4. Experiment / feature-flag specific events ─────────────────────────
    const experimentKeywords = ["experiment", "ab_test", "feature_flag", "variant"];
    const experimentEvents = logs.filter((log) => {
      const action = ((log.action as string) ?? "").toLowerCase();
      const detailsStr = JSON.stringify(log.details ?? "").toLowerCase();
      return experimentKeywords.some((kw) => action.includes(kw) || detailsStr.includes(kw));
    });

    const experimentActionMap = new Map<string, Set<string>>();
    for (const ev of experimentEvents) {
      const action = (ev.action as string) ?? "unknown";
      if (!experimentActionMap.has(action)) {
        experimentActionMap.set(action, new Set());
      }
      experimentActionMap.get(action)!.add(ev.user_id as string);
    }

    const experimentFeatures = Array.from(experimentActionMap.entries()).map(
      ([action, userSet]) => ({
        action,
        distinctUsers: userSet.size,
        adoptionRate: parseFloat(((userSet.size / totalUserCount) * 100).toFixed(1)),
      }),
    );

    // ── 5. Pro vs Free segment comparison ───────────────────────────────────
    const { data: profiles } = await supabase.from("profiles").select("id, plan_tier");

    const proUserIds = new Set(
      (profiles ?? [])
        .filter((p: { plan_tier: string | null }) => p.plan_tier && p.plan_tier !== "free")
        .map((p: { id: string }) => p.id),
    );
    const freeUserIds = new Set(
      (profiles ?? [])
        .filter((p: { plan_tier: string | null }) => !p.plan_tier || p.plan_tier === "free")
        .map((p: { id: string }) => p.id),
    );

    const proCount = proUserIds.size || 1;
    const freeCount = freeUserIds.size || 1;

    // Count actions for each segment
    let proActivityCount = 0;
    let freeActivityCount = 0;
    const proActionTypes = new Set<string>();
    const freeActionTypes = new Set<string>();

    for (const log of logs) {
      const uid = log.user_id as string;
      const action = log.action as string;
      if (proUserIds.has(uid)) {
        proActivityCount++;
        proActionTypes.add(action);
      } else if (freeUserIds.has(uid)) {
        freeActivityCount++;
        freeActionTypes.add(action);
      }
    }

    // Per-user averages
    const proAvgActivity = parseFloat((proActivityCount / proCount).toFixed(1));
    const freeAvgActivity = parseFloat((freeActivityCount / freeCount).toFixed(1));
    const segmentGap = parseFloat((proAvgActivity - freeAvgActivity).toFixed(1));

    // Per-feature breakdown by segment (top 10 features)
    const topActions = featureAdoption.slice(0, 10).map((f) => f.action);
    const segmentBreakdown = topActions.map((action) => {
      let proUsers = 0;
      let freeUsers = 0;
      const proSeen = new Set<string>();
      const freeSeen = new Set<string>();

      for (const log of logs) {
        if ((log.action as string) !== action) continue;
        const uid = log.user_id as string;
        if (proUserIds.has(uid) && !proSeen.has(uid)) {
          proUsers++;
          proSeen.add(uid);
        } else if (freeUserIds.has(uid) && !freeSeen.has(uid)) {
          freeUsers++;
          freeSeen.add(uid);
        }
      }

      return {
        action,
        proUsers,
        freeUsers,
        proRate: parseFloat(((proUsers / proCount) * 100).toFixed(1)),
        freeRate: parseFloat(((freeUsers / freeCount) * 100).toFixed(1)),
      };
    });

    // ── 6. Summary metrics ───────────────────────────────────────────────────
    const mostAdopted = featureAdoption[0] ?? null;
    const leastAdopted = featureAdoption[featureAdoption.length - 1] ?? null;

    const summary = {
      featuresTracked: featureAdoption.length,
      totalUsers: totalUserCount,
      proUsers: proCount,
      freeUsers: freeCount,
      mostAdopted: mostAdopted
        ? { action: mostAdopted.action, adoptionRate: mostAdopted.adoptionRate }
        : null,
      leastAdopted: leastAdopted
        ? { action: leastAdopted.action, adoptionRate: leastAdopted.adoptionRate }
        : null,
      segmentGap,
      proAvgActivity,
      freeAvgActivity,
    };

    // ── 7. PostHog availability flag ─────────────────────────────────────────
    const posthogConnected = !!(
      process.env.POSTHOG_PERSONAL_API_KEY && process.env.NEXT_PUBLIC_POSTHOG_KEY
    );

    return NextResponse.json({
      summary,
      featureAdoption,
      experimentFeatures,
      segmentBreakdown,
      posthogConnected,
      generatedAt: now.toISOString(),
      periodDays,
    });
  } catch (err) {
    logger.error("[Admin Experiments] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
