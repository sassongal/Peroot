import { z } from "zod";
import { parseTrailer } from "@/lib/prompt-stream/trailer";
import { CapabilityMode, parseCapabilityMode } from "@/lib/capability-mode";
import { createServiceClient } from "@/lib/supabase/service";
import { getRefreshAt } from "@/lib/services/credit-service";
import { extractKeywords } from "@/components/features/library/graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import { logger } from "@/lib/logger";

/**
 * Peroot Connect — shared operations layer.
 *
 * BOTH public surfaces (/api/v1 REST and /api/mcp) call these functions, so
 * behavior can never drift between them. `enhance` invokes the REAL
 * /api/enhance route handler **in-process** (a direct function call with a
 * synthetic Request — not internal HTTP, not a logic fork; see plan §23.1).
 * That means every Connect enhancement automatically gets the same engine
 * skills, memory facts, model profiles, credits and cache as the web app.
 */

// ── Input schema (shared by REST + MCP tool) ────────────────────────────────

/** Client-facing mode names — the same five capability modes as the platform. */
export const ConnectEnhanceSchema = z.object({
  prompt: z.string().min(1).max(8_000),
  mode: z
    .enum(["STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "VIDEO_GENERATION", "AGENT_BUILDER"])
    .default("STANDARD"),
  /**
   * Platform-level model choice, exactly like the web picker: which chat model
   * the final prompt should be structured for. Engines inject per-model
   * structure hints for STANDARD / DEEP_RESEARCH / AGENT_BUILDER.
   */
  target_model: z.enum(["chatgpt", "claude", "gemini", "general"]).optional(),
  /**
   * Finer-grained model profile (e.g. "gpt-5", "claude-sonnet-4",
   * "gemini-2.5") — same mechanism the Chrome extension uses. Optional; a
   * miss is non-fatal (engine renders with its base prompt).
   */
  model_profile_slug: z.string().max(64).optional(),
  output_language: z.enum(["hebrew", "english", "arabic", "russian"]).optional(),
  tone: z.string().max(60).optional(),
  category: z.string().max(60).optional(),
  /** Mode-specific params (IMAGE: aspect_ratio/style · VIDEO: camera_movement/duration/style/mood · AGENT: system_instructions). */
  mode_options: z.record(z.string(), z.string().max(2_000)).optional(),
  /**
   * A SHORT distilled summary of the conversation/project the agent is in —
   * audience, goal, product, constraints. Injected into the engine as a
   * context attachment so the enhancement is grounded in what the user is
   * actually working on. Deliberately capped at 4,000 chars: the agent should
   * distill, never paste transcripts (economy), and context-bearing calls
   * skip the result cache by design.
   */
  context: z.string().min(1).max(4_000).optional(),
});
export type ConnectEnhanceInput = z.infer<typeof ConnectEnhanceSchema>;

export interface ConnectEnhanceResult {
  enhanced_prompt: string;
  title: string | null;
  mode: string;
  cache_hit: boolean;
  credits_remaining: number | null;
  quota_resets_at: string | null;
}

export class ConnectOpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public messageEn?: string,
  ) {
    super(message);
    this.name = "ConnectOpError";
  }
}

// ── enhance ─────────────────────────────────────────────────────────────────

/** Injectable for tests; production resolves the real route handler lazily. */
export type EnhanceHandler = (req: Request) => Promise<Response>;

async function defaultEnhanceHandler(req: Request): Promise<Response> {
  const mod = await import("@/app/api/enhance/route");
  return mod.POST(req);
}

export async function connectEnhance(
  input: ConnectEnhanceInput,
  rawApiKey: string,
  userId: string,
  handler: EnhanceHandler = defaultEnhanceHandler,
): Promise<ConnectEnhanceResult> {
  const body = {
    prompt: input.prompt,
    capability_mode: input.mode,
    tone: input.tone ?? "Professional",
    category: input.category ?? "כללי",
    target_model: input.target_model ?? "general",
    ...(input.model_profile_slug ? { model_profile_slug: input.model_profile_slug } : {}),
    ...(input.output_language ? { output_language: input.output_language } : {}),
    ...(input.mode_options ? { mode_params: input.mode_options } : {}),
    // Conversation/project context rides the pipeline's context-attachment
    // lane as a FULL new-shape ContextBlock — renderInjection reads
    // display.rawText/summary/keyFacts, so a legacy {type,name,content} block
    // would throw (b.display is undefined). The engines then ground the
    // enhancement in it exactly like an uploaded document.
    ...(input.context
      ? {
          context: [
            {
              id: "conversation-context",
              type: "file" as const,
              stage: "ready" as const,
              display: {
                title: "הקשר מהשיחה והפרויקט",
                documentType: "הקשר שיחה",
                summary: input.context.slice(0, 500),
                keyFacts: [],
                entities: [],
                rawText: input.context,
                metadata: {},
              },
            },
          ],
        }
      : {}),
  };

  const req = new Request("http://connect.internal/api/enhance", {
    method: "POST",
    headers: {
      authorization: `Bearer ${rawApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const res = await handler(req);

  if (!res.ok) {
    let code = "enhance_failed";
    let he = "השדרוג נכשל";
    let en = "Enhancement failed";
    try {
      const err = (await res.json()) as { error?: string; code?: string };
      if (err.code) code = err.code;
      if (err.error) he = err.error;
    } catch {
      /* non-JSON error body */
    }
    // Map quota exhaustion to the Connect error model.
    if (res.status === 403 && /quota|credit|insufficient/i.test(code)) {
      code = "no_credits";
      en = "Allowance exhausted, resets at quota_resets_at";
    }
    const status = res.status === 403 && code === "no_credits" ? 402 : res.status;
    throw new ConnectOpError(status, code, he, en);
  }

  // Success is a text/plain stream (or score-gate/cache text) with the
  // canonical trailer — collect fully, then parse with the shared parser.
  const raw = await res.text();
  const { body: enhanced, trailer } = parseTrailer(raw);
  const cacheHeader = res.headers.get("X-Peroot-Cache");

  const quota = await connectQuota(userId).catch(() => null);

  return {
    enhanced_prompt: enhanced,
    title: trailer.title,
    mode: input.mode,
    cache_hit: cacheHeader !== null,
    credits_remaining: quota?.credits_remaining ?? null,
    quota_resets_at: quota?.quota_resets_at ?? null,
  };
}

// ── quota ───────────────────────────────────────────────────────────────────

export interface ConnectQuota {
  tier: string;
  /** null = unlimited (admins bypass the credit gate entirely). */
  credits_remaining: number | null;
  quota_resets_at: string | null;
}

export async function connectQuota(userId: string): Promise<ConnectQuota> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("profiles")
    .select("credits_balance, plan_tier")
    .eq("id", userId)
    .single();
  if (error || !data) {
    throw new ConnectOpError(500, "quota_unavailable", "שליפת המכסה נכשלה", "Quota lookup failed");
  }
  const tier = data.plan_tier ?? "free";
  // Admins never pay a credit on enhance (the route skips the decrement), so
  // reporting a finite number here just confuses — surface "unlimited".
  if (tier === "admin") {
    return { tier, credits_remaining: null, quota_resets_at: null };
  }
  const resetsAt = await getRefreshAt(userId).catch(() => null);
  return {
    tier,
    credits_remaining: data.credits_balance ?? 0,
    quota_resets_at: resetsAt ? resetsAt.toISOString() : null,
  };
}

// ── save / search / list / get ──────────────────────────────────────────────

export const ConnectSaveSchema = z.object({
  prompt: z.string().min(1).max(50_000),
  title: z.string().max(120).optional(),
  tags: z.array(z.string().min(1).max(40)).max(15).optional(),
  auto_tag: z.boolean().optional(),
  category: z.string().max(60).optional(),
  mode: z
    .enum(["STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "VIDEO_GENERATION", "AGENT_BUILDER"])
    .optional(),
  original_prompt: z.string().max(10_000).optional(),
});
export type ConnectSaveInput = z.infer<typeof ConnectSaveSchema>;

export async function connectSavePrompt(
  userId: string,
  input: ConnectSaveInput,
): Promise<{ id: string; title: string; tags: string[] }> {
  const db = createServiceClient();
  const title = (input.title ?? input.prompt.slice(0, 60)).trim();

  let tags = input.tags ?? [];
  if (input.auto_tag && tags.length === 0) {
    // Lightweight, deterministic tagging from the shared keyword extractor
    // (same tokenizer the Memory Palace graph uses — one vocabulary).
    const kw = extractKeywords({ title, prompt: input.prompt } as unknown as PersonalPrompt, 5);
    tags = [...kw].slice(0, 5);
  }

  const category = input.category ?? "כללי";
  const { count } = await db
    .from("personal_library")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("personal_category", category);

  const { data, error } = await db
    .from("personal_library")
    .insert({
      user_id: userId,
      title,
      prompt: input.prompt,
      prompt_style: null,
      category,
      personal_category: category,
      use_case: null,
      source: "api",
      sort_index: count ?? 0,
      capability_mode: input.mode ? parseCapabilityMode(input.mode) : CapabilityMode.STANDARD,
      tags,
      original_prompt: input.original_prompt ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("[Connect] savePrompt failed:", error);
    throw new ConnectOpError(500, "save_failed", "שמירת הפרומפט נכשלה", "Save failed");
  }
  return { id: data.id as string, title, tags };
}

export interface ConnectPromptSummary {
  id: string;
  title: string;
  prompt: string;
  category: string | null;
  mode: string | null;
  tags: string[];
  created_at: string | null;
}

function rowToSummary(row: Record<string, unknown>): ConnectPromptSummary {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    prompt: String(row.prompt ?? ""),
    category: (row.personal_category as string) ?? null,
    mode: (row.capability_mode as string) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    created_at: (row.created_at as string) ?? null,
  };
}

export async function connectSearchPrompts(
  userId: string,
  query: string,
  limit = 10,
): Promise<ConnectPromptSummary[]> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("search_personal_library_fuzzy", {
    p_user_id: userId,
    p_query: query,
    p_folder: null,
    p_capability: null,
    p_sort: "recent",
    p_limit: Math.min(Math.max(limit, 1), 25),
    p_offset: 0,
  });
  if (error) {
    logger.error("[Connect] search failed:", error);
    throw new ConnectOpError(500, "search_failed", "החיפוש נכשל", "Search failed");
  }
  return ((data ?? []) as Record<string, unknown>[]).map(rowToSummary);
}

export async function connectListPrompts(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ items: ConnectPromptSummary[]; total: number }> {
  const db = createServiceClient();
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const offset = (Math.max(page, 1) - 1) * safeLimit;
  const { data, count, error } = await db
    .from("personal_library")
    .select("id, title, prompt, personal_category, capability_mode, tags, created_at", {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + safeLimit - 1);
  if (error) {
    logger.error("[Connect] list failed:", error);
    throw new ConnectOpError(500, "list_failed", "טעינת הספרייה נכשלה", "List failed");
  }
  return {
    items: ((data ?? []) as Record<string, unknown>[]).map(rowToSummary),
    total: count ?? 0,
  };
}

export async function connectGetPrompt(userId: string, id: string): Promise<ConnectPromptSummary> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("personal_library")
    .select("id, title, prompt, personal_category, capability_mode, tags, created_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logger.error("[Connect] get failed:", error);
    throw new ConnectOpError(500, "get_failed", "שליפת הפרומפט נכשלה", "Fetch failed");
  }
  if (!data) {
    throw new ConnectOpError(404, "not_found", "פרומפט לא נמצא", "Prompt not found");
  }
  return rowToSummary(data as Record<string, unknown>);
}

// ── P2: public library / templates / memory facts / feedback ────────────────

export interface ConnectLibraryHit {
  id: string;
  title: string;
  prompt: string;
  use_case: string | null;
  variables: string[];
  mode: string | null;
}

/**
 * Search the curated PUBLIC library (proven prompts/templates). Free — no credit.
 *
 * Word-split AND search: agents send natural multi-word queries ("פוסט
 * שיווקי לפייסבוק"), and a single `%whole phrase%` pattern returned 0 unless
 * the exact word sequence appeared — caught live in the E2E command sweep.
 * Each word must match SOME field; words combine with AND (chained .or()
 * groups), so more words narrow rather than kill the search.
 */
export async function connectSearchLibrary(
  query: string,
  limit = 10,
): Promise<ConnectLibraryHit[]> {
  const db = createServiceClient();
  const words = query
    .replace(/[%_,().]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  if (words.length === 0) return [];
  let q = db
    .from("public_library_prompts")
    .select("id, title, prompt, use_case, variables, capability_mode")
    .eq("is_active", true);
  for (const w of words) {
    const pattern = `%${w}%`;
    q = q.or(`title.ilike.${pattern},use_case.ilike.${pattern},prompt.ilike.${pattern}`);
  }
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 25));
  if (error) {
    logger.error("[Connect] library search failed:", error);
    throw new ConnectOpError(500, "search_failed", "חיפוש הספרייה נכשל", "Library search failed");
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    prompt: String(r.prompt ?? ""),
    use_case: (r.use_case as string) ?? null,
    variables: Array.isArray(r.variables) ? (r.variables as string[]) : [],
    mode: (r.capability_mode as string) ?? null,
  }));
}

/**
 * Pure template fill: replaces every `{name}` placeholder with its value.
 * Returns the filled text plus any declared variables left unfilled — so the
 * agent can ask the user for the missing ones instead of silently shipping
 * a prompt with holes.
 */
export function fillTemplateText(
  prompt: string,
  declared: string[],
  values: Record<string, string>,
): { filled: string; missing: string[] } {
  let filled = prompt;
  for (const [name, value] of Object.entries(values)) {
    filled = filled.split(`{${name}}`).join(value);
  }
  const missing = declared.filter((name) => filled.includes(`{${name}}`));
  return { filled, missing };
}

export async function connectFillTemplate(
  templateId: string,
  values: Record<string, string>,
): Promise<{ title: string; filled: string; missing: string[] }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("public_library_prompts")
    .select("title, prompt, variables")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    logger.error("[Connect] template fetch failed:", error);
    throw new ConnectOpError(500, "get_failed", "שליפת התבנית נכשלה", "Template fetch failed");
  }
  if (!data) {
    throw new ConnectOpError(404, "not_found", "תבנית לא נמצאה", "Template not found");
  }
  const declared = Array.isArray(data.variables) ? (data.variables as string[]) : [];
  const { filled, missing } = fillTemplateText(String(data.prompt ?? ""), declared, values);
  return { title: String(data.title ?? ""), filled, missing };
}

export interface ConnectFact {
  id: string;
  fact: string;
  category: string;
}

const FACT_CATEGORIES = [
  "professional",
  "personal",
  "preference",
  "project",
  "language",
  "general",
] as const;
const MAX_FACTS = 100; // mirrors /api/user/memory

/** List the user's memory facts (the "brain" every enhancement draws from). */
export async function connectListFacts(userId: string): Promise<ConnectFact[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("user_memory_facts")
    .select("id, fact, category")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_FACTS);
  if (error) {
    logger.error("[Connect] facts list failed:", error);
    throw new ConnectOpError(500, "list_failed", "טעינת הזיכרון נכשלה", "Memory list failed");
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    fact: String(r.fact ?? ""),
    category: String(r.category ?? "general"),
  }));
}

export async function connectRememberFact(
  userId: string,
  fact: string,
  category?: string,
): Promise<ConnectFact> {
  const trimmed = fact.trim();
  if (trimmed.length < 3 || trimmed.length > 300) {
    throw new ConnectOpError(400, "invalid_request", "עובדה חייבת להיות 3-300 תווים");
  }
  const cat = (FACT_CATEGORIES as readonly string[]).includes(category ?? "")
    ? (category as string)
    : "general";
  const db = createServiceClient();
  const { count } = await db
    .from("user_memory_facts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= MAX_FACTS) {
    throw new ConnectOpError(400, "limit_reached", "הגעת למגבלת הזיכרון (100 עובדות)");
  }
  const { data, error } = await db
    .from("user_memory_facts")
    .insert({ user_id: userId, fact: trimmed, category: cat, source: "api" })
    .select("id, fact, category")
    .single();
  if (error || !data) {
    logger.error("[Connect] remember failed:", error);
    throw new ConnectOpError(500, "save_failed", "שמירת העובדה נכשלה", "Fact save failed");
  }
  return { id: String(data.id), fact: String(data.fact), category: String(data.category) };
}

/** Thumbs up/down on an enhancement — closes the quality loop (scoring + palace). */
export async function connectRatePrompt(
  userId: string,
  input: {
    rating: 1 | -1;
    input_text?: string;
    enhanced_text?: string;
    mode?: string;
  },
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("prompt_feedback").insert({
    user_id: userId,
    rating: input.rating,
    input_text: input.input_text?.slice(0, 10_000) ?? null,
    enhanced_text: input.enhanced_text?.slice(0, 50_000) ?? null,
    capability_mode: input.mode ?? null,
  });
  if (error) {
    logger.error("[Connect] feedback failed:", error);
    throw new ConnectOpError(500, "save_failed", "שליחת המשוב נכשלה", "Feedback save failed");
  }
}

// ── P4: Memory-Palace related prompts + chains (agent-orchestrated) ─────────

export interface ConnectRelated {
  id: string;
  title: string;
  weight: number;
}

/**
 * Memory Palace neighbors for one saved prompt — same engine as the web graph
 * (`computeNeighborhood`: Jaccard keyword similarity 60% + 24h usage
 * co-occurrence 40%). Free (no credit, no LLM).
 */
export async function connectRelatedPrompts(
  userId: string,
  promptId: string,
  limit = 8,
): Promise<ConnectRelated[]> {
  const db = createServiceClient();
  const [{ data: rows, error }, { data: events }] = await Promise.all([
    db
      .from("personal_library")
      .select("id, title, prompt, tags, personal_category, capability_mode")
      .eq("user_id", userId)
      .limit(300),
    db
      .from("personal_library_usage_events")
      .select("prompt_id, used_at")
      .eq("user_id", userId)
      .order("used_at", { ascending: false })
      .limit(2000),
  ]);
  if (error) {
    logger.error("[Connect] related fetch failed:", error);
    throw new ConnectOpError(500, "get_failed", "שליפת הקשרים נכשלה", "Related fetch failed");
  }
  const corpus = ((rows ?? []) as Record<string, unknown>[]).map(
    (r) =>
      ({
        id: String(r.id),
        title: String(r.title ?? ""),
        prompt: String(r.prompt ?? ""),
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        personal_category: (r.personal_category as string) ?? "כללי",
        capability_mode: r.capability_mode,
      }) as unknown as PersonalPrompt,
  );
  if (!corpus.some((p) => p.id === promptId)) {
    throw new ConnectOpError(404, "not_found", "פרומפט לא נמצא", "Prompt not found");
  }

  const { computeNeighborhood } = await import("@/components/features/library/graph-utils");
  const { nodes, links } = computeNeighborhood({
    centerId: promptId,
    corpus,
    usageEvents: (events ?? []) as { prompt_id: string; used_at: string }[] as never,
    maxNeighbors: Math.min(Math.max(limit, 1), 19),
  });

  const weightById = new Map<string, number>();
  for (const l of links as Array<{ source: unknown; target: unknown; weight?: number }>) {
    const s = typeof l.source === "object" ? (l.source as { id: string }).id : String(l.source);
    const t = typeof l.target === "object" ? (l.target as { id: string }).id : String(l.target);
    const other = s === promptId ? t : t === promptId ? s : null;
    if (other) weightById.set(other, l.weight ?? 0);
  }
  return nodes
    .filter((n) => n.type === "prompt" && n.id !== promptId)
    .map((n) => ({ id: n.id, title: n.label, weight: weightById.get(n.id) ?? 0 }))
    .sort((a, b) => b.weight - a.weight);
}

export interface ConnectChainSummary {
  id: string;
  title: string;
  description: string | null;
  steps_count: number;
}

/** The user's saved multi-step prompt chains (free). */
export async function connectListChains(userId: string): Promise<ConnectChainSummary[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("prompt_chains")
    .select("id, title, description, steps")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) {
    logger.error("[Connect] chains list failed:", error);
    throw new ConnectOpError(500, "list_failed", "טעינת השרשראות נכשלה", "Chains list failed");
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    description: (r.description as string) ?? null,
    steps_count: Array.isArray(r.steps) ? (r.steps as unknown[]).length : 0,
  }));
}

/**
 * One chain with its FULL steps (order, prompt_text, variables,
 * input_from_step, output_description). Execution is deliberately
 * AGENT-orchestrated: the agent fills variables, runs step 0's prompt, feeds
 * its output into the next step, and so on — stateless MCP + the 60s budget
 * make server-side multi-LLM execution the wrong place for this.
 */
export async function connectGetChain(
  userId: string,
  id: string,
): Promise<{ id: string; title: string; description: string | null; steps: unknown[] }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("prompt_chains")
    .select("id, title, description, steps")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logger.error("[Connect] chain get failed:", error);
    throw new ConnectOpError(500, "get_failed", "שליפת השרשרת נכשלה", "Chain fetch failed");
  }
  if (!data) {
    throw new ConnectOpError(404, "not_found", "שרשרת לא נמצאה", "Chain not found");
  }
  return {
    id: String(data.id),
    title: String(data.title ?? ""),
    description: (data.description as string) ?? null,
    steps: Array.isArray(data.steps) ? (data.steps as unknown[]) : [],
  };
}
