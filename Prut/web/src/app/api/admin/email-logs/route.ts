import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/email-logs
 *
 * Returns paginated global email logs with optional filters.
 * Query params: ?page=1&limit=50&source=resend&type=campaign&search=user@email.com
 */
export const GET = withAdmin(async (req, supabase) => {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50") || 50));
  const source = req.nextUrl.searchParams.get("source") || "";
  const emailType = req.nextUrl.searchParams.get("type") || "";
  const search = req.nextUrl.searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from("email_logs")
      .select("id, user_id, email_to, source, email_type, subject, status, resend_id, metadata, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (source) {
      query = query.eq("source", source);
    }
    if (emailType) {
      query = query.eq("email_type", emailType);
    }
    if (search.trim()) {
      query = query.ilike("email_to", `%${search.trim()}%`);
    }

    const { data: logs, count, error } = await query;

    if (error) {
      logger.error("[admin/email-logs] Query error:", error);
      return NextResponse.json({ error: "Failed to load email logs" }, { status: 500 });
    }

    // Get distinct sources and types for filter dropdowns
    const { data: sources } = await supabase
      .from("email_logs")
      .select("source")
      .limit(1000);
    const { data: types } = await supabase
      .from("email_logs")
      .select("email_type")
      .limit(1000);

    const uniqueSources = [...new Set((sources ?? []).map(s => s.source))].sort();
    const uniqueTypes = [...new Set((types ?? []).map(t => t.email_type))].sort();

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      page,
      limit,
      filters: { sources: uniqueSources, types: uniqueTypes },
    });
  } catch (err) {
    logger.error("[admin/email-logs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
