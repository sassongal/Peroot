import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabase, handleError, truncate } from "../clients.js";

export function registerAiPromptTools(server: McpServer): void {
  // ─── List AI prompt engines ──────────────────────────────────────────────────
  server.registerTool(
    "peroot_list_ai_prompts",
    {
      title: "List AI Prompt Engines",
      description: "List all AI prompt engine configurations from the database. Returns engine names, active status, and metadata. Use peroot_get_ai_prompt to fetch the full system prompt body.",
      inputSchema: z.object({
        active_only: z.boolean().default(true).describe("Return only active engines"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ active_only }) => {
      try {
        const sb = getSupabase();
        let q = sb
          .from("prompt_engines")
          .select("id, name, slug, is_active, version, created_at, updated_at")
          .order("name", { ascending: true });
        if (active_only) q = q.eq("is_active", true);

        const { data, error } = await q;
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Get AI prompt ───────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_get_ai_prompt",
    {
      title: "Get AI System Prompt",
      description: "Fetch the full system prompt body and configuration for a specific engine by slug or ID.",
      inputSchema: z.object({
        id: z.string().optional().describe("Engine UUID (provide this OR slug)"),
        slug: z.string().optional().describe("Engine slug (e.g. 'standard', 'research', 'image')"),
      }).refine(d => d.id || d.slug, { message: "Provide id or slug" }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, slug }) => {
      try {
        const sb = getSupabase();
        let q = sb.from("prompt_engines").select("*");
        if (id) q = q.eq("id", id);
        else if (slug) q = q.eq("slug", slug);
        const { data, error } = await q.single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Update AI prompt ────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_update_ai_prompt",
    {
      title: "Update AI System Prompt",
      description: "Update the system prompt body or config for an engine. Use this to tune engine behaviour, fix prompt issues, or A/B test changes. Always read the current prompt first.",
      inputSchema: z.object({
        id: z.string().uuid().describe("Engine UUID"),
        system_prompt: z.string().min(1).max(200_000).optional().describe("New system prompt body"),
        is_active: z.boolean().optional().describe("Enable or disable the engine"),
        config: z.record(z.string(), z.unknown()).optional().describe("Arbitrary engine config JSON"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, ...updates }) => {
      try {
        const sb = getSupabase();
        const patch = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        const { data, error } = await sb
          .from("prompt_engines")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id, name, slug, is_active, version, updated_at")
          .single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── List ai_prompts table (dynamic prompts) ─────────────────────────────────
  server.registerTool(
    "peroot_list_dynamic_prompts",
    {
      title: "List Dynamic AI Prompts",
      description: "List rows from the ai_prompts table — runtime-configurable prompt snippets (system fragments, scoring rubrics, GENIUS_ANALYSIS configs). Filterable by key prefix.",
      inputSchema: z.object({
        key_prefix: z.string().optional().describe("Filter by key prefix (e.g. 'scoring', 'genius')"),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ key_prefix, limit }) => {
      try {
        const sb = getSupabase();
        let q = sb
          .from("ai_prompts")
          .select("id, key, value, description, updated_at")
          .order("key", { ascending: true })
          .limit(limit);
        if (key_prefix) q = q.ilike("key", `${key_prefix}%`);

        const { data, error } = await q;
        if (error) throw error;
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data ?? [], null, 2)) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Upsert dynamic prompt ───────────────────────────────────────────────────
  server.registerTool(
    "peroot_upsert_dynamic_prompt",
    {
      title: "Upsert Dynamic AI Prompt",
      description: "Create or update a dynamic AI prompt snippet by key. Used to tune runtime behaviour without a deploy — e.g. scoring weights, genius analysis instructions.",
      inputSchema: z.object({
        key: z.string().min(1).max(200).describe("Unique prompt key"),
        value: z.string().min(1).max(100_000).describe("Prompt content"),
        description: z.string().max(500).optional().describe("Human-readable description of what this key controls"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ key, value, description }) => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("ai_prompts")
          .upsert({ key, value, description, updated_at: new Date().toISOString() }, { onConflict: "key" })
          .select()
          .single();
        if (error) throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
