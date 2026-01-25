import { streamText } from "ai";
import { google } from "@ai-sdk/google";
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Determine Tier & Rate Limit
    let tier: 'free' | 'pro' | 'guest' = 'guest';
    let profile: { plan_tier: string } | null = null;

    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', user.id)
            .maybeSingle();
        
        if (data) {
            profile = data;
            tier = (profile.plan_tier as 'free' | 'pro') || 'free';
        }
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

    const json = await req.json();
    const { prompt, tone, category, capability_mode, mode_params, previousResult, refinementInstruction, answers } = RequestSchema.parse(json);
    
    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);

    // 2. Engine Selection & Generation
    const mode = parseCapabilityMode(capability_mode);
    const engine = await getEngine(mode);

    // 2.5 Style RAG
    let userHistory: { title: string; prompt: string }[] = [];
    let userPersonality: { tokens: string[]; brief?: string; format?: string } | undefined = undefined;

    if (user && !isRefinement) {
        const { data: historyData } = await supabase
            .from('personal_library')
            .select('title, prompt')
            .eq('user_id', user.id)
            .order('use_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (historyData) userHistory = historyData;

        const { data: personalityData } = await supabase
            .from('user_style_personality')
            .select('style_tokens, personality_brief, preferred_format')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (personalityData) {
            userPersonality = {
                tokens: personalityData.style_tokens || [],
                brief: personalityData.personality_brief,
                format: personalityData.preferred_format
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

    // 3. Execution with Streaming & Telemetry
    const startTime = Date.now();
    const modelId = 'gemini-2.0-flash'; 

    const result = await streamText({
      model: google(modelId),
      system: engineOutput.systemPrompt,
      prompt: engineOutput.userPrompt,
      temperature: 0.7,
      onFinish: async (completion) => {
        const durationMs = Date.now() - startTime;
        if (user) {
            // 📝 Log activity (Synchronous/Important - we want this persisted)
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
            // We enqueue these jobs to be processed by the worker (via Cron or Queue)
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
                // Non-blocking, we still return the result
            }
        }
      }
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
