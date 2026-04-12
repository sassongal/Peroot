/**
 * Pure builder for the `details` JSON column written to `activity_logs`.
 * Extracted to eliminate the duplication between the cache-hit path and the
 * live-generation path in the enhance route, and to make the shape unit-testable.
 */

export interface ActivityLogDetails {
  mode: string;
  model: string;
  latency_ms: number;
  tokens: unknown;
  prompt_length: number;
  result_length: number;
  tone: string;
  category: string;
  capability_mode: string;
  target_model: string;
  is_refinement: boolean;
  has_context: boolean;
  context_count: number;
  attachment_tokens_est: number;
  iteration: number;
  json_output: boolean;
  json_valid?: boolean | null;
  json_error?: string | null;
  injection?: unknown | null;
  cache_hit?: true;
}

export interface ActivityLogParams {
  mode: string;
  modelId: string;
  durationMs: number;
  tokens: unknown;
  prompt: string;
  resultText: string;
  tone: string;
  category: string;
  capabilityMode: string | undefined;
  targetModel: string | undefined;
  isRefinement: boolean;
  contextAttachments?: Array<{ tokenCount?: number }>;
  iteration?: number;
  isJsonOutput: boolean;
  /** Defined only on the live path (JSON engines). Omit for cache-hit path. */
  jsonValid?: boolean | null;
  /** Defined only on the live path (JSON engines). Omit for cache-hit path. */
  jsonError?: string | null;
  /** Injection telemetry from BaseEngine. Omit for cache-hit path. */
  injectionStats?: unknown;
  /** Set to true for cache-hit rows so admins can filter in activity_logs. */
  cacheHit?: boolean;
}

/**
 * Builds the `details` object stored in `activity_logs.details`.
 * Pure function — no side effects.
 */
export function buildActivityLogDetails(params: ActivityLogParams): ActivityLogDetails {
  const details: ActivityLogDetails = {
    mode: params.mode,
    model: params.modelId,
    latency_ms: params.durationMs,
    tokens: params.tokens,
    prompt_length: params.prompt.length,
    result_length: params.resultText.length,
    tone: params.tone,
    category: params.category,
    capability_mode: params.capabilityMode || "STANDARD",
    target_model: params.targetModel || "general",
    is_refinement: params.isRefinement,
    has_context: !!(params.contextAttachments && params.contextAttachments.length > 0),
    context_count: params.contextAttachments?.length ?? 0,
    attachment_tokens_est: (params.contextAttachments ?? []).reduce(
      (sum, c) => sum + (c.tokenCount ?? 0),
      0,
    ),
    iteration: params.iteration ?? 0,
    json_output: params.isJsonOutput,
  };

  if (params.jsonValid !== undefined) details.json_valid = params.jsonValid;
  if (params.jsonError !== undefined) details.json_error = params.jsonError;
  if (params.injectionStats !== undefined) details.injection = params.injectionStats ?? null;
  if (params.cacheHit) details.cache_hit = true;

  return details;
}
