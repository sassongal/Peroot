
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { parseCapabilityMode, CapabilityMode } from "@/lib/capability-mode";

export const maxDuration = 30;

const RequestSchema = z.object({
  prompt: z.string(),
  tone: z.string().default("Professional"),
  category: z.string().default("General"),
  capability_mode: z.string().optional(),
  mode_params: z.record(z.string(), z.unknown()).optional(),
  previousResult: z.string().optional(),
  refinementInstruction: z.string().optional(),
  questions: z.array(z.object({
    id: z.number(),
    question: z.string(),
  })).optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Check Credit Balance
    if (user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credits_balance')
            .eq('id', user.id)
            .maybeSingle(); 
        
        if (profileError) {
            console.error("Profile fetch error:", profileError);
            return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
        }
    
        const balance = profile?.credits_balance ?? 0;
        if (balance < 1) {
            return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
        }
    }

    const json = await req.json();
    const { prompt, tone, category, capability_mode, mode_params, previousResult, refinementInstruction, questions, answers } = RequestSchema.parse(json);
    
    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);

    // 2. Engine Selection & Generation
    const mode = parseCapabilityMode(capability_mode);
    const engine = await getEngine(mode);

    const engineInput: EngineInput = {
        prompt,
        tone,
        category,
        mode,
        modeParams: mode_params,
        previousResult,
        refinementInstruction
    };

    let systemPrompt = "";
    let userPrompt = "";

    if (isRefinement) {
        const output = engine.generateRefinement(engineInput);
        systemPrompt = output.systemPrompt;
        userPrompt = output.userPrompt;
    } else {
        const output = engine.generate(engineInput);
        systemPrompt = output.systemPrompt;
        userPrompt = output.userPrompt;
    }

    // 3. Execution using Vercel AI SDK (Robust)
    // Select model based on complexity (Verified Available Models)
    let modelId = 'gemini-2.5-flash';
    if (mode === CapabilityMode.DEEP_RESEARCH || mode === CapabilityMode.AGENT_BUILDER) {
        modelId = 'gemini-2.5-pro';
    }

    const aiResult = await generateText({
      model: google(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    const responseText = aiResult.text;

    const normalized = {
      great_prompt: responseText,
      category: category,
      clarifying_questions: [] // Engine can support this later if we add schema output
    };

    // 4. Credit Deduction Logic
    if (user) {
          const { error: deductError } = await supabase.rpc('decrement_credits', { user_id: user.id, amount: 1 });
          if (deductError) {
               console.warn("RPC decrement_credits failed, trying direct update", deductError);
               const { data: profile } = await supabase.from('profiles').select('credits_balance').eq('id', user.id).single();
               const currentBalance = profile?.credits_balance ?? 1;
               await supabase
                .from('profiles')
                .update({ credits_balance: currentBalance - 1 })
                .eq('id', user.id);
          }
    }

    return NextResponse.json(normalized, {
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 });
    }
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
