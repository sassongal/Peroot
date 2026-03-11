
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { parseCapabilityMode } from "@/lib/capability-mode";
import { checkRateLimit } from "@/lib/ratelimit";
import { AIGateway } from "@/lib/ai/gateway";
import { enqueueJob } from "@/lib/jobs/queue";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

const RequestSchema = z.object({
  prompt: z.string(),
  tone: z.string().default("Professional"),
  category: z.string().default("General"),
  capability_mode: z.string().optional(),
  mode_params: z.record(z.string(), z.string()).optional(),
  previousResult: z.string().optional(),
  refinementInstruction: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
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

  try {
    const json = await req.json();
    const { prompt, tone, category, capability_mode, mode_params, previousResult, refinementInstruction, answers } = RequestSchema.parse(json);

    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);

    supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;

    // 1. Parallel Context Fetching (Profile, Library, Personality)
    // We start these early to minimize latency
    const contextPromise = user ? Promise.all([
        supabase.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle(),
        !isRefinement ? supabase.from('personal_library').select('title, prompt').eq('user_id', user.id).order('use_count', { ascending: false }).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: null }),
        !isRefinement ? supabase.from('user_style_personality').select('style_tokens, personality_brief, preferred_format').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null })
    ]) : Promise.resolve([ { data: null }, { data: null }, { data: null } ]);

    const [profileRes, historyRes, personalityRes] = await contextPromise;

    // 1.1 Process Profile & Tier
    let tier: 'free' | 'pro' | 'guest' = 'guest';
    let profile: { plan_tier: string } | null = null;

    if (profileRes.data) {
        profile = profileRes.data;
        tier = (profile.plan_tier as 'free' | 'pro') || 'free';
    }

    // Admin bypass: skip rate limiting and credit enforcement entirely
    const isAdmin = user?.app_metadata?.role === 'admin';

    if (!isAdmin) {
        // 2. Execute Rate Limiting
        const identifier = user?.id || (req.headers.get("x-forwarded-for") || "anonymous");
        const limitResult = await checkRateLimit(identifier, tier);

        if (!limitResult.success) {
            return RateLimitError(limitResult.reset);
        }

        // 3. ATOMIC Credit Enforcement (Prevention of Concurrent Overuse)
        if (user) {
            // Daily credit refresh for free users — uses site_settings as single source of truth
            if (tier === 'free') {
                const { data: siteSettings } = await supabase
                    .from('site_settings')
                    .select('daily_free_limit')
                    .single();

                const dailyLimit = siteSettings?.daily_free_limit ?? 2;

                const { data: refreshData } = await supabase
                    .from('profiles')
                    .select('credits_refreshed_at, credits_balance')
                    .eq('id', user.id)
                    .single();

                const lastRefresh = refreshData?.credits_refreshed_at
                    ? new Date(refreshData.credits_refreshed_at)
                    : null;
                const currentBalance = refreshData?.credits_balance ?? 0;

                // Reset window: every day at 14:00 Israel time (Asia/Jerusalem)
                const nowIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
                const resetToday = new Date(nowIsrael);
                resetToday.setHours(14, 0, 0, 0);
                // If it's before 14:00 today, the last reset point was yesterday at 14:00
                const resetPoint = nowIsrael >= resetToday
                    ? resetToday
                    : new Date(resetToday.getTime() - 24 * 60 * 60 * 1000);

                if (!lastRefresh || lastRefresh < resetPoint) {
                    // Only top-up to dailyLimit if balance is lower;
                    // never overwrite a higher balance (e.g. admin-granted credits)
                    const newBalance = Math.max(currentBalance, dailyLimit);
                    await supabase
                        .from('profiles')
                        .update({
                            credits_balance: newBalance,
                            credits_refreshed_at: new Date().toISOString()
                        })
                        .eq('id', user.id);
                }
            }

            const { data: creditRes, error: rpcError } = await supabase.rpc('check_and_decrement_credits', {
                target_user_id: user.id,
                amount_to_spend: 1
            });

            if (rpcError || !creditRes || !creditRes.success) {
                return NextResponse.json({
                    error: creditRes?.error || "Insufficient credits or profile not found",
                    balance: creditRes?.current_balance
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

    if (user && !isRefinement) {
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
        userPersonality
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
        onFinish: async (completion) => {
            const durationMs = Date.now() - startTime;

            // Track API usage for cost analysis
            const usage = completion.usage as { promptTokens?: number; completionTokens?: number } | undefined;
            trackApiUsage({
                userId: user?.id,
                modelId,
                inputTokens: usage?.promptTokens || 0,
                outputTokens: usage?.completionTokens || 0,
                durationMs,
                endpoint: 'enhance',
            });

            // Auto-refund for abnormally short responses (likely interrupted)
            if (completion.text.length < 100 && user && supabase) {
                try {
                    await supabase.rpc('refund_credit', { target_user_id: user.id, amount: 1 });
                    logger.warn('[EnhanceAPI] Auto-refund for short response:', completion.text.length, 'chars');
                } catch (e) {
                    logger.error('[EnhanceAPI] Auto-refund failed:', e);
                }
            }

            if (user && supabase) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
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
                    const { count } = await supabase
                        .from('activity_logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .in('action', ['Prmpt Enhance', 'Prmpt Refine']);

                    if (count && count % 5 === 0) {
                        await enqueueJob('style_analysis', { userId: user.id });
                    }

                    await enqueueJob('achievement_check', { userId: user.id });

                } catch (bgError) {
                    logger.error("[EnhanceAPI] Error enqueuing background jobs:", bgError);
                }
            }
        }
    });

    return result.toTextStreamResponse();

  } catch (error) {
    logger.error("[EnhanceAPI] Error:", error);
    // Best-effort credit refund on failure
    if (userId && supabase) {
      try {
        await supabase.rpc('refund_credit', { target_user_id: userId, amount: 1 });
      } catch (e: unknown) {
        logger.error('[EnhanceAPI] Credit refund failed:', e);
      }
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
