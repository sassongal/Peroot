
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

export const maxDuration = 30;

// Simple in-memory cache for user profile/tier (survives within same serverless instance)
const profileCache = new Map<string, { tier: string; isAdmin: boolean; ts: number }>();
const PROFILE_CACHE_TTL = 300_000; // 5 minutes

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
    const { prompt, tone, category, capability_mode, mode_params, previousResult, refinementInstruction, answers, iteration } = RequestSchema.parse(json);

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
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
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
        // Skip credit checks for guests — they are rate-limited by IP instead
        if (userId) {
            const { data: creditRes, error: rpcError } = await queryClient.rpc('refresh_and_decrement_credits', {
                target_user_id: userId,
                amount_to_spend: 1,
                user_tier: tier
            });

            if (rpcError || !creditRes || !creditRes.success) {
                // Fallback to old method if new RPC doesn't exist yet
                if (rpcError?.message?.includes('function') && rpcError?.message?.includes('does not exist')) {
                    // Legacy path: non-atomic refresh + decrement
                    if (tier === 'free') {
                        const { data: siteSettings } = await queryClient
                            .from('site_settings')
                            .select('daily_free_limit')
                            .single();

                        const dailyLimit = siteSettings?.daily_free_limit ?? 2;

                        const { data: refreshData } = await queryClient
                            .from('profiles')
                            .select('credits_refreshed_at, credits_balance')
                            .eq('id', userId)
                            .single();

                        const lastRefresh = refreshData?.credits_refreshed_at
                            ? new Date(refreshData.credits_refreshed_at)
                            : null;
                        const currentBalance = refreshData?.credits_balance ?? 0;

                        const nowIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
                        const resetToday = new Date(nowIsrael);
                        resetToday.setHours(14, 0, 0, 0);
                        const resetPoint = nowIsrael >= resetToday
                            ? resetToday
                            : new Date(resetToday.getTime() - 24 * 60 * 60 * 1000);

                        if (!lastRefresh || lastRefresh < resetPoint) {
                            const newBalance = Math.max(currentBalance, dailyLimit);
                            await queryClient
                                .from('profiles')
                                .update({
                                    credits_balance: newBalance,
                                    credits_refreshed_at: new Date().toISOString()
                                })
                                .eq('id', userId);
                        }
                    }

                    const { data: fallbackRes, error: fallbackErr } = await queryClient.rpc('check_and_decrement_credits', {
                        target_user_id: userId,
                        amount_to_spend: 1
                    });

                    if (fallbackErr || !fallbackRes || !fallbackRes.success) {
                        return NextResponse.json({
                            error: fallbackRes?.error || "Insufficient credits or profile not found",
                            balance: fallbackRes?.current_balance
                        }, { status: 403 });
                    }
                } else {
                    return NextResponse.json({
                        error: creditRes?.error || "Insufficient credits or profile not found",
                        balance: creditRes?.current_balance
                    }, { status: 403 });
                }
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

            // Auto-refund only for genuinely interrupted responses (not normal short completions)
            if (completion.text.length < 100 && userId && supabase) {
                try {
                    await queryClient.rpc('refund_credit', { target_user_id: userId, amount: 1 });
                    logger.warn('[Enhance] Short response, refunding credit', { userId: userId, length: completion.text.length });
                } catch (e) {
                    logger.error('[EnhanceAPI] Auto-refund failed:', e);
                }
            }

            if (userId && supabase) {
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
                        result_length: completion.text.length
                    }
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
        try {
          const refundClient = createSupabaseClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          await refundClient.rpc('refund_credit', { target_user_id: userId, amount: 1 });
        } catch (e: unknown) {
          logger.error('[EnhanceAPI] Credit refund failed:', e);
        }
      }
      return NextResponse.json(
        { error: "השרת עמוס כרגע. נסה שוב בעוד כמה שניות." },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }

    logger.error("[EnhanceAPI] Error:", error);
    // Best-effort credit refund on failure (use service role to ensure it works for Bearer token)
    if (userId) {
      try {
        const refundClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await refundClient.rpc('refund_credit', { target_user_id: userId, amount: 1 });
      } catch (e: unknown) {
        logger.error('[EnhanceAPI] Credit refund failed:', e);
      }
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
