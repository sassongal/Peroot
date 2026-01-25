
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getEngine, EngineInput } from '@/lib/engines';
import { CapabilityMode } from '@/lib/capability-mode';
import { validateAdminSession, logAdminAction, parseAdminInput } from '@/lib/admin/admin-security';
import { z } from 'zod';

const TestEngineSchema = z.object({
    prompt: z.string().min(1),
    mode: z.nativeEnum(CapabilityMode),
    tone: z.string().optional().default('Professional'),
    category: z.string().optional().default('Test'),
    modeParams: z.record(z.string(), z.any()).optional().default({}),
    customSystemPrompt: z.string().optional(),
    customUserPrompt: z.string().optional(),
});

/**
 * POST /api/admin/test-engine
 * 
 * Secure endpoint for admins to test engine prompts with Zod validation and Audit Logging.
 */
export async function POST(req: Request) {
  try {
    // 1. Validate Session
    const { error: authError, user, supabase } = await validateAdminSession();
    if (authError || !user || !supabase) {
        return NextResponse.json({ error: authError }, { status: authError === 'Unauthorized' ? 401 : 403 });
    }

    // 2. Parse Input
    const { data, error: validationError } = await parseAdminInput(req, TestEngineSchema);
    if (validationError) return validationError;

    const { 
        prompt, 
        mode, 
        tone, 
        category, 
        modeParams,
        customSystemPrompt,
        customUserPrompt 
    } = data!;

    // 3. Setup Engine
    const engine = await getEngine(mode);
    
    const input: EngineInput = {
        prompt,
        tone,
        category,
        mode,
        modeParams
    };

    const engineOutput = engine.generate(input);

    const finalSystem = customSystemPrompt || engineOutput.systemPrompt;
    const finalUser = customUserPrompt || engineOutput.userPrompt;

    // 4. Execute AI call with Telemetry
    const startTime = Date.now();
    const result = await generateText({
      model: google('gemini-2.0-flash'),
      system: finalSystem,
      prompt: finalUser,
      temperature: 0.7,
    });
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const tokenUsage = result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // 5. Audit Log (Shelf) with Telemetry
    await logAdminAction(user.id, `Engine Test: ${mode}`, { 
        prompt_length: prompt.length,
        has_custom_templates: !!(customSystemPrompt || customUserPrompt),
        latency_ms: durationMs,
        tokens: tokenUsage
    });

    return NextResponse.json({
        success: true,
        output: result.text,
        debug: {
            systemPrompt: finalSystem,
            userPrompt: finalUser
        }
    });

  } catch (error) {
    console.error('[Engine Test] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
