import { NextResponse } from "next/server";
import { z } from "zod";
import { logAdminAction, parseAdminInput } from "@/lib/admin/admin-security";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { adminAdjustCredits } from "@/lib/services/credit-service";
import { logger } from "@/lib/logger";

const adminActionSchema = z.object({
  action: z.enum([
    "change_tier",
    "grant_credits",
    "revoke_credits",
    "ban",
    "unban",
    "grant_admin",
    "revoke_admin",
  ]),
  value: z.union([z.string(), z.number()]).optional(),
});

/**
 * GET /api/admin/users/[id]
 *
 * Returns full user details including profile, role, subscription, stats,
 * style personality, achievement count, prompt count, total API cost,
 * and recent activity.
 */
export const GET = withAdmin(
  async (_req, _ssrClient, _user, { params }: { params: Promise<{ id: string }> }) => {
    const supabase = createServiceClient();
    try {
      const { id } = await params;

      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
      }

      const [
        { data: profile },
        { data: role },
        { data: subscription },
        { data: stats },
        { data: stylePersonality },
        { count: achievementCount },
        { count: promptCount },
        { count: historyCount },
        { data: apiCostRows },
        { data: recentActivity },
        { data: recentHistory },
        { data: sourceBreakdown },
        { data: creditLedger },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("user_stats").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("user_style_personality").select("*").eq("user_id", id).maybeSingle(),
        supabase
          .from("user_achievements")
          .select("*", { count: "exact", head: true })
          .eq("user_id", id),
        supabase
          .from("personal_library")
          .select("*", { count: "exact", head: true })
          .eq("user_id", id),
        supabase.from("history").select("*", { count: "exact", head: true }).eq("user_id", id),
        // Token usage + cost — fetch all rows for accurate totals (no limit; indexed by user_id)
        supabase
          .from("api_usage_logs")
          .select(
            "estimated_cost_usd, input_tokens, output_tokens, provider, model, engine_mode, created_at",
          )
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10000),
        // 1 row only — just enough for lastActive timestamp
        supabase
          .from("activity_logs")
          .select("id, user_id, action, created_at, details")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("history")
          .select(
            "id, prompt, enhanced_prompt, tone, category, capability_mode, title, source, created_at",
          )
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        // Fetch enough rows for accurate analytics (source + tone + category + mode)
        supabase
          .from("history")
          .select("source, tone, category, capability_mode")
          .eq("user_id", id)
          .limit(5000),
        supabase
          .from("credit_ledger")
          .select("id, delta, balance_after, reason, source, created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (!profile) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Aggregate token + cost totals from api_usage_logs
      let totalApiCost = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      for (const r of apiCostRows ?? []) {
        totalApiCost += r.estimated_cost_usd ?? 0;
        totalInputTokens += r.input_tokens ?? 0;
        totalOutputTokens += r.output_tokens ?? 0;
      }
      // Recent API calls for per-prompt timeline (last 100, already ordered desc)
      const recentApiCalls = (apiCostRows ?? []).slice(0, 100).map((r) => ({
        provider: r.provider,
        model: r.model,
        engine_mode: r.engine_mode,
        input_tokens: r.input_tokens ?? 0,
        output_tokens: r.output_tokens ?? 0,
        cost_usd: r.estimated_cost_usd ?? 0,
        created_at: r.created_at,
      }));

      // Compute source/category/tone/mode breakdowns from history (up to 5000 rows — accurate)
      const sources: Record<string, number> = {};
      const categoryMap: Record<string, number> = {};
      const toneMap: Record<string, number> = {};
      const modeMap: Record<string, number> = {};
      for (const row of sourceBreakdown ?? []) {
        const src = (row.source as string) || "web";
        sources[src] = (sources[src] || 0) + 1;
        if (row.category)
          categoryMap[row.category as string] = (categoryMap[row.category as string] || 0) + 1;
        if (row.tone) toneMap[row.tone as string] = (toneMap[row.tone as string] || 0) + 1;
        if (row.capability_mode)
          modeMap[row.capability_mode as string] =
            (modeMap[row.capability_mode as string] || 0) + 1;
      }

      // Find last activity timestamp
      const lastActive =
        recentActivity && recentActivity.length > 0
          ? recentActivity[0].created_at
          : profile.updated_at;

      return NextResponse.json({
        profile,
        role,
        subscription,
        stats,
        stylePersonality,
        achievementCount: achievementCount ?? 0,
        promptCount: promptCount ?? 0,
        historyCount: historyCount ?? 0,
        totalApiCost,
        totalInputTokens,
        totalOutputTokens,
        recentApiCalls,
        recentActivity: recentActivity ?? [],
        recentHistory: recentHistory ?? [],
        sourceBreakdown: sources,
        topCategories: Object.entries(categoryMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        topTones: Object.entries(toneMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        topModes: Object.entries(modeMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        lastActive,
        creditLedger: creditLedger ?? [],
      });
    } catch (err) {
      logger.error("[Admin User Detail GET] Error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);

/**
 * POST /api/admin/users/[id]
 *
 * Performs an admin action on the target user.
 * Body: { action, value? }
 */
export const POST = withAdmin(
  async (req, _ssrClient, adminUser, { params }: { params: Promise<{ id: string }> }) => {
    const supabase = createServiceClient();
    try {
      const { id } = await params;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
      }

      const { data: body, error: parseError } = await parseAdminInput(req, adminActionSchema);
      if (parseError) return parseError;
      if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

      const { action, value } = body;

      // ── Guardrails: self-lockout + last-admin protection ───────────────────
      // An admin banning themselves or revoking their own admin role can
      // brick the panel. Revoking the final admin leaves the system without
      // anyone who can flip maintenance mode / grant access to recover.
      if (id === adminUser.id && (action === "ban" || action === "revoke_admin")) {
        return NextResponse.json(
          { error: `Refusing ${action}: admin cannot ${action} themselves` },
          { status: 400 },
        );
      }
      if (action === "revoke_admin") {
        const { count: adminCount, error: countErr } = await supabase
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .eq("role", "admin");
        if (countErr) {
          logger.error("[Admin User POST] revoke_admin precheck failed:", countErr);
          return NextResponse.json({ error: "Failed to verify admin count" }, { status: 500 });
        }
        if ((adminCount ?? 0) <= 1) {
          return NextResponse.json(
            { error: "Refusing: this would remove the last remaining admin" },
            { status: 400 },
          );
        }
      }

      switch (action) {
        case "change_tier": {
          const validTiers = ["free", "pro", "premium"];
          if (typeof value !== "string" || !validTiers.includes(value)) {
            return NextResponse.json(
              { error: `value must be one of: ${validTiers.join(", ")}` },
              { status: 400 },
            );
          }
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ plan_tier: value })
            .eq("id", id);

          if (updateError) {
            logger.error("[Admin User POST] change_tier error:", updateError);
            return NextResponse.json({ error: "Failed to update plan tier" }, { status: 500 });
          }
          break;
        }

        case "grant_credits": {
          const amount = Number(value);
          if (isNaN(amount) || amount <= 0 || amount > 10000) {
            return NextResponse.json(
              { error: "value must be a positive number up to 10,000" },
              { status: 400 },
            );
          }
          const result = await adminAdjustCredits(id, amount);
          if (!result.success) {
            logger.error("[Admin User POST] grant_credits error:", result.error);
            return NextResponse.json({ error: "Failed to grant credits" }, { status: 500 });
          }
          break;
        }

        case "revoke_credits": {
          const amount = Number(value);
          if (isNaN(amount) || amount <= 0 || amount > 10000) {
            return NextResponse.json(
              { error: "value must be a positive number up to 10,000" },
              { status: 400 },
            );
          }
          const result = await adminAdjustCredits(id, -amount);
          if (!result.success) {
            logger.error("[Admin User POST] revoke_credits error:", result.error);
            return NextResponse.json({ error: "Failed to revoke credits" }, { status: 500 });
          }
          break;
        }

        case "ban": {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ is_banned: true })
            .eq("id", id);

          if (updateError) {
            logger.error("[Admin User POST] ban error:", updateError);
            return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
          }
          break;
        }

        case "unban": {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ is_banned: false })
            .eq("id", id);

          if (updateError) {
            logger.error("[Admin User POST] unban error:", updateError);
            return NextResponse.json({ error: "Failed to unban user" }, { status: 500 });
          }
          break;
        }

        case "grant_admin": {
          // The user_roles table has UNIQUE(user_id, role) — not a single-column
          // constraint on user_id — so onConflict must list both columns.
          const { error: upsertError } = await supabase
            .from("user_roles")
            .upsert(
              { user_id: id, role: "admin" },
              { onConflict: "user_id,role", ignoreDuplicates: true },
            );

          if (upsertError) {
            logger.error("[Admin User POST] grant_admin error:", upsertError);
            return NextResponse.json({ error: "Failed to grant admin role" }, { status: 500 });
          }
          break;
        }

        case "revoke_admin": {
          const { error: deleteError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", id)
            .eq("role", "admin");

          if (deleteError) {
            logger.error("[Admin User POST] revoke_admin error:", deleteError);
            return NextResponse.json({ error: "Failed to revoke admin role" }, { status: 500 });
          }
          break;
        }

        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }

      try {
        await logAdminAction(adminUser.id, `user_${action}`, {
          target_user_id: id,
          value: value ?? null,
        });
      } catch (logErr) {
        logger.error("[Admin User POST] Failed to log action (action succeeded):", logErr);
      }

      return NextResponse.json({ success: true, action, target_user_id: id });
    } catch (err) {
      logger.error("[Admin User Detail POST] Error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);
