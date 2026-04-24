import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
}

export interface ActionsByDay {
  date: string;
  count: number;
}

export interface ActionsByType {
  action: string;
  count: number;
}

export interface AdminActivity {
  user_id: string;
  email: string;
  display_name: string;
  count: number;
}

export interface AuditSummary {
  totalActions: number;
  uniqueAdmins: number;
  mostCommonAction: string;
  actionsToday: number;
}

export interface AuditResponse {
  logs: AuditLogEntry[];
  summary: AuditSummary;
  byDay: ActionsByDay[];
  byType: ActionsByType[];
  topAdmins: AdminActivity[];
  generatedAt: string;
}

export const GET = withAdmin(async (req) => {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const actionSearch = searchParams.get("action") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);

  // ── Fetch admin action logs ────────────────────────────────────────────────
  let query = supabase
    .from("activity_logs")
    .select("id, user_id, action, entity_type, details, created_at")
    .eq("entity_type", "admin_action")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) {
    query = query.gte("created_at", new Date(from).toISOString());
  }
  if (to) {
    query = query.lte("created_at", new Date(to + "T23:59:59").toISOString());
  }
  if (actionSearch) {
    query = query.ilike("action", `%${escapePostgrestValue(actionSearch)}%`);
  }

  const { data: rawLogs, error: logsError } = await query;

  if (logsError) {
    logger.error("[Admin Audit] Logs query error:", logsError);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }

  const logs = rawLogs ?? [];

  // ── Enrich with profile data ──────────────────────────────────────────────
  const uniqueUserIds = [...new Set(logs.map((l: AuditLogEntry) => l.user_id))];
  const profileMap: Record<string, { email: string; display_name: string }> = {};

  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", uniqueUserIds);

    (profiles ?? []).forEach((p: { id: string; email: string; display_name: string }) => {
      profileMap[p.id] = { email: p.email, display_name: p.display_name };
    });
  }

  const enrichedLogs: AuditLogEntry[] = logs.map((l: AuditLogEntry) => ({
    ...l,
    admin_email: profileMap[l.user_id]?.email ?? "Unknown",
    admin_name: profileMap[l.user_id]?.display_name ?? "Unknown Admin",
  }));

  // ── Summary: today's count ─────────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: actionsToday } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "admin_action")
    .gte("created_at", todayStart.toISOString());

  // ── By Day aggregation ─────────────────────────────────────────────────────
  const dayMap: Record<string, number> = {};
  logs.forEach((l: AuditLogEntry) => {
    const day = l.created_at.split("T")[0];
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  const byDay: ActionsByDay[] = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // ── By Type aggregation ────────────────────────────────────────────────────
  const typeMap: Record<string, number> = {};
  logs.forEach((l: AuditLogEntry) => {
    typeMap[l.action] = (typeMap[l.action] || 0) + 1;
  });
  const byType: ActionsByType[] = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => ({ action, count }));

  // ── Top Admins ─────────────────────────────────────────────────────────────
  const adminCountMap: Record<string, number> = {};
  logs.forEach((l: AuditLogEntry) => {
    adminCountMap[l.user_id] = (adminCountMap[l.user_id] || 0) + 1;
  });
  const topAdmins: AdminActivity[] = Object.entries(adminCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid, count]) => ({
      user_id: uid,
      email: profileMap[uid]?.email ?? "Unknown",
      display_name: profileMap[uid]?.display_name ?? "Unknown",
      count,
    }));

  const mostCommonAction = byType[0]?.action ?? "-";
  const uniqueAdmins = uniqueUserIds.length;

  const summary: AuditSummary = {
    totalActions: logs.length,
    uniqueAdmins,
    mostCommonAction,
    actionsToday: actionsToday ?? 0,
  };

  logger.info("[Admin Audit] Query complete", {
    total: logs.length,
    uniqueAdmins,
    from,
    to,
  });

  return NextResponse.json({
    logs: enrichedLogs,
    summary,
    byDay,
    byType,
    topAdmins,
    generatedAt: new Date().toISOString(),
  } satisfies AuditResponse);
});
