import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabase, handleError, truncate } from "../clients.js";

export function registerAnalyticsTools(server: McpServer): void {
  // ─── Platform stats ──────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_platform_stats",
    {
      title: "Get Platform Stats",
      description: "Aggregate stats: total users, pro users, total enhancements, prompts in library, and recent 24h activity.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async () => {
      try {
        const sb = getSupabase();
        const [usersRes, proRes, historyRes, promptsRes, recentRes] = await Promise.all([
          sb.from("profiles").select("*", { count: "exact", head: true }),
          sb.from("profiles").select("*", { count: "exact", head: true }).eq("plan_tier", "pro"),
          sb.from("history").select("*", { count: "exact", head: true }),
          sb.from("prompts").select("*", { count: "exact", head: true }).eq("is_public", true),
          sb
            .from("history")
            .select("*", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
        ]);

        const stats = {
          total_users: usersRes.count ?? 0,
          pro_users: proRes.count ?? 0,
          free_users: (usersRes.count ?? 0) - (proRes.count ?? 0),
          total_enhancements: historyRes.count ?? 0,
          public_prompts: promptsRes.count ?? 0,
          enhancements_last_24h: recentRes.count ?? 0,
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(stats, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Activity logs ───────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_activity_logs",
    {
      title: "Get Activity Logs",
      description: "Recent platform activity logs — enhancement events, errors, and system actions. Filterable by user_id or action type.",
      inputSchema: z.object({
        user_id: z.string().uuid().optional().describe("Filter to a specific user"),
        action: z.string().optional().describe("Filter by action name (e.g. 'enhance', 'extract_url')"),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, action, limit, offset }) => {
      try {
        const sb = getSupabase();
        let q = sb
          .from("activity_logs")
          .select("id, user_id, action, metadata, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (user_id) q = q.eq("user_id", user_id);
        if (action) q = q.eq("action", action);

        const { data, error, count } = await q;
        if (error) throw error;
        const out = { total: count ?? 0, count: data?.length ?? 0, offset, logs: data ?? [] };
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(out, null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Engine usage breakdown ──────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_engine_usage",
    {
      title: "Engine Usage Breakdown",
      description: "Count of enhancements per engine type over a date range. Useful for understanding which engines are most popular.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(7).describe("Look-back window in days"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ days }) => {
      try {
        const sb = getSupabase();
        const since = new Date(Date.now() - days * 86_400_000).toISOString();
        const { data, error } = await sb
          .from("history")
          .select("engine")
          .gte("created_at", since);
        if (error) throw error;

        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          const eng = (row.engine as string | null) ?? "unknown";
          counts[eng] = (counts[eng] ?? 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([engine, count]) => ({ engine, count }));
        return { content: [{ type: "text" as const, text: JSON.stringify({ days, total: data?.length ?? 0, by_engine: sorted }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
