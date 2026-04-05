import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";
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
] as const;

/**
 * GET /api/admin/database?action=stats
 * GET /api/admin/database?action=backup
 *
 * stats  - returns row counts and health status
 * backup - returns full table dumps for all key tables
 */
export async function GET(req: NextRequest) {
  try {
    const { error, supabase } = await validateAdminSession();
    if (error || !supabase)
      return NextResponse.json(
        { error: error || "Forbidden" },
        { status: error === "Unauthorized" ? 401 : 403 }
      );

    const action = req.nextUrl.searchParams.get("action") || "stats";

    if (action === "stats") {
      // Health check
      const { error: healthError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .limit(1);

      const health = healthError ? "Error" : "Healthy";

      // Row counts in parallel
      const [
        { count: profilesCount },
        { count: libraryCount },
        { count: activityCount },
        { count: apiUsageCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("personal_library")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("activity_logs")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("api_usage_logs")
          .select("*", { count: "exact", head: true }),
      ]);

      return NextResponse.json({
        tableCount: STATS_TABLES.length + BACKUP_TABLES.length - 2, // deduplicate profiles & personal_library
        health,
        rowCounts: {
          profiles: profilesCount ?? 0,
          personal_library: libraryCount ?? 0,
          activity_logs: activityCount ?? 0,
          api_usage_logs: apiUsageCount ?? 0,
        },
      });
    }

    if (action === "backup") {
      const tables: Record<string, unknown[]> = {};

      for (const table of BACKUP_TABLES) {
        const { data, error: tblError } = await supabase
          .from(table)
          .select("*")
          .limit(10000);
        if (!tblError && data) tables[table] = data;
      }

      // Log the backup action
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("activity_logs").insert({
          action: "DB Backup Genesis",
          entity_type: "database",
          user_id: user.id,
          details: {
            is_admin: true,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        version: "2.0",
        tables,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logger.error("[admin/database] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
