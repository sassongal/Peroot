import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const BACKUP_TABLES = [
  "profiles",
  "personal_library",
  "library_favorites",
  "ai_prompts",
  "ai_prompt_versions",
  "site_settings",
  "user_roles",
] as const;

const STATS_TABLES = [
  "profiles",
  "personal_library",
  "activity_logs",
  "api_usage_logs",
  "subscriptions",
  "credit_ledger",
  "newsletter_subscribers",
  "prompt_favorites",
  "prompt_usage_events",
  "prompt_feedback",
  "webhook_events",
] as const;

/**
 * GET /api/admin/database?action=stats
 * GET /api/admin/database?action=backup
 *
 * stats  - returns row counts and health status
 * backup - returns full table dumps for all key tables
 */
export const GET = withAdmin(async (req, _ssrClient, adminUser) => {
  const supabase = createServiceClient();
  try {
    const action = req.nextUrl.searchParams.get("action") || "stats";

    if (action === "stats") {
      // Health check
      const { error: healthError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .limit(1);

      const health = healthError ? "Error" : "Healthy";

      // Row counts in parallel for all tracked tables
      const countResults = await Promise.all(
        STATS_TABLES.map((t) => supabase.from(t).select("*", { count: "exact", head: true })),
      );

      const rowCounts: Record<string, number> = {};
      STATS_TABLES.forEach((t, i) => {
        rowCounts[t] = countResults[i].count ?? 0;
      });

      return NextResponse.json({
        tableCount: STATS_TABLES.length,
        health,
        rowCounts,
      });
    }

    if (action === "backup") {
      const tables: Record<string, unknown[]> = {};

      for (const table of BACKUP_TABLES) {
        const { data, error: tblError } = await supabase.from(table).select("*").limit(10000);
        if (!tblError && data) tables[table] = data;
      }

      // Log the backup action using the already-authenticated admin user from withAdmin
      await supabase.from("activity_logs").insert({
        user_id: adminUser.id,
        action: "DB Backup Genesis",
        entity_type: "database",
        details: { is_admin: true, timestamp: new Date().toISOString() },
      });

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        version: "2.0",
        tables,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logger.error("[admin/database] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
