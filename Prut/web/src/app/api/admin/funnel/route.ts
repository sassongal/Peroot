import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const CACHE_KEY_PREFIX = "admin:funnel:v1:";
const CACHE_TTL = 300; // 5 minutes

export interface FunnelStage {
  key: string;
  label: string;
  labelHe: string;
  count: number;
  color: string;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  timeRange: string;
  generatedAt: string;
}

function getStartDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null; // all time
  }
}

export const GET = withAdmin(async (req) => {
  const supabase = createServiceClient();
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "all";
    const startDate = getStartDate(range);

    const cacheKey = `${CACHE_KEY_PREFIX}${range}`;
    try {
      const cached = await redis.get<FunnelResponse>(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch (err) {
      logger.warn("[Admin Funnel] Redis cache read failed:", err);
    }

    // ── Stage 1: Signups + cohort user IDs (parallel) ──────────────────────────
    // When filtering by time range, we need the cohort of user IDs so downstream
    // stages stay cohort-consistent. Signup count is the same cohort size — we
    // derive it from the cohort list when filtered, or a head:true count otherwise.
    let signupCount: number;
    let cohortUserIds: string[] | null = null;

    if (startDate) {
      // Cap cohort size — both to lift Supabase's silent 1000-row default and
      // to keep the downstream `.in(user_id, cohort)` URL length bounded
      // (gateway URI limits start biting ~10k UUIDs).
      const COHORT_CAP = 50000;
      const { data: cohortProfiles, error: cohortErr } = await supabase
        .from("profiles")
        .select("id")
        .gte("created_at", startDate.toISOString())
        .limit(COHORT_CAP);
      if (cohortErr) logger.error("[Admin Funnel] Cohort query error:", cohortErr);
      cohortUserIds = (cohortProfiles ?? []).map((p: { id: string }) => p.id);
      signupCount = cohortUserIds.length;
    } else {
      const { count, error: signupError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (signupError) logger.error("[Admin Funnel] Signup query error:", signupError);
      signupCount = count ?? 0;
    }

    // ── Stages 2, 3, 4 run in parallel once cohort is known ────────────────────
    const emptyCohort = cohortUserIds !== null && cohortUserIds.length === 0;

    // Raise the per-query row cap so the distinct-user sets below don't
    // silently top out at Supabase's 1000-row default on a growing product.
    const ROW_CAP = 200000;

    const firstPromptPromise = emptyCohort
      ? Promise.resolve({ data: [] as Array<{ user_id: string }> })
      : cohortUserIds !== null
        ? supabase
            .from("personal_library")
            .select("user_id")
            .in("user_id", cohortUserIds)
            .limit(ROW_CAP)
        : supabase.from("personal_library").select("user_id").limit(ROW_CAP);

    const enhancePromise = emptyCohort
      ? Promise.resolve({ data: [] as Array<{ user_id: string }> })
      : cohortUserIds !== null
        ? supabase
            .from("activity_logs")
            .select("user_id")
            .in("action", ["Prmpt Enhance", "Prmpt Refine"])
            .in("user_id", cohortUserIds)
            .limit(ROW_CAP)
        : supabase
            .from("activity_logs")
            .select("user_id")
            .in("action", ["Prmpt Enhance", "Prmpt Refine"])
            .limit(ROW_CAP);

    const proPromise = emptyCohort
      ? Promise.resolve({ count: 0 })
      : cohortUserIds !== null
        ? supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .neq("plan_tier", "free")
            .in("id", cohortUserIds)
        : supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .neq("plan_tier", "free");

    const [firstPromptRes, enhanceRes, proRes] = await Promise.all([
      firstPromptPromise,
      enhancePromise,
      proPromise,
    ]);

    const firstPromptCount = new Set(
      (firstPromptRes.data ?? []).map((r: { user_id: string }) => r.user_id),
    ).size;
    const enhanceCount = new Set((enhanceRes.data ?? []).map((r: { user_id: string }) => r.user_id))
      .size;
    const proCount = proRes.count ?? 0;

    const stages: FunnelStage[] = [
      {
        key: "signup",
        label: "Signed Up",
        labelHe: "נרשמו",
        count: signupCount ?? 0,
        color: "blue",
      },
      {
        key: "first_prompt",
        label: "First Prompt",
        labelHe: "פרומפט ראשון",
        count: firstPromptCount,
        color: "indigo",
      },
      {
        key: "ai_enhance",
        label: "Used AI Enhance",
        labelHe: "השתמשו ב-AI Enhance",
        count: enhanceCount,
        color: "purple",
      },
      {
        key: "became_pro",
        label: "Became Pro",
        labelHe: "שדרגו לפרו",
        count: proCount,
        color: "emerald",
      },
    ];

    logger.info("[Admin Funnel] Query complete", {
      range,
      stages: stages.map((s) => ({ key: s.key, count: s.count })),
    });

    const payload: FunnelResponse = {
      stages,
      timeRange: range,
      generatedAt: new Date().toISOString(),
    };

    try {
      await redis.set(cacheKey, payload, { ex: CACHE_TTL });
    } catch (err) {
      logger.warn("[Admin Funnel] Redis cache write failed:", err);
    }

    return NextResponse.json(payload);
  } catch (err) {
    logger.error("[Admin Funnel] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
