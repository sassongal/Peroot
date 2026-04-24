import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabase, handleError, truncate } from "../clients.js";

export function registerUserTools(server: McpServer): void {
  // ─── List users ──────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_list_users",
    {
      title: "List Users",
      description: `List Peroot users with plan tier, credit balance, and registration date.
Supports filtering by plan tier and text search on email.`,
      inputSchema: z.object({
        plan_tier: z.enum(["free", "pro"]).optional().describe("Filter by plan tier"),
        search_email: z.string().optional().describe("Partial email match"),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ plan_tier, search_email, limit, offset }) => {
      try {
        const sb = getSupabase();
        let q = sb
          .from("profiles")
          .select("id, email, plan_tier, credits_remaining, created_at, display_name", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (plan_tier) q = q.eq("plan_tier", plan_tier);
        if (search_email) q = q.ilike("email", `%${search_email}%`);

        const { data, error, count } = await q;
        if (error) throw error;

        const out = { total: count ?? 0, count: data?.length ?? 0, offset, users: data ?? [], has_more: (count ?? 0) > offset + (data?.length ?? 0) };
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(out, null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Get user ────────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_user",
    {
      title: "Get User Details",
      description: "Fetch full profile for a user by UUID or email. Includes plan, credits, style personality, and roles.",
      inputSchema: z.object({
        user_id: z.string().optional().describe("User UUID (provide this OR email)"),
        email: z.string().email().optional().describe("User email (provide this OR user_id)"),
      }).refine(d => d.user_id || d.email, { message: "Provide user_id or email" }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, email }) => {
      try {
        const sb = getSupabase();
        let q = sb.from("profiles").select("*");
        if (user_id) q = q.eq("id", user_id);
        else if (email) q = q.eq("email", email);
        const { data, error } = await q.single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── User history ────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_user_history",
    {
      title: "Get User History",
      description: "Retrieve enhancement history for a user — input prompts, result titles, engine used, and timestamps.",
      inputSchema: z.object({
        user_id: z.string().uuid().describe("User UUID"),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, limit, offset }) => {
      try {
        const sb = getSupabase();
        const { data, error, count } = await sb
          .from("history")
          .select("id, input, result_title, engine, created_at, token_count", { count: "exact" })
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) throw error;
        const out = { total: count ?? 0, count: data?.length ?? 0, offset, history: data ?? [] };
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(out, null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Add credits ─────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_add_credits",
    {
      title: "Add Credits to User",
      description: "Add or subtract credits from a user's balance. Use a negative amount to deduct. Records an entry in credit_ledger.",
      inputSchema: z.object({
        user_id: z.string().uuid().describe("User UUID"),
        amount: z.number().int().describe("Credits to add (positive) or deduct (negative)"),
        reason: z.string().max(200).describe("Human-readable reason for the adjustment (e.g. 'manual top-up', 'refund')"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ user_id, amount, reason }) => {
      try {
        const sb = getSupabase();
        // Insert ledger entry
        const { error: ledgerErr } = await sb
          .from("credit_ledger")
          .insert({ user_id, amount, reason, source: "admin_mcp" });
        if (ledgerErr) throw ledgerErr;
        // Fetch updated balance
        const { data, error } = await sb
          .from("profiles")
          .select("id, email, credits_remaining")
          .eq("id", user_id)
          .single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify({ adjusted: amount, reason, profile: data }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Update plan tier ────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_set_user_plan",
    {
      title: "Set User Plan Tier",
      description: "Change a user's plan tier to 'free' or 'pro'. Use for manual plan overrides.",
      inputSchema: z.object({
        user_id: z.string().uuid().describe("User UUID"),
        plan_tier: z.enum(["free", "pro"]).describe("New plan tier"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, plan_tier }) => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("profiles")
          .update({ plan_tier })
          .eq("id", user_id)
          .select("id, email, plan_tier, credits_remaining")
          .single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
