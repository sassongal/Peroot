
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getEngine, EngineInput } from '@/lib/engines';
import { parseCapabilityMode, capabilityModeToDbMode } from '@/lib/capability-mode';
import { logAdminAction, parseAdminInput } from '@/lib/admin/admin-security';
import { withAdmin } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/ratelimit';
import { trackApiUsage } from '@/lib/admin/track-api-usage';

const TestEngineSchema = z.object({
    prompt: z.string().min(1),
    /** Accepts CapabilityMode or DB snake_case (e.g. image_generation) */
    mode: z.string().min(1),
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
export const POST = withAdmin(async (req, _supabase, user) => {
  try {
    // 1. Rate limit
    const rateLimit = await checkRateLimit(user.id, 'adminTestEngine');
    if (!rateLimit.success) {
        return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    // 3. Parse Input
    const { data, error: validationError } = await parseAdminInput(req, TestEngineSchema);
    if (validationError) return validationError;

    const { 
        prompt, 
        mode: modeRaw, 
        tone, 
        category, 
        modeParams,
        customSystemPrompt,
        customUserPrompt 
    } = data!;

    const mode = parseCapabilityMode(modeRaw);

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
      model: google('gemini-2.5-flash'),
      system: finalSystem,
      prompt: finalUser,
      temperature: 0.7,
    });
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    // AI SDK v6 uses inputTokens/outputTokens; keep v5 names as a fallback.
    const tokenUsage = result.usage as
        | { inputTokens?: number; outputTokens?: number; totalTokens?: number; promptTokens?: number; completionTokens?: number }
        | undefined;
    const inputTokens = tokenUsage?.inputTokens ?? tokenUsage?.promptTokens ?? 0;
    const outputTokens = tokenUsage?.outputTokens ?? tokenUsage?.completionTokens ?? 0;

    // Track usage for the cost dashboard. Fire-and-forget.
    trackApiUsage({
        userId: user.id,
        modelId: 'gemini-2.5-flash',
        inputTokens,
        outputTokens,
        durationMs,
        endpoint: 'test-engine',
        engineMode: capabilityModeToDbMode(mode),
    });

    // 5. Audit Log (Shelf) with Telemetry
    await logAdminAction(user.id, `Engine Test: ${mode}`, {
        prompt_length: prompt.length,
        has_custom_templates: !!(customSystemPrompt || customUserPrompt),
        latency_ms: durationMs,
        tokens: { inputTokens, outputTokens, totalTokens: tokenUsage?.totalTokens ?? inputTokens + outputTokens }
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
    logger.error('[Engine Test] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
