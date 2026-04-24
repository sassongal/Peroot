import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabase, handleError, truncate } from "../clients.js";

export function registerPromptTools(server: McpServer): void {
  // ─── List prompts ────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_list_prompts",
    {
      title: "List Prompt Library",
      description: `List prompts from the Peroot shared prompt library with optional filters.
Returns paginated results with id, title, category, tags, use_count, and created_at.
Use peroot_get_prompt to fetch full content for a specific prompt.`,
      inputSchema: z.object({
        search: z.string().optional().describe("Full-text search across title and content"),
        category: z.string().optional().describe("Filter by category slug (e.g. 'writing', 'code')"),
        limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
        offset: z.number().int().min(0).default(0).describe("Pagination offset"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ search, category, limit, offset }) => {
      try {
        const sb = getSupabase();
        let q = sb
          .from("prompts")
          .select("id, title, category, tags, use_count, created_at, is_public", { count: "exact" })
          .order("use_count", { ascending: false })
          .range(offset, offset + limit - 1);
        if (search) q = q.ilike("title", `%${search}%`);
        if (category) q = q.eq("category", category);

        const { data, error, count } = await q;
        if (error) throw error;

        const out = {
          total: count ?? 0,
          count: data?.length ?? 0,
          offset,
          prompts: data ?? [],
          has_more: (count ?? 0) > offset + (data?.length ?? 0),
        };
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(out, null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Get single prompt ───────────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_prompt",
    {
      title: "Get Prompt Details",
      description: "Fetch full content and metadata for a specific prompt by its UUID.",
      inputSchema: z.object({
        id: z.string().uuid().describe("Prompt UUID"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from("prompts").select("*").eq("id", id).single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Create prompt ───────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_create_prompt",
    {
      title: "Create Prompt",
      description: "Create a new prompt in the shared library. Returns the created prompt record.",
      inputSchema: z.object({
        title: z.string().min(1).max(200).describe("Prompt title"),
        content: z.string().min(1).max(50_000).describe("Prompt body text"),
        category: z.string().max(50).optional().describe("Category slug"),
        tags: z.array(z.string().max(50)).max(10).optional().describe("Tags array"),
        is_public: z.boolean().default(true).describe("Whether visible in the shared library"),
        user_id: z.string().uuid().describe("Owner user UUID"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ title, content, category, tags, is_public, user_id }) => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("prompts")
          .insert({ title, content, category, tags, is_public, user_id })
          .select()
          .single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Update prompt ───────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_update_prompt",
    {
      title: "Update Prompt",
      description: "Update title, content, category, tags, or visibility of an existing prompt.",
      inputSchema: z.object({
        id: z.string().uuid().describe("Prompt UUID to update"),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).max(50_000).optional(),
        category: z.string().max(50).optional(),
        tags: z.array(z.string().max(50)).max(10).optional(),
        is_public: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, ...updates }) => {
      try {
        const sb = getSupabase();
        const patch = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        const { data, error } = await sb.from("prompts").update(patch).eq("id", id).select().single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
