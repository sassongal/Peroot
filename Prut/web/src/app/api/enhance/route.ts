
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { parseCapabilityMode } from "@/lib/capability-mode";
import { checkRateLimit } from "@/lib/ratelimit";
import { AIGateway } from "@/lib/ai/gateway";
import { ConcurrencyError } from "@/lib/ai/concurrency";
import { enqueueJob } from "@/lib/jobs/queue";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import { logger } from "@/lib/logger";
import { validateApiKey } from "@/lib/api-auth";
import { checkAndDecrementCredits, refundCredit } from "@/lib/services/credit-service";

export const maxDuration = 30;

// Simple in-memory cache for user profile/tier (survives within same serverless instance)
const profileCache = new Map<string, { tier: string; isAdmin: boolean; ts: number }>();
const PROFILE_CACHE_TTL = 15_000; // 15 seconds (reduced to limit stale tier after subscription changes)

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
    let tier: 'free' | 'pro' | 'guest' = 'guest';
    let isAdmin = false;
    let cachedHit = false;

    if (userId) {
        const cached = profileCache.get(userId);
        if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
            tier = cached.tier as 'free' | 'pro';
            isAdmin = cached.isAdmin;
            cachedHit = true;
        }
    }

    // Parallel fetch: skip profile+admin queries if cached
    // Uses queryClient (service role for Bearer token, regular supabase otherwise)
    const contextPromise = userId ? Promise.all([
        cachedHit ? Promise.resolve({ data: null }) : queryClient.from('profiles').select('plan_tier').eq('id', userId).maybeSingle(),
        !isRefinement ? queryClient.from('personal_library').select('title, prompt').eq('user_id', userId).order('use_count', { ascending: false }).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: null }),
        !isRefinement ? queryClient.from('user_style_personality').select('style_tokens, personality_brief, preferred_format').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        cachedHit ? Promise.resolve({ data: null }) : queryClient.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
    ]) : Promise.resolve([ { data: null }, { data: null }, { data: null }, { data: null } ]);

    const [profileRes, historyRes, personalityRes, adminRoleRes] = await contextPromise;

    // 1.1 Process Profile & Tier (from DB if not cached)
    if (!cachedHit && profileRes.data) {
        const profile = profileRes.data;
        tier = (profile.plan_tier as 'free' | 'pro') || 'free';
        isAdmin = !!adminRoleRes?.data || isAdmin;

        // Store in cache
        if (userId) {
            if (profileCache.size > 10000) profileCache.clear();
            profileCache.set(userId, { tier, isAdmin, ts: Date.now() });
        }
    }

    if (!isAdmin) {
        // 2. Execute Rate Limiting
        const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        const identifier = userId || clientIp;
        if (!identifier) {
            return NextResponse.json({ error: "Unable to identify request source" }, { status: 400 });
        }

        // Guests get stricter rate limiting (5/hour via 'guest' tier)
        const rateLimitTier = isGuest ? 'guest' : tier;
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

    // 4. Engine Selection & Generation
    const mode = parseCapabilityMode(capability_mode);
    const engine = await getEngine(mode);

    // 4.5 Style RAG Processing (using pre-fetched data)
    let userHistory: { title: string; prompt: string }[] = [];
    let userPersonality: { tokens: string[]; brief?: string; format?: string } | undefined = undefined;

    if (userId && !isGuest && !isRefinement) {
        if (historyRes.data) userHistory = historyRes.data;

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

    // 5. Execution with Streaming & Telemetry via Gateway
    const startTime = Date.now();
    const { result, modelId } = await AIGateway.generateStream({
        system: engineOutput.systemPrompt,
        prompt: engineOutput.userPrompt,
        temperature: 0.7,
        task: 'enhance',
        userTier: tier === 'guest' ? 'guest' : tier,
        onFinish: async (completion) => {
            const durationMs = Date.now() - startTime;

            // Track API usage for cost analysis
            const usage = completion.usage as { promptTokens?: number; completionTokens?: number } | undefined;
            trackApiUsage({
                userId: userId,
                modelId,
                inputTokens: usage?.promptTokens || 0,
                outputTokens: usage?.completionTokens || 0,
                durationMs,
                endpoint: 'enhance',
            });

            // Only refund on genuinely failed generations (empty output or error finish reason).
            // Length-based refund removed: short valid responses are legitimate and should not trigger refunds.
            const finishReason = (completion as { finishReason?: string }).finishReason;
            if (userId && (completion.text.length === 0 || finishReason === 'error')) {
                await refundCredit(userId);
                logger.warn('[Enhance] Failed generation, refunding credit', { userId, length: completion.text.length, finishReason });
            }

            if (userId && supabase) {
                // Save to history table so admin can see actual prompts
                await queryClient.from('history').insert({
                    user_id: userId,
                    prompt,
                    enhanced_prompt: completion.text,
                    tone,
                    category,
                    capability_mode: capability_mode || 'STANDARD',
                    title: prompt.slice(0, 60),
                    source: bearerToken?.startsWith('prk_') ? 'api' : bearerToken ? 'extension' : 'web',
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
                        tokens: completion.usage,
                        prompt_length: prompt.length,
                        result_length: completion.text.length,
                        tone,
                        category,
                        capability_mode: capability_mode || 'STANDARD',
                        target_model: target_model || 'general',
                        is_refinement: isRefinement,
                        has_context: !!(contextAttachments && contextAttachments.length > 0),
                        context_count: contextAttachments?.length || 0,
                        iteration: iteration || 0,
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
        }
    });

    return result.toTextStreamResponse();

  } catch (error) {
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
