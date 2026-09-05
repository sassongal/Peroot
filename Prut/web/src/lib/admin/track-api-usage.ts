import { createServiceClient } from "@/lib/supabase/service";
import type { ModelId } from "@/lib/ai/models";
import { AVAILABLE_MODELS } from "@/lib/ai/models";
import { logger } from "@/lib/logger";

/**
 * Pricing per 1M tokens (USD) - updated September 2026 against the official
 * provider price lists. The Google key runs on the PAID tier, so these are
 * real costs now, not budgeting estimates.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3-flash": { input: 0.5, output: 3.0 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "llama-4-scout": { input: 0.11, output: 0.34 },
  "gpt-oss-20b": { input: 0.0, output: 0.0 },
  "mistral-small": { input: 0.15, output: 0.6 },
};

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[modelId];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

interface SkillMetadata {
  type?: "image" | "video" | "text";
  platform?: string;
  examplesSelected?: string[]; // Category names of selected examples
  hasMistakes?: boolean;
  hasScoring?: boolean;
}

interface ApiUsageData {
  userId?: string;
  modelId: ModelId;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  endpoint?: string;
  /** Lowercase snake_case, aligned with prompt_engines.mode (e.g. deep_research) */
  engineMode?: string;
  skillMetadata?: SkillMetadata;
  /**
   * True when the response was served from the Redis result cache and no
   * LLM provider was called. For cache hits, inputTokens/outputTokens/cost
   * should all be zero — we still log the row so the dashboard can compute
   * hit rate per endpoint.
   */
  cacheHit?: boolean;
}

/**
 * Track API usage to api_usage_logs table.
 * Fire-and-forget - errors are logged but don't block the request.
 *
 * Skill metadata is logged via logger.info as structured JSON so it appears
 * in Vercel logs and can be queried later. We also attempt to insert it into
 * the api_usage_logs.metadata column if it exists, with a try/catch fallback
 * to a metadata-less insert if the column is missing.
 */
export async function trackApiUsage(data: ApiUsageData): Promise<void> {
  try {
    // SERVICE client, not the cookie-bound SSR client. This is
    // server-side cost accounting written inside `after()`, where the
    // user session can already be gone — the same trap that silently
    // dropped history rows on the enhance path. It is also the only way
    // guest and API-key traffic gets logged at all, now that the
    // api_usage_logs INSERT policy is scoped to auth.uid() = user_id.
    const supabase = createServiceClient();
    const config = AVAILABLE_MODELS[data.modelId];
    const cost = estimateCost(data.modelId, data.inputTokens, data.outputTokens);

    const baseRow: Record<string, unknown> = {
      user_id: data.userId || null,
      provider: config?.provider || "unknown",
      model: data.modelId,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      estimated_cost_usd: cost,
      endpoint: data.endpoint || "enhance",
      duration_ms: data.durationMs,
      cache_hit: data.cacheHit === true,
    };
    if (data.engineMode) {
      baseRow.engine_mode = data.engineMode;
    }

    // Always log skill metadata as structured info so it's queryable in Vercel logs.
    if (data.skillMetadata) {
      logger.info(
        "[ApiUsage:skill]",
        JSON.stringify({
          userId: data.userId || null,
          model: data.modelId,
          endpoint: data.endpoint || "enhance",
          durationMs: data.durationMs,
          skill: data.skillMetadata,
        }),
      );
    }

    // Attempt insert with metadata column first; fall back to a plain insert
    // if the column doesn't exist (schema not yet migrated).
    if (data.skillMetadata) {
      const { error: metaError } = await supabase
        .from("api_usage_logs")
        .insert({ ...baseRow, metadata: data.skillMetadata });

      if (metaError) {
        // Likely the column doesn't exist — fall back silently.
        await supabase.from("api_usage_logs").insert(baseRow);
      }
    } else {
      await supabase.from("api_usage_logs").insert(baseRow);
    }
  } catch (error) {
    logger.error("[TrackApiUsage] Failed to log usage:", error);
  }
}
