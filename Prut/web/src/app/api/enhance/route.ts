
import { z } from "zod";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse, after } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { CapabilityMode, parseCapabilityMode } from "@/lib/capability-mode";
import { checkRateLimit } from "@/lib/ratelimit";
import { AIGateway } from "@/lib/ai/gateway";
import { ConcurrencyError } from "@/lib/ai/concurrency";
import { enqueueJob } from "@/lib/jobs/queue";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import { logger } from "@/lib/logger";
import { validateApiKey } from "@/lib/api-auth";
import { checkAndDecrementCredits, refundCredit } from "@/lib/services/credit-service";
import { buildCacheKey, getCached, setCached } from "@/lib/ai/enhance-cache";
import { acquireInflightLock } from "@/lib/ai/inflight-lock";
import { AVAILABLE_MODELS, type ModelId } from "@/lib/ai/models";
import { memoryFlags } from "@/lib/memory/injection-flags";

export const maxDuration = 30;

// In-memory per-instance cache. Subscription upgrades may take up to 15s to reflect.
// Acceptable trade-off vs Redis round-trip on every request.
const profileCache = new Map<string, { tier: string; isAdmin: boolean; ts: number }>();
const PROFILE_CACHE_TTL = 15_000; // 15 seconds

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
  context: z.array(z.object({
    type: z.enum(['file', 'url', 'image']),
    name: z.string(),
    content: z.string(),
    tokenCount: z.number().optional(),
    format: z.string().optional(),
    filename: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
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

    // Support Bearer token auth for Chrome extension + Developer API keys
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    let useServiceClient = false;

    if (bearerToken?.startsWith("prk_")) {
      // Developer API key auth
      const apiKeyResult = await validateApiKey(bearerToken);
      if (!apiKeyResult.valid) {
        return NextResponse.json({ error: apiKeyResult.error || "Invalid API key" }, { status: 401 });
      }
      userId = apiKeyResult.userId;
      useServiceClient = true;
    } else {
      const { data: { user } } = bearerToken
          ? await supabase.auth.getUser(bearerToken)
          : await supabase.auth.getUser();
      userId = user?.id;
      if (bearerToken) useServiceClient = true;
    }

    // Guest access: allow unauthenticated users with IP-based rate limiting
    const isGuest = !userId;

    // When using Bearer token or API key, RLS won't have auth.uid() set,
    // so use service role client to bypass RLS
    const queryClient = useServiceClient
        ? createServiceClient()
        : supabase;

    // 1. Context Fetching - check cache for profile/tier first
    let tier: 'free' | 'pro' | 'admin' | 'guest' = 'guest';
    let isAdmin = false;
    let cachedHit = false;

    if (userId) {
        const cached = profileCache.get(userId);
        if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
            tier = cached.tier as 'free' | 'pro' | 'admin';
            isAdmin = cached.isAdmin;
            cachedHit = true;
        }
    }

    // Parallel fetch: skip profile+admin queries if cached
    // Uses queryClient (service role for Bearer token, regular supabase otherwise)
    //
    // History recall source: by default we now fetch from `history` (top-3
    // most recent enhances) which gives us the *enhanced_prompt* — letting
    // the model see before→after pairs instead of raw user prompts only.
    // Set PEROOT_LEGACY_HISTORY_RECALL=1 to revert to the use_count-ordered
    // fetch from personal_library (raw prompts only).
    const useHistoryTable = memoryFlags.useHistoryTableForRecall;
    const historyRecallPromise = !isRefinement && memoryFlags.historyEnabled
        ? (useHistoryTable
            ? queryClient.from('history')
                .select('title, prompt, enhanced_prompt')
                .eq('user_id', userId)
                .not('enhanced_prompt', 'is', null)
                .order('created_at', { ascending: false })
                .limit(3)
            : queryClient.from('personal_library')
                .select('title, prompt')
                .eq('user_id', userId)
                .order('use_count', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(3))
        : Promise.resolve({ data: null });

    const contextPromise = userId ? Promise.all([
        cachedHit ? Promise.resolve({ data: null }) : queryClient.from('profiles').select('plan_tier').eq('id', userId).maybeSingle(),
        historyRecallPromise,
        !isRefinement && memoryFlags.personalityEnabled ? queryClient.from('user_style_personality').select('style_tokens, personality_brief, preferred_format').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        cachedHit ? Promise.resolve({ data: null }) : queryClient.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
    ]) : Promise.resolve([ { data: null }, { data: null }, { data: null }, { data: null } ]);

    const [profileRes, historyRes, personalityRes, adminRoleRes] = await contextPromise;

    // 1.1 Process Profile & Tier (from DB if not cached)
    if (!cachedHit && profileRes.data) {
        const profile = profileRes.data;
        tier = (profile.plan_tier as 'free' | 'pro' | 'admin') || 'free';
        isAdmin = !!adminRoleRes?.data || isAdmin;

        // Store in cache
        if (userId) {
            if (profileCache.size > 10000) profileCache.clear();
            profileCache.set(userId, { tier, isAdmin, ts: Date.now() });
        }
    }

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
    let userHistory: { title: string; prompt: string; enhanced?: string }[] = [];
    let userPersonality: { tokens: string[]; brief?: string; format?: string } | undefined = undefined;

    if (userId && !isGuest && !isRefinement) {
        if (historyRes.data) {
            // historyRes can come from two sources depending on the flag:
            //   - history table:        { title, prompt, enhanced_prompt }
            //   - personal_library:     { title, prompt }
            // We normalize both into the engine's expected shape so the
            // engine code stays source-agnostic.
            const rawRows = historyRes.data as Array<{ title?: string | null; prompt?: string | null; enhanced_prompt?: string | null }>;
            userHistory = rawRows
                .filter(r => r.prompt && r.prompt.trim().length > 0)
                .map(r => ({
                    title: r.title || '',
                    prompt: r.prompt as string,
                    ...(r.enhanced_prompt ? { enhanced: r.enhanced_prompt } : {}),
                }));
        }

        if (personalityRes.data) {
            userPersonality = {
                tokens: personalityRes.data.style_tokens || [],
                brief: personalityRes.data.personality_brief,
                format: personalityRes.data.preferred_format
            };
        }
    }

    const engineInput: EngineInput = {
        prompt,
        tone,
        category,
        mode,
        modeParams: mode_params,
        previousResult,
        refinementInstruction,
        answers,
        userHistory,
        userPersonality,
        iteration,
        context: contextAttachments,
        targetModel: target_model || 'general',
    };

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
                        await queryClient.from('history').insert({
                            user_id: userId,
                            prompt,
                            enhanced_prompt: cached.text,
                            tone,
                            category,
                            capability_mode: capability_mode || 'STANDARD',
                            title: prompt.slice(0, 60),
                            source: bearerToken?.startsWith('prk_') ? 'api' : bearerToken ? 'extension' : 'web',
                            input_source: inputSource,
                            updated_at: new Date().toISOString(),
                        }).then(({ error: histErr }) => {
                            if (histErr) logger.warn('[Enhance:cache-hit] History insert failed:', histErr.message);
                        });

                        await queryClient.from('activity_logs').insert({
                            user_id: userId,
                            action: isRefinement ? 'Prmpt Refine' : 'Prmpt Enhance',
                            entity_type: 'prompt',
                            details: {
                                mode,
                                model: cachedModelId,
                                latency_ms: cacheLatencyMs,
                                tokens: { inputTokens: 0, outputTokens: 0 },
                                prompt_length: prompt.length,
                                result_length: cached.text.length,
                                tone,
                                category,
                                capability_mode: capability_mode || 'STANDARD',
                                target_model: target_model || 'general',
                                is_refinement: isRefinement,
                                has_context: !!(contextAttachments && contextAttachments.length > 0),
                                context_count: contextAttachments?.length || 0,
                                attachment_tokens_est: (contextAttachments || []).reduce((sum, c) => sum + (c.tokenCount || 0), 0),
                                iteration: iteration || 0,
                                json_output: engineOutput.outputFormat === 'json',
                                // Non-null marker so admins can filter cache-hit rows
                                // in activity_logs without adding a new column.
                                cache_hit: true,
                            }
                        }).then(({ error: actErr }) => {
                            if (actErr) logger.warn('[Enhance:cache-hit] Activity log insert failed:', actErr.message);
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
        : 'enhance';
    const isJsonOutput = engineOutput.outputFormat === 'json';

    // Refine requests (previousResult + refinementInstruction/answers) reuse
    // the enhance task preset (4096 tokens). That preset is tuned for a
    // first-pass prompt rewrite, but Refine output is longer: the engine
    // re-emits the full enhanced prompt AND a fresh [GENIUS_QUESTIONS] block
    // AND a [PROMPT_TITLE] block, which together commonly exceed 4096 tokens
    // and trigger finishReason='length' mid-answer. We lift the ceiling to
    // 8192 for Refine on the text/agent tasks only — image/video already use
    // their own 16384 preset, and standard enhance is unchanged.
    const refinementMaxTokens = isRefinement && (resolvedTask === 'enhance')
        ? 8192
        : undefined;

    const { result, modelId } = await AIGateway.generateStream({
      system: engineOutput.systemPrompt,
      prompt: engineOutput.userPrompt,
      task: resolvedTask,
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
                        const cleaned = textCopy
                            .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/, '')
                            .replace(/\[GENIUS_QUESTIONS\][\s\S]*$/, '')
                            .replace(/^```(?:json)?\s*/i, '')
                            .replace(/\s*```\s*$/i, '')
                            .trim();
                        try {
                            JSON.parse(cleaned);
                            jsonValid = true;
                        } catch (err) {
                            jsonValid = false;
                            jsonError = err instanceof Error ? err.message : String(err);
                            logger.warn('[Enhance] Invalid JSON output', {
                                modelId,
                                capability_mode,
                                error: jsonError,
                                sample: cleaned.slice(0, 200),
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
                    });

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

                    // Only refund on genuinely failed generations (empty output or error finish reason).
                    // Length-based refund removed: short valid responses are legitimate and should not trigger refunds.
                    if (userId && (textCopy.length === 0 || finishReasonCopy === 'error')) {
                        await refundCredit(userId);
                        logger.warn('[Enhance] Failed generation, refunding credit', { userId, length: textCopy.length, finishReason: finishReasonCopy });
                    }

                    if (userId && supabase) {
                        // Save to history table so admin can see actual prompts
                        await queryClient.from('history').insert({
                            user_id: userId,
                            prompt,
                            enhanced_prompt: textCopy,
                            tone,
                            category,
                            capability_mode: capability_mode || 'STANDARD',
                            title: prompt.slice(0, 60),
                            source: bearerToken?.startsWith('prk_') ? 'api' : bearerToken ? 'extension' : 'web',
                            input_source: inputSource,
                            updated_at: new Date().toISOString(),
                        }).then(({ error: histErr }) => {
                            if (histErr) logger.warn('[Enhance] History insert failed:', histErr.message);
                        });

                        await queryClient.from('activity_logs').insert({
                            user_id: userId,
                            action: isRefinement ? 'Prmpt Refine' : 'Prmpt Enhance',
                            entity_type: 'prompt',
                            details: {
                                mode,
                                model: modelId,
                                latency_ms: durationMs,
                                tokens: usageCopy,
                                prompt_length: prompt.length,
                                result_length: textCopy.length,
                                tone,
                                category,
                                capability_mode: capability_mode || 'STANDARD',
                                target_model: target_model || 'general',
                                is_refinement: isRefinement,
                                has_context: !!(contextAttachments && contextAttachments.length > 0),
                                context_count: contextAttachments?.length || 0,
                                attachment_tokens_est: (contextAttachments || []).reduce((sum, c) => sum + (c.tokenCount || 0), 0),
                                iteration: iteration || 0,
                                // JSON mode observability: lets the admin audit page
                                // compute "invalid JSON rate" by filtering on
                                // details->>json_valid = 'false'.
                                json_output: isJsonOutput,
                                json_valid: jsonValid,
                                json_error: jsonError,
                                // Memory injection telemetry — see InjectionStats
                                // in src/lib/engines/types.ts. Lets us A/B-test the
                                // L2/L3 layers by joining on these fields.
                                injection: engineOutput.injectionStats || null,
                            }
                        }).then(({ error: actErr }) => {
                            if (actErr) logger.warn('[Enhance] Activity log insert failed:', actErr.message);
                        });

                        try {
                            const { count } = await queryClient
                                .from('activity_logs')
                                .select('*', { count: 'exact', head: true })
                                .eq('user_id', userId)
                                .in('action', ['Prmpt Enhance', 'Prmpt Refine']);

                            if (count && count % 20 === 0) {
                                await enqueueJob('style_analysis', { userId: userId });
                            }

                            await enqueueJob('achievement_check', { userId: userId });

                        } catch (bgError) {
                            logger.error("[EnhanceAPI] Error enqueuing background jobs:", bgError);
                        }
                    }
                } finally {
                    await lock.release();
                }
            });
        },
    });

    return result.toTextStreamResponse();

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
