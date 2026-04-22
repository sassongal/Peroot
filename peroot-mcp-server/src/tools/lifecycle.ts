import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabase, handleError, truncate } from "../clients.js";

export function registerLifecycleTools(server: McpServer): void {
  // ─── New signups without any usage ──────────────────────────────────────────
  server.registerTool(
    "peroot_inactive_new_signups",
    {
      title: "Inactive New Signups",
      description: `Find users who registered recently but have never run a prompt improvement.
These are the highest-priority conversion targets — they showed intent but haven't activated.
Returns id, email, created_at, credits_remaining, days_since_signup.`,
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(7).describe("Look back window in days (default 7)"),
        limit: z.number().int().min(1).max(200).default(50).describe("Max results"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ days, limit }) => {
      try {
        const sb = getSupabase();
        const since = new Date(Date.now() - days * 86_400_000).toISOString();

        // Users who signed up in the window and have zero history rows
        const { data, error } = await sb
          .from("profiles")
          .select(`
            id, email, created_at, credits_remaining, display_name,
            history!left(id)
          `)
          .gte("created_at", since)
          .is("history.id", null)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        const now = Date.now();
        const result = (data ?? []).map((u) => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          created_at: u.created_at,
          credits_remaining: u.credits_remaining,
          days_since_signup: Math.floor((now - new Date(u.created_at).getTime()) / 86_400_000),
        }));

        return {
          content: [{
            type: "text" as const,
            text: truncate(JSON.stringify({ count: result.length, window_days: days, users: result }, null, 2)),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── High-intent free users (conversion candidates) ─────────────────────────
  server.registerTool(
    "peroot_high_intent_free_users",
    {
      title: "High-Intent Free Users",
      description: `Find free-tier users with high engagement who are likely ready to convert to Pro.
These users are actively using the product but haven't upgraded — prime targets for conversion nudges.
Returns id, email, total_enhancements, enhancements_last_7d, last_used_at.`,
      inputSchema: z.object({
        min_enhancements: z.number().int().min(1).default(5).describe("Minimum lifetime enhancement count"),
        days: z.number().int().min(1).max(90).default(30).describe("Activity window in days"),
        limit: z.number().int().min(1).max(200).default(50).describe("Max results"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ min_enhancements, days, limit }) => {
      try {
        const sb = getSupabase();
        const since = new Date(Date.now() - days * 86_400_000).toISOString();

        // Free-tier users with history in the window
        const { data: profiles, error: pe } = await sb
          .from("profiles")
          .select("id, email, display_name, created_at, credits_remaining")
          .eq("plan_tier", "free")
          .limit(1000);

        if (pe) throw pe;

        const userIds = (profiles ?? []).map((p) => p.id);
        if (userIds.length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ count: 0, users: [] }) }] };
        }

        const { data: history, error: he } = await sb
          .from("history")
          .select("user_id, created_at")
          .in("user_id", userIds)
          .gte("created_at", since);

        if (he) throw he;

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        const countMap = new Map<string, { total: number; recent: number; last: string }>();

        for (const row of history ?? []) {
          const entry = countMap.get(row.user_id) ?? { total: 0, recent: 0, last: "" };
          entry.total += 1;
          entry.recent += 1;
          if (!entry.last || row.created_at > entry.last) entry.last = row.created_at;
          countMap.set(row.user_id, entry);
        }

        const results = [...countMap.entries()]
          .filter(([, v]) => v.total >= min_enhancements)
          .map(([uid, v]) => {
            const p = profileMap.get(uid)!;
            return {
              id: uid,
              email: p.email,
              display_name: p.display_name,
              created_at: p.created_at,
              credits_remaining: p.credits_remaining,
              enhancements_in_window: v.total,
              last_used_at: v.last,
            };
          })
          .sort((a, b) => b.enhancements_in_window - a.enhancements_in_window)
          .slice(0, limit);

        return {
          content: [{
            type: "text" as const,
            text: truncate(JSON.stringify({ count: results.length, window_days: days, min_enhancements, users: results }, null, 2)),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── At-risk users (churn signals) ──────────────────────────────────────────
  server.registerTool(
    "peroot_at_risk_users",
    {
      title: "At-Risk Users (Churn Signals)",
      description: `Find users who were active recently but have gone silent — churn risk candidates.
"Active" means they had at least one enhancement in the activity window.
"Silent" means nothing in the past silence_days.
Returns id, email, plan_tier, last_used_at, days_silent, total_enhancements.`,
      inputSchema: z.object({
        silence_days: z.number().int().min(3).max(90).default(14).describe("Days of silence to qualify as at-risk (default 14)"),
        activity_window_days: z.number().int().min(7).max(365).default(60).describe("How far back to look for prior activity (default 60)"),
        limit: z.number().int().min(1).max(200).default(50).describe("Max results"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ silence_days, activity_window_days, limit }) => {
      try {
        const sb = getSupabase();
        const activeFrom = new Date(Date.now() - activity_window_days * 86_400_000).toISOString();
        const silenceCutoff = new Date(Date.now() - silence_days * 86_400_000).toISOString();

        const { data: history, error: he } = await sb
          .from("history")
          .select("user_id, created_at")
          .gte("created_at", activeFrom);

        if (he) throw he;

        // Per-user stats
        const statsMap = new Map<string, { total: number; last: string }>();
        for (const row of history ?? []) {
          const s = statsMap.get(row.user_id) ?? { total: 0, last: "" };
          s.total += 1;
          if (!s.last || row.created_at > s.last) s.last = row.created_at;
          statsMap.set(row.user_id, s);
        }

        // Keep only users whose last activity is before the silence cutoff
        const atRiskIds = [...statsMap.entries()]
          .filter(([, s]) => s.last < silenceCutoff)
          .map(([uid]) => uid);

        if (atRiskIds.length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ count: 0, users: [] }) }] };
        }

        const { data: profiles, error: pe } = await sb
          .from("profiles")
          .select("id, email, display_name, plan_tier, created_at")
          .in("id", atRiskIds.slice(0, 500));

        if (pe) throw pe;

        const now = Date.now();
        const results = (profiles ?? [])
          .map((p) => {
            const s = statsMap.get(p.id)!;
            return {
              id: p.id,
              email: p.email,
              display_name: p.display_name,
              plan_tier: p.plan_tier,
              last_used_at: s.last,
              days_silent: Math.floor((now - new Date(s.last).getTime()) / 86_400_000),
              enhancements_in_window: s.total,
            };
          })
          .sort((a, b) => a.days_silent - b.days_silent)
          .slice(0, limit);

        return {
          content: [{
            type: "text" as const,
            text: truncate(JSON.stringify({
              count: results.length,
              silence_days,
              activity_window_days,
              users: results,
            }, null, 2)),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Conversion funnel ───────────────────────────────────────────────────────
  server.registerTool(
    "peroot_conversion_funnel",
    {
      title: "Conversion Funnel",
      description: `Returns a snapshot of the user conversion funnel:
  signup_only → first_use → repeat_free → converted_pro
Each stage shows user count and percentage of total.
Use to understand where users drop off and how many convert.`,
      inputSchema: z.object({
        days: z.number().int().min(7).max(365).default(90).describe("Cohort window in days (default 90)"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ days }) => {
      try {
        const sb = getSupabase();
        const since = new Date(Date.now() - days * 86_400_000).toISOString();

        const { data: profiles, error: pe } = await sb
          .from("profiles")
          .select("id, plan_tier")
          .gte("created_at", since);

        if (pe) throw pe;

        const userIds = (profiles ?? []).map((p) => p.id);
        if (userIds.length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ total_users: 0, funnel: [] }) }] };
        }

        const { data: history, error: he } = await sb
          .from("history")
          .select("user_id")
          .in("user_id", userIds);

        if (he) throw he;

        const countMap = new Map<string, number>();
        for (const row of history ?? []) {
          countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1);
        }

        const planMap = new Map((profiles ?? []).map((p) => [p.id, p.plan_tier as string]));

        const funnel = { signup_only: 0, first_use: 0, repeat_free: 0, converted_pro: 0 };
        for (const uid of userIds) {
          const count = countMap.get(uid) ?? 0;
          const tier = planMap.get(uid) ?? "free";
          if (tier === "pro") {
            funnel.converted_pro += 1;
          } else if (count >= 2) {
            funnel.repeat_free += 1;
          } else if (count === 1) {
            funnel.first_use += 1;
          } else {
            funnel.signup_only += 1;
          }
        }

        const total = userIds.length;
        const stages = Object.entries(funnel).map(([stage, count]) => ({
          stage,
          count,
          pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        }));

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ window_days: days, total_users: total, funnel: stages }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
