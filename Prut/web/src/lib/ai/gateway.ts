import { streamText, generateText, StreamTextResult } from "ai";
import { AVAILABLE_MODELS, FALLBACK_ORDER, ModelId, getModelsForTask } from "./models";
import { isProviderAvailable, recordSuccess, recordFailure } from "./circuit-breaker";
import { acquireSlot, releaseSlot } from "./concurrency";
import { logger } from "@/lib/logger";

export interface GatewayParams {
  system: string;
  prompt: string;
  temperature?: number;
  /**
   * Maximum output tokens. If omitted, the gateway picks a task-appropriate
   * default (see pickDefaults). Image/video tasks need a higher ceiling
   * because structured or JSON output is 2-3× the token count of prose.
   */
  maxOutputTokens?: number;
  /**
   * Optional preferred model from the context-router. When set, this model
   * is prepended to the task fallback chain so it is tried first. If the
   * model is already first in the chain, no-op.
   */
  preferredModel?: string;
  /**
   * Estimated total input token count (prompt + system + context injections).
   * When set, models whose context window cannot fit this input are dropped
   * from the fallback chain before the first attempt. See filterModelsForEstimatedInput.
   */
  estimatedInputTokens?: number;
  onFinish?: (completion: { usage: unknown; text: string }) => Promise<void>;
  onStreamEnd?: () => void;
}

/**
 * Task-aware generation parameter defaults. Before this existed we called
 * streamText with just temperature: 0.7 and no maxOutputTokens, which meant:
 *   - Gemini 2.5 Flash defaulted to ~8192 output tokens — fine for prose,
 *     but JSON image/video prompts exceeded that and got truncated mid-value.
 *   - temperature 0.7 introduced structural noise in JSON (missing commas,
 *     unclosed brackets) because the sampler wandered at decision points.
 *
 * Values tuned per task type:
 *   - image/video: 8192 tokens + 0.5 temp. JSON-style image/video prompts
 *     often run 1500-3000 tokens; 8192 gives headroom for verbose cinematic
 *     specs. Temp 0.5 keeps creative variation while stabilizing structure.
 *   - enhance/agent: 4096 tokens + 0.7 temp. Text prompts rarely exceed
 *     2000 tokens; 4096 is safe. 0.7 preserves the existing creative feel.
 *   - research: 6144 tokens + 0.6 temp. Research outputs are longer due to
 *     citations and summaries but need more factual stability.
 *   - chain: 3072 tokens + 0.4 temp. Chain steps should be concise and
 *     deterministic so downstream steps can reference them reliably.
 */
/**
 * Absolute ceiling applied to maxOutputTokens regardless of caller override.
 * Protects against a buggy or malicious internal caller passing something
 * like maxOutputTokens: 999999 and blowing out provider cost budgets.
 *
 * Chosen above the largest planned preset (image/video: 8192) so no
 * legitimate caller is ever clipped, but low enough that a runaway caller
 * cannot exceed ~2x the largest planned task output.
 *
 * Raise this constant if a future task type legitimately needs more.
 */
const HARD_MAX_OUTPUT_TOKENS = 16384;

/**
 * @internal Exported for tests only. Treat as module-private.
 *
 * Task-aware generation parameter defaults + clamp. See the multi-line
 * comment above this function definition in the source file for rationale
 * on the per-task presets.
 */
export function pickDefaults(
  task?: string,
  userMax?: number,
  userTemp?: number,
): {
  maxOutputTokens: number;
  temperature: number;
} {
  // Image/video run at a 16K ceiling as belt-and-suspenders. Even with
  // Gemini thinking disabled (see buildProviderOptions below), complex
  // JSON image prompts from Stable Diffusion / Gemini Image / Midjourney
  // can approach 6K-8K tokens. A 16K ceiling removes the last truncation
  // risk without making any run actually more expensive — real cost is
  // whatever the model emits, capped at this ceiling only.
  // Token budgets were lifted across the board after a live end-to-end
  // test (scripts/test-engines-live.ts) showed Gemini 2.5 Flash running
  // out of output budget BEFORE reaching the trailing [PROMPT_TITLE] and
  // [GENIUS_QUESTIONS] markers on enhance/agent/research.
  //
  // Root cause: Gemini's thinking tokens count against maxOutputTokens.
  // BaseEngine composes a very long system prompt (engine template +
  // GENIUS_ANALYSIS + classification + examples + mistakes + CoT + scoring),
  // which triggers heavy reasoning — observed ~2500 thinking tokens for a
  // Standard prompt. At the old 4096 ceiling that leaves only ~1500 tokens
  // for actual output, which is enough for the enhanced prompt but NOT
  // enough to reach the trailing marker blocks the client needs for
  // parsing. Hebrew output also costs 2-3× more tokens per character than
  // English, amplifying the squeeze.
  //
  // The fix: widen the ceiling so thinking + actual output + trailing
  // markers all fit. We do NOT disable thinking (thinkingBudget=0) for
  // these tasks because thinking measurably improves enhance/research
  // quality on complex inputs — we only disable it for image/video/chain
  // (see buildProviderOptions).
  const presets: Record<string, { max: number; temp: number }> = {
    image: { max: 16384, temp: 0.5 },
    video: { max: 16384, temp: 0.5 },
    research: { max: 16384, temp: 0.6 }, // raised 10240 → 16384: Hebrew + citations
    // expand output; matches HARD_MAX so research
    // can use full budget without silent cuts.
    enhance: { max: 8192, temp: 0.7 }, // was 4096 — Gemini thinking consumed budget
    agent: { max: 16384, temp: 0.7 }, // was 8192 — Gemini reasoning averages 5.4K
    // tokens on agent (2x enhance), and output
    // needs 5-6K for the 9-section architecture
    // + PROMPT_TITLE + GENIUS_QUESTIONS trailer.
    // Live test: output=8188 reasoning=5452 = hard ceiling hit.
    chain: { max: 3072, temp: 0.4 },
    classify: { max: 256, temp: 0.2 }, // Lightweight classification task: tiny JSON
    // output, low temp for determinism.
  };
  const preset = presets[task ?? "enhance"] ?? presets.enhance;
  const requestedMax = userMax ?? preset.max;
  return {
    maxOutputTokens: Math.min(requestedMax, HARD_MAX_OUTPUT_TOKENS),
    temperature: userTemp ?? preset.temp,
  };
}

/**
 * Shape of the providerOptions payload we pass to the AI SDK. Typed as the
 * exact nested object the Google provider expects so TypeScript lets us
 * pass it directly to `streamText({ providerOptions })` without casting.
 * Other providers silently ignore the `google` key.
 */
type PerootProviderOptions = {
  google: {
    thinkingConfig: {
      thinkingBudget: number;
    };
  };
};

/**
 * Build provider-specific options for a given task. This is where we disable
 * the reasoning mode for tasks that need every output token for the actual
 * response rather than internal thinking.
 *
 * Root cause: Gemini's thinking tokens count against maxOutputTokens. For
 * image/video JSON tasks the reasoning was consuming 700-1000+ tokens,
 * leaving only 60-100 tokens of actual JSON output — which cut responses
 * at ~130-180 characters, mid-string (observed in activity_logs.details).
 * Passing thinkingBudget: 0 via providerOptions.google turns reasoning OFF
 * entirely so the full budget is available for actual output tokens.
 *
 * Non-Google providers silently ignore the `google` key in providerOptions
 * so it's safe to pass unconditionally on the fallback chain.
 *
 * @internal Exported for tests only.
 */
export function buildProviderOptions(task?: string): PerootProviderOptions | undefined {
  // Only tasks that produce long structured output need thinking disabled.
  // Enhance/agent/research actually benefit from the reasoning mode, so
  // we leave them with default thinking behavior.
  const thinkingDisabledTasks = new Set(["image", "video", "chain", "classify"]);
  if (!task || !thinkingDisabledTasks.has(task)) {
    return undefined;
  }
  return {
    google: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };
}

// Approximate chars-per-token ratio used for context-window pre-filtering.
const CHARS_PER_TOKEN = 4;

// Context windows for models that have smaller-than-HARD_MAX windows.
// Only list models whose context is a practical constraint for us.
const MODEL_CONTEXT_TOKENS: Partial<Record<string, number>> = {
  "gpt-oss-20b": 32_768, // 32k context; reserve ~12k for output → 20k input safe
};

/**
 * Drops models from the fallback chain whose context window cannot fit the
 * estimated input token count (leaving no room for output).
 *
 * Keeps at least one model in the chain regardless of size.
 *
 * @internal Exported for tests only.
 */
export function filterModelsForEstimatedInput(
  chain: string[],
  estimatedInputTokens: number,
): string[] {
  if (chain.length <= 1) return chain;
  const filtered = chain.filter((modelId) => {
    const contextLimit = MODEL_CONTEXT_TOKENS[modelId];
    if (!contextLimit) return true; // model not in our constraint map → keep
    // Reserve ~40% of context for output
    const safeInputLimit = Math.floor(contextLimit * 0.6);
    return estimatedInputTokens <= safeInputLimit;
  });
  return filtered.length > 0 ? filtered : [chain[0]];
}

export class AIGateway {
  /**
   * Attempts to generate text streaming using the defined fallback order.
   * Includes circuit breaker (skip failing providers) and concurrency limiter
   * (queue excess requests instead of overwhelming providers).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- StreamTextResult's
  // generic parameter requires ai SDK's ToolSet type. Using `unknown` breaks
  // the constraint; importing ToolSet leaks provider internals into our API.
  // `any` here is isolated to the return position and narrowed by callers.
  static async generateStream(
    params: GatewayParams & { task?: string; userTier?: "free" | "pro" | "guest" },
  ): Promise<{ result: StreamTextResult<Record<string, any>, any>; modelId: ModelId }> {
    // Acquire a concurrency slot (waits in queue if at capacity)
    await acquireSlot();

    let slotReleased = false;
    const safeRelease = () => {
      if (!slotReleased) {
        slotReleased = true;
        releaseSlot();
      }
    };

    let lastError: unknown;
    const baseModels = params.task
      ? getModelsForTask(params.task, params.userTier)
      : FALLBACK_ORDER;
    const preferredChain =
      params.preferredModel && params.preferredModel !== baseModels[0]
        ? [
            params.preferredModel as ModelId,
            ...baseModels.filter((m) => m !== params.preferredModel),
          ]
        : baseModels;
    const models = params.estimatedInputTokens
      ? (filterModelsForEstimatedInput(
          [...preferredChain],
          params.estimatedInputTokens,
        ) as ModelId[])
      : preferredChain;

    try {
      for (const modelId of models) {
        const config = AVAILABLE_MODELS[modelId];
        if (!config) continue;

        // Circuit breaker: skip providers that are currently failing
        if (!(await isProviderAvailable(config.provider))) {
          logger.info(`[AIGateway] Skipping ${config.label} (circuit open)`);
          continue;
        }

        // Provider API key checks
        if (config.provider === "groq" && !process.env.GROQ_API_KEY) continue;
        if (config.provider === "mistral" && !process.env.MISTRAL_API_KEY) continue;

        try {
          logger.info(`[AIGateway] Attempting: ${config.label}...`);

          const defaults = pickDefaults(params.task, params.maxOutputTokens, params.temperature);
          const providerOptions = buildProviderOptions(params.task);
          const result = await streamText({
            model: config.model,
            system: params.system,
            prompt: params.prompt,
            temperature: defaults.temperature,
            maxOutputTokens: defaults.maxOutputTokens,
            ...(providerOptions ? { providerOptions } : {}),
            onFinish: async (completion) => {
              recordSuccess(config.provider);
              safeRelease();
              if (params.onFinish) {
                await params.onFinish(completion);
              }
            },
          });

          // Safety timeout: release slot if stream hangs for 5 minutes
          const safetyTimeout = setTimeout(
            () => {
              logger.warn(`[AIGateway] Safety timeout - releasing slot for ${config.label}`);
              safeRelease();
            },
            5 * 60 * 1000,
          );
          Promise.resolve(result.text).then(
            () => clearTimeout(safetyTimeout),
            () => {
              clearTimeout(safetyTimeout);
              safeRelease();
            },
          );

          return { result, modelId };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`[AIGateway] Failed with ${modelId}: ${errorMessage}`);
          await recordFailure(config.provider);
          lastError = error;
          continue;
        }
      }

      // All models failed
      safeRelease();
      throw lastError || new Error("All AI models failed to respond.");
    } catch (err) {
      safeRelease();
      throw err;
    }
  }

  /**
   * Non-streaming generation — more efficient for structured JSON output.
   * No SSE overhead, lower latency for short responses.
   */
  static async generateFull(
    params: GatewayParams & { task?: string; userTier?: "free" | "pro" | "guest" },
  ): Promise<{ text: string; modelId: ModelId; usage?: unknown }> {
    await acquireSlot();

    let slotReleased = false;
    const safeRelease = () => {
      if (!slotReleased) {
        slotReleased = true;
        releaseSlot();
      }
    };

    let lastError: unknown;
    const baseModels2 = params.task
      ? getModelsForTask(params.task, params.userTier)
      : FALLBACK_ORDER;
    const preferredChain2 =
      params.preferredModel && params.preferredModel !== baseModels2[0]
        ? [
            params.preferredModel as ModelId,
            ...baseModels2.filter((m) => m !== params.preferredModel),
          ]
        : baseModels2;
    const models = params.estimatedInputTokens
      ? (filterModelsForEstimatedInput(
          [...preferredChain2],
          params.estimatedInputTokens,
        ) as ModelId[])
      : preferredChain2;

    try {
      for (const modelId of models) {
        const config = AVAILABLE_MODELS[modelId];
        if (!config) continue;
        if (!(await isProviderAvailable(config.provider))) {
          logger.info(`[AIGateway] Skipping ${config.label} (circuit open)`);
          continue;
        }
        if (config.provider === "groq" && !process.env.GROQ_API_KEY) continue;
        if (config.provider === "mistral" && !process.env.MISTRAL_API_KEY) continue;

        try {
          logger.info(`[AIGateway] generateFull: ${config.label}...`);
          const defaults = pickDefaults(params.task, params.maxOutputTokens, params.temperature);
          const providerOptions = buildProviderOptions(params.task);
          const result = await generateText({
            model: config.model,
            system: params.system,
            prompt: params.prompt,
            temperature: defaults.temperature,
            maxOutputTokens: defaults.maxOutputTokens,
            ...(providerOptions ? { providerOptions } : {}),
          });
          recordSuccess(config.provider);
          safeRelease();
          if (params.onFinish) {
            await params.onFinish({ usage: result.usage, text: result.text });
          }
          return { text: result.text, modelId, usage: result.usage };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`[AIGateway] generateFull failed with ${modelId}: ${errorMessage}`);
          await recordFailure(config.provider);
          lastError = error;
          continue;
        }
      }
      safeRelease();
      throw lastError || new Error("All AI models failed to respond.");
    } catch (err) {
      safeRelease();
      throw err;
    }
  }
}
