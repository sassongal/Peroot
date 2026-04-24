import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/activity
 *
 * Returns activity logs with user email join.
 * Supports: ?search=, ?filter=, ?adminOnly=, ?limit=, ?offset=
 */
export const GET = withAdmin(async (req: NextRequest) => {
  const supabase = createServiceClient();
  const searchTerm = req.nextUrl.searchParams.get("search") || "";
  const filter = req.nextUrl.searchParams.get("filter") || "all";
  const adminOnly = req.nextUrl.searchParams.get("adminOnly") === "true";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100") || 100, 500);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0") || 0);

  let query = supabase
    .from("activity_logs")
    .select(
      `
      *,
      profiles:user_id (email)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // adminOnly takes precedence over filter (mutually exclusive)
  if (adminOnly) {
    query = query.eq("entity_type", "admin_action");
  } else if (filter !== "all") {
    query = query.eq("entity_type", filter);
  }

  const { data, count, error } = await query;

  if (error) {
    logger.error("[Admin Activity GET] Error:", error);
    return NextResponse.json({ error: "Failed to load activity logs" }, { status: 500 });
  }

  // Client-side search filtering (email + action)
  let filtered = data ?? [];
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((log: Record<string, unknown>) => {
      const action = ((log.action as string) || "").toLowerCase();
      const email = (
        ((log.profiles as Record<string, unknown>)?.email as string) || ""
      ).toLowerCase();
      return action.includes(term) || email.includes(term);
    });
  }

  return NextResponse.json({
    logs: filtered,
    total: searchTerm.trim() ? filtered.length : (count ?? 0),
    limit,
    offset,
  });
});
