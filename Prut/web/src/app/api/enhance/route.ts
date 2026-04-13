
import { z } from "zod";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse, after } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { selectEngineModel } from '@/lib/ai/context-router';
import type { ContextBlock } from '@/lib/context/engine/types';
import { CapabilityMode, parseCapabilityMode, capabilityModeToDbMode } from "@/lib/capability-mode";
import { checkRateLimit } from "@/lib/ratelimit";
import { AIGateway } from "@/lib/ai/gateway";
import { ConcurrencyError } from "@/lib/ai/concurrency";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import { logger } from "@/lib/logger";
import { checkAndDecrementCredits, refundCredit } from "@/lib/services/credit-service";
import { buildCacheKey, getCached, setCached } from "@/lib/ai/enhance-cache";
import { acquireInflightLock } from "@/lib/ai/inflight-lock";
import { AVAILABLE_MODELS, type ModelId } from "@/lib/ai/models";
import { enqueueJob } from "@/lib/jobs/queue";
import { resolveAuth, ApiAuthError } from "./lib/auth";
import { buildActivityLogDetails } from "./lib/activity-log";
import { saveEnhanceResults, maybeEnqueueBackgroundJobs } from "./lib/after-stream";
import { resolveUserContext } from "./lib/user-context";
import { buildEngineInput } from "./lib/engine-input";
import { validateJsonOutput } from "./lib/json-validator";

export const maxDuration = 30;

const RequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  tone: z.string().default("Professional"),
  category: z.string().default("כללי"),
  capability_mode: z.string().optional(),
  mode_params: z.record(z.string(), z.string()).optional(),
  previousResult: z.string().optional(),
  refinementInstruction: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
  iteration: z.number().int().min(0).optional(),
  target_model: z.enum(['chatgpt', 'claude', 'gemini', 'general']).default('general').optional(),
  // Accepts both the legacy shape { type, name, content } and the new
  // ContextBlock shape { id, type, sha256, stage, display, injected }.
  // passthrough() lets unknown keys (display, injected, sha256, stage)
  // flow through without stripping them.
  context: z.array(z.object({
    type: z.enum(['file', 'url', 'image']),
    name: z.string().optional(),
    content: z.string().optional(),
    tokenCount: z.number().optional(),
    format: z.string().optional(),
    filename: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).max(15).optional(),
});

/**
 * Standardized error for rate limiting
 */
const RateLimitError = (reset: number) => NextResponse.json(
    { error: "Too many requests. Please try again later.", reset_at: reset },
    { status: 429, headers: { "Retry-After": reset.toString() } }
);

export async function POST(req: Request) {
  // Declare outside try so catch block can access for credit refund
  let userId: string | undefined;
  let supabase: Awaited<ReturnType<typeof createClient>> | undefined;
  // Declared here so catch block can release the in-flight lock on any
  // error path, not just the happy path that reaches after().
  let releaseInflightLock: (() => Promise<void>) | null = null;

  // Parse JSON before main try block so SyntaxError doesn't trigger credit refund
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { prompt, tone, category, capability_mode, mode_params, previousResult, refinementInstruction, answers, iteration, context: contextAttachments, target_model } = RequestSchema.parse(json);

    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);

    supabase = await createClient();

    // Resolve caller identity: API key (prk_*), extension Bearer JWT, or session cookie
    let bearerToken: string | undefined;
    let useServiceClient: boolean;
    try {
      ({ userId, bearerToken, useServiceClient } = await resolveAuth(req, supabase));
    } catch (err) {
      if (err instanceof ApiAuthError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      throw err;
    }

    // Guest access: allow unauthenticated users with IP-based rate limiting
    const isGuest = !userId;

    // When using Bearer token or API key, RLS won't have auth.uid() set,
    // so use service role client to bypass RLS
    const queryClient = useServiceClient
        ? createServiceClient()
        : supabase;

    // 1. Context Fetching — resolve user tier, admin flag, history, and personality.
    // Profile results are cached in-module (TTL 15s) to avoid a DB round-trip on every request.
    const { tier, isAdmin, historyRes, personalityRes } = await resolveUserContext({
        userId,
        queryClient,
        isRefinement,
    });

    // 1.5 Capability Mode Gating -- advanced modes require Pro (checked before
    // credit decrement so free users are not charged for gated requests)
    const mode = parseCapabilityMode(capability_mode);
    if (mode !== CapabilityMode.STANDARD && tier !== 'pro' && !isAdmin) {
      return NextResponse.json(
        { error: "שדרג ל-Pro כדי להשתמש במצב זה" },
        { status: 403 }
      );
    }

    if (!isAdmin) {
        // 2. Execute Rate Limiting
        const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        const identifier = userId || clientIp;
        if (!identifier) {
            return NextResponse.json({ error: "Unable to identify request source" }, { status: 400 });
        }

        // Guests get stricter rate limiting (5/hour via 'guest' tier)
        // Admin tier is treated as 'pro' for rate limiting
        const rateLimitTier = isGuest ? 'guest' : (tier === 'admin' ? 'pro' : tier);
        const limitResult = await checkRateLimit(identifier, rateLimitTier);

        if (!limitResult.success) {
            return RateLimitError(limitResult.reset);
        }

        // 3. ATOMIC Credit Enforcement (Prevention of Concurrent Overuse)
        // Skip credit checks for guests - they are rate-limited by IP instead
        if (userId) {
            const creditResult = await checkAndDecrementCredits(userId, tier, queryClient);
            if (!creditResult.allowed) {
                return NextResponse.json({
                    error: creditResult.error || "Insufficient credits or profile not found",
                    balance: creditResult.remaining
                }, { status: 403 });
            }
        }
    }

    // 3.5 In-flight dedup — a double-click or client retry within the
    // same 10-second window will be rejected with 409 so we don't charge
    // two credits for one logical request. We hash prompt + mode + tone +
    // target + attachments so only genuinely identical payloads collide.
    // If Redis is unreachable the helper fails open — see inflight-lock.ts.
    const contextFingerprint = contextAttachments && contextAttachments.length > 0
        ? createHash('sha256')
            .update(contextAttachments.map(c => `${c.type}|${c.name}|${c.content?.slice(0, 1024) ?? ''}`).join('\u0000'))
            .digest('hex')
        : null;
    const lock = await acquireInflightLock({
        userId,
        prompt,
        mode: capability_mode,
        tone,
        category,
        targetModel: target_model || 'general',
        isRefinement,
        contextFingerprint,
    });
    if (!lock.acquired) {
        // Refund the credit we just decremented — this request never ran.
        if (userId) {
            await refundCredit(userId);
        }
        return NextResponse.json(
            { error: "בקשה זהה כבר בתהליך. נסה שוב בעוד רגע." },
            { status: 409, headers: { "Retry-After": "2" } }
        );
    }
    releaseInflightLock = lock.release;

    // 4. Engine Selection & Generation
    const engine = await getEngine(mode);

    // 4.5 Style RAG Processing (using pre-fetched data)
    // historyRes can come from two sources depending on the flag:
    //   - history table:        { title, prompt, enhanced_prompt }
    //   - personal_library:     { title, prompt }
    // buildEngineInput normalizes both into the engine's expected shape so the
    // engine code stays source-agnostic.
    const engineInput: EngineInput = buildEngineInput({
        prompt,
        tone,
        category,
        mode,
        modeParams: mode_params,
        previousResult,
        refinementInstruction,
        answers,
        userId,
        isGuest,
        isRefinement,
        historyRes,
        personalityRes,
        iteration,
        // Cast to satisfy EngineInput — name/content may be absent on new ContextBlock shape;
        // BaseEngine.buildContextSummaryForUserPrompt handles both shapes defensively.
        context: contextAttachments as EngineInput['context'],
        targetModel: target_model,
    });
    const userHistory = engineInput.userHistory ?? [];
    const userPersonality = engineInput.userPersonality;

    const engineOutput = isRefinement
        ? engine.generateRefinement(engineInput)
        : engine.generate(engineInput);

    // Anchor 4: classify the input by what the USER attached, not where the
    // request came from. The first context attachment wins; raw text is the
    // default. This populates history.input_source so the dashboard and
    // future filters can group "from PDF" vs "from URL" etc.
    const firstContextType = contextAttachments?.[0]?.type;
    const inputSource: 'text' | 'file' | 'url' | 'image' =
        firstContextType === 'file' ? 'file'
        : firstContextType === 'url' ? 'url'
        : firstContextType === 'image' ? 'image'
        : 'text';

    // Derive the history `source` field from the auth method used
    const historySource: "api" | "extension" | "web" =
      bearerToken?.startsWith("prk_") ? "api" : bearerToken ? "extension" : "web";

    // 4.6 Result cache lookup. Scoped PER USER (no cross-user sharing) and
    // skipped whenever personalization signal or context attachments are
    // present — see src/lib/ai/enhance-cache.ts for the full skip rules.
    // The X-Peroot-Cache-Bypass header lets power users force a fresh run.
    const bypassCache = req.headers.get("x-peroot-cache-bypass") === "1";
    const cacheKey = bypassCache ? null : buildCacheKey({
        prompt,
        mode: capability_mode,
        tone,
        category,
        targetModel: target_model || "general",
        userId,
        hasContext: !!(contextAttachments && contextAttachments.length > 0),
        hasPersonalization: !!(userHistory.length > 0 || userPersonality),
        isRefinement,
    });

    if (cacheKey) {
        const cacheCheckStart = Date.now();
        const cached = await getCached(cacheKey);
        if (cached) {
            const cacheLatencyMs = Date.now() - cacheCheckStart;

            // Runtime-validate the cached modelId against the current model
            // union. A model removed between cache write and read (e.g., the
            // recent removal of gemini-2.5-pro / deepseek-chat) would otherwise
            // write 'unknown' provider rows and pollute the dashboard.
            const cachedModelId: ModelId =
                cached.modelId in AVAILABLE_MODELS
                    ? (cached.modelId as ModelId)
                    : "gemini-2.5-flash";

            // Log the hit so the dashboard can compute hit rate. inputTokens
            // and outputTokens are 0 because no LLM was called. durationMs
            // reflects the actual cache-lookup latency (small, but real — so
            // cache-hit rows do not skew average-duration metrics toward 0).
            trackApiUsage({
                userId,
                modelId: cachedModelId,
                inputTokens: 0,
                outputTokens: 0,
                durationMs: cacheLatencyMs,
                endpoint: "enhance",
                cacheHit: true,
                engineMode: capabilityModeToDbMode(mode),
            });

            // Fix #3: refund the credit we decremented above. Cache hits cost
            // Peroot zero LLM tokens, so the user should not pay a quota unit
            // for them either. Guests have no credit, admins were never
            // charged; both are no-ops in refundCredit.
            if (userId) {
                await refundCredit(userId);
            }

            // Cache-hit side effects run AFTER the response is sent so the
            // client gets its bytes immediately and the function duration
            // isn't blocked on DB latency. `after()` is a first-class Next.js
            // 16 primitive for exactly this pattern.
            after(async () => {
                try {
                    if (userId && supabase) {
                        const cacheHitDetails = buildActivityLogDetails({
                            mode: String(mode),
                            modelId: cachedModelId,
                            durationMs: cacheLatencyMs,
                            tokens: { inputTokens: 0, outputTokens: 0 },
                            prompt,
                            resultText: cached.text,
                            tone,
                            category,
                            capabilityMode: capability_mode,
                            targetModel: target_model,
                            isRefinement,
                            contextAttachments,
                            iteration,
                            isJsonOutput: engineOutput.outputFormat === 'json',
                            cacheHit: true,
                        });

                        await saveEnhanceResults({
                            queryClient: queryClient as ReturnType<typeof createServiceClient>,
                            userId,
                            prompt,
                            enhancedPrompt: cached.text,
                            tone,
                            category,
                            capabilityMode: capability_mode,
                            inputSource,
                            source: historySource,
                            isRefinement,
                            activityLogDetails: cacheHitDetails,
                        });

                        try {
                            await enqueueJob('achievement_check', { userId });
                        } catch (bgError) {
                            logger.error("[EnhanceAPI:cache-hit] achievement_check enqueue failed:", bgError);
                        }
                    }
                } finally {
                    await lock.release();
                }
            });

            // Return the cached text as a plain text stream. We use a
            // ReadableStream rather than a new Response(text) so the client
            // sees the same text-stream shape as the live path, keeping the
            // frontend parser unchanged.
            const encoder = new TextEncoder();
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(encoder.encode(cached.text));
                    controller.close();
                },
            });
            return new Response(stream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Peroot-Cache": "hit",
                },
            });
        }
    }

    // 5. Execution with Streaming & Telemetry via Gateway
    const startTime = Date.now();
    // NOTE: Do NOT pass temperature/maxOutputTokens here. The gateway's
    // pickDefaults() chooses task-aware values (e.g., image/video get
    // 0.5 temp + 8192 maxOutputTokens because JSON image prompts need
    // more headroom and tighter structure than prose). Overriding with a
    // hardcoded 0.7 here would bypass that and cause the exact truncation
    // bug we just fixed upstream.
    const resolvedTask = mode === CapabilityMode.IMAGE_GENERATION ? 'image'
        : mode === CapabilityMode.VIDEO_GENERATION ? 'video'
        : mode === CapabilityMode.DEEP_RESEARCH ? 'research'
        : mode === CapabilityMode.AGENT_BUILDER ? 'agent'
        : 'enhance';
    const isJsonOutput = engineOutput.outputFormat === 'json';

    // Refine requests (previousResult + refinementInstruction/answers) reuse
    // the enhance task preset (4096 tokens). That preset is tuned for a
    // first-pass prompt rewrite, but Refine output is longer: the engine
    // re-emits the full enhanced prompt AND a fresh [GENIUS_QUESTIONS] block
    // AND a [PROMPT_TITLE] block, which together commonly exceed 4096 tokens
    // and trigger finishReason='length' mid-answer. We lift the ceiling to
    // 8192 for Refine on enhance/agent, and to 16384 for research (matches
    // pickDefaults research preset; refinement restates the brief).
    // Image/video already use their own 16384 preset.
    const refinementMaxTokens = isRefinement
        ? (resolvedTask === 'enhance' || resolvedTask === 'agent' ? 8192
           : resolvedTask === 'research' ? 16384
           : undefined)
        : undefined;

    // Only pass items that carry the new ContextBlock shape (have injected.tokenCount).
    // Legacy-shape context payloads (old { type, name, content } format) are skipped
    // so the router gracefully falls back to the default model.
    const contextBlocks = (contextAttachments ?? [])
      .filter(a => {
        const block = a as unknown as ContextBlock;
        return block.injected
          && typeof block.injected.tokenCount === 'number'
          && block.injected.tokenCount > 0
          && block.injected.tokenCount < 100_000;
      }) as unknown as ContextBlock[];
    const preferredModel = selectEngineModel({ blocks: contextBlocks });

    const { result, modelId } = await AIGateway.generateStream({
      system: engineOutput.systemPrompt,
      prompt: engineOutput.userPrompt,
      task: resolvedTask,
      preferredModel,
      // Refine lifts the ceiling from 4096 → 8192; everything else stays
      // on the task preset (undefined = use pickDefaults).
      ...(refinementMaxTokens !== undefined ? { maxOutputTokens: refinementMaxTokens } : {}),
      userTier: tier === 'guest' ? 'guest' : (tier === 'admin' ? 'pro' : tier),
      onFinish: async (completion) => {
        const durationMs = Date.now() - startTime;
        const textCopy = completion.text;
        const usageCopy = completion.usage;
        const finishReasonCopy = (completion as { finishReason?: string }).finishReason;

        // All non-critical work (DB writes, telemetry, job enqueue,
        // cache write, refund) runs AFTER the client's stream finishes.
        // This drops p95/p99 because the function's wall-clock duration
        // no longer includes DB latency. `after()` is the Next.js 16
        // primitive designed for exactly this pattern.
        after(async () => {
                try {
                    // JSON validity check — applied only to engines that declared
                    // outputFormat 'json' (currently: Stable Diffusion JSON and
                    // Gemini Image JSON). We strip GENIUS_QUESTIONS / PROMPT_TITLE
                    // trailing blocks before parsing because the engine appends
                    // those after the main JSON payload. If parsing still fails,
                    // we log the first 200 chars of the failing output to
                    // activity_logs so admins can monitor invalid-JSON rate.
                    let jsonValid: boolean | null = null;
                    let jsonError: string | null = null;
                    if (isJsonOutput && textCopy.length > 0) {
                        ({ jsonValid, jsonError } = validateJsonOutput(textCopy));
                        if (!jsonValid) {
                            logger.warn('[Enhance] Invalid JSON output', {
                                modelId,
                                capability_mode,
                                error: jsonError,
                                sample: textCopy.slice(0, 200),
                            });
                        }
                    }

                    // Track API usage for cost analysis.
                    // AI SDK v6 uses inputTokens/outputTokens (v5 was
                    // promptTokens/completionTokens). We keep the legacy names as a
                    // fallback so older SDK versions don't silently log zeros.
                    const usage = usageCopy as
                        | { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number }
                        | undefined;
                    trackApiUsage({
                        userId: userId,
                        modelId,
                        inputTokens: usage?.inputTokens ?? usage?.promptTokens ?? 0,
                        outputTokens: usage?.outputTokens ?? usage?.completionTokens ?? 0,
                        durationMs,
                        endpoint: 'enhance',
                        cacheHit: false,
                        engineMode: capabilityModeToDbMode(mode),
                    });

                    if (resolvedTask === 'research' && finishReasonCopy === 'length') {
                        logger.warn(
                            '[Enhance] Research output hit max token ceiling — possible truncation (Hebrew/long brief)',
                            {
                                modelId,
                                capability_mode,
                                outputChars: textCopy.length,
                                finishReason: finishReasonCopy,
                            },
                        );
                    }

                    // Store successful (non-empty) generations in the result cache so
                    // future identical requests can skip the LLM entirely. Fire-and-
                    // forget — cache failures must not break the response. We do not
                    // cache empty or errored outputs (those will be refunded below).
                    if (cacheKey && textCopy.length > 0 && finishReasonCopy !== 'error') {
                        setCached(cacheKey, {
                            text: textCopy,
                            modelId,
                            cachedAt: Date.now(),
                        });
                    }

                    // Refund on genuinely failed generations: empty output, error
                    // finish reason, OR finishReason === 'length' (output was
                    // truncated mid-stream by the token ceiling). A truncated
                    // research/enhance output routinely breaks the [GENIUS_QUESTIONS]
                    // JSON and cuts sections mid-word — the user should not be
                    // charged for that. Short valid responses with finishReason
                    // === 'stop' are legitimate and do NOT trigger a refund.
                    const isTruncated = finishReasonCopy === 'length';
                    if (userId && (textCopy.length === 0 || finishReasonCopy === 'error' || isTruncated)) {
                        await refundCredit(userId);
                        logger.warn('[Enhance] Failed/truncated generation, refunding credit', {
                            userId,
                            length: textCopy.length,
                            finishReason: finishReasonCopy,
                            truncated: isTruncated,
                            task: resolvedTask,
                        });
                    }

                    if (userId && supabase) {
                        const liveDetails = buildActivityLogDetails({
                            mode: String(mode),
                            modelId,
                            durationMs,
                            tokens: usageCopy,
                            prompt,
                            resultText: textCopy,
                            tone,
                            category,
                            capabilityMode: capability_mode,
                            targetModel: target_model,
                            isRefinement,
                            contextAttachments,
                            iteration,
                            isJsonOutput,
                            jsonValid,
                            jsonError,
                            injectionStats: engineOutput.injectionStats,
                        });

                        await saveEnhanceResults({
                            queryClient: queryClient as ReturnType<typeof createServiceClient>,
                            userId,
                            prompt,
                            enhancedPrompt: textCopy,
                            tone,
                            category,
                            capabilityMode: capability_mode,
                            inputSource,
                            source: historySource,
                            isRefinement,
                            activityLogDetails: liveDetails,
                        });

                        await maybeEnqueueBackgroundJobs(
                            queryClient as ReturnType<typeof createServiceClient>,
                            userId,
                        );
                    }
                } finally {
                    await lock.release();
                }
            });
        },
    });

    const streamResponse = result.toTextStreamResponse();
    const responseHeaders = new Headers(streamResponse.headers);
    responseHeaders.set('X-Model-Used', modelId);
    // Flag fallbacks so the client can surface a quality warning
    if (modelId !== 'gemini-2.5-flash') {
      responseHeaders.set('X-Model-Fallback', '1');
    }
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    // Release the in-flight lock on any error path so the next retry is
    // not blocked by a 10s stale lock. Happy path releases inside after().
    if (releaseInflightLock) {
      try { await releaseInflightLock(); } catch { /* best effort */ }
    }

    // Handle concurrency limit (server too busy)
    if (error instanceof ConcurrencyError) {
      logger.warn("[EnhanceAPI] Concurrency limit reached:", error.message);
      // Refund credit since we never called AI
      if (userId) {
        await refundCredit(userId);
      }
      return NextResponse.json(
        { error: "השרת עמוס כרגע. נסה שוב בעוד כמה שניות." },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }

    logger.error("[EnhanceAPI] Error:", error);
    // Best-effort credit refund on failure
    if (userId) {
      await refundCredit(userId);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
