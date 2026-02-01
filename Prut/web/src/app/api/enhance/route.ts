
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { parseCapabilityMode } from "@/lib/capability-mode";

export const maxDuration = 30;

const RequestSchema = z.object({
  prompt: z.string(),
  tone: z.string().default("Professional"),
  category: z.string().default("General"),
  capability_mode: z.string().optional(),
  mode_params: z.record(z.string(), z.unknown()).optional(),
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
  try {
    const json = await req.json();
    const { prompt, tone, category, capability_mode, mode_params, previousResult, refinementInstruction, answers } = RequestSchema.parse(json);
    
    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Parallel Context Fetching (Profile, Library, Personality)
    // We start these early to minimize latency
    const contextPromise = user ? Promise.all([
        supabase.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle(),
        !isRefinement ? supabase.from('personal_library').select('title, prompt').eq('user_id', user.id).order('use_count', { ascending: false }).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: null }),
        !isRefinement ? supabase.from('user_style_personality').select('style_tokens, personality_brief, preferred_format').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null })
    ]) : Promise.resolve([ { data: null }, { data: null }, { data: null } ]);

    const [profileRes, historyRes, personalityRes] = await contextPromise;

    // 1.1 Process Profile & Tier
    let tier: 'free' | 'pro' | 'guest' = 'guest'; // Fixed: Use let for reassignment
    let profile: { plan_tier: string } | null = null;

    if (profileRes.data) {
        profile = profileRes.data;
        tier = (profile.plan_tier as 'free' | 'pro') || 'free';
    }

    // 2. Execute Rate Limiting
    const identifier = user?.id || (req.headers.get("x-forwarded-for") || "anonymous");
    const { checkRateLimit } = await import("@/lib/ratelimit");
    const limitResult = await checkRateLimit(identifier, tier);
    
    if (!limitResult.success) {
        return RateLimitError(limitResult.reset);
    }

    // 3. ATOMIC Credit Enforcement (Prevention of Concurrent Overuse)
    if (user) {
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

    // 2. Engine Selection & Generation
    const mode = parseCapabilityMode(capability_mode);
    const engine = await getEngine(mode);

    // 2.5 Style RAG Processing (using pre-fetched data)
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
        userHistory,
        userPersonality
    };

    const engineOutput = isRefinement 
        ? engine.generateRefinement(engineInput)
        : engine.generate(engineInput);

    // 3. Execution with Streaming & Telemetry via Gateway
    const startTime = Date.now();
    const { AIGateway } = await import("@/lib/ai/gateway");

    const { result, modelId } = await AIGateway.generateStream({
        system: engineOutput.systemPrompt,
        prompt: engineOutput.userPrompt,
        temperature: 0.7,
        onFinish: async (completion) => {
            const durationMs = Date.now() - startTime;
            if (user) {
                // 📝 Log activity
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

                // 🚀 BACKGROUND TASKS: Persistent Queue
                try {
                    const { enqueueJob } = await import("@/lib/jobs/queue");
                    
                    // 1. Style Analysis Check (Every 5th interaction)
                    const { count } = await supabase
                        .from('activity_logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .in('action', ['Prmpt Enhance', 'Prmpt Refine']);

                    if (count && count % 5 === 0) {
                        await enqueueJob('style_analysis', { userId: user.id });
                    }

                    // 2. Achievement Check (Always check)
                    await enqueueJob('achievement_check', { userId: user.id });

                } catch (bgError) {
                    console.error("[EnhanceAPI] Error enqueuing background jobs:", bgError);
                }
            }
        }
    });

    return result.toTextStreamResponse();

  } catch (error) {
    // console.error("API Error:", error); // Handled by Next.js
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
