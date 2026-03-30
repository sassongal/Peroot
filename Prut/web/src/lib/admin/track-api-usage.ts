import { createClient } from '@/lib/supabase/server';
import type { ModelId } from '@/lib/ai/models';
import { AVAILABLE_MODELS } from '@/lib/ai/models';
import { logger } from "@/lib/logger";

/**
 * Pricing per 1M tokens (USD) - updated March 2026
 * Most models used are free-tier, but we track estimated costs
 * based on equivalent commercial pricing for budgeting purposes.
 */
const PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.5-pro':    { input: 1.25, output: 10.00 },
    'gemini-2.5-flash':  { input: 0.15, output: 0.60 },
    'gemini-2.0-flash-lite':  { input: 0.075, output: 0.30 },
    'llama-3-70b':       { input: 0.59,  output: 0.79 },
    'deepseek-chat':     { input: 0.14,  output: 0.28 },
};

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[modelId];
    if (!pricing) return 0;
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export interface ApiUsageData {
    userId?: string;
    modelId: ModelId;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    endpoint?: string;
}

/**
 * Track API usage to api_usage_logs table.
 * Fire-and-forget - errors are logged but don't block the request.
 */
export async function trackApiUsage(data: ApiUsageData): Promise<void> {
    try {
        const supabase = await createClient();
        const config = AVAILABLE_MODELS[data.modelId];
        const cost = estimateCost(data.modelId, data.inputTokens, data.outputTokens);

        await supabase.from('api_usage_logs').insert({
            user_id: data.userId || null,
            provider: config?.provider || 'unknown',
            model: data.modelId,
            input_tokens: data.inputTokens,
            output_tokens: data.outputTokens,
            estimated_cost_usd: cost,
            endpoint: data.endpoint || 'enhance',
            duration_ms: data.durationMs,
        });
    } catch (error) {
        logger.error('[TrackApiUsage] Failed to log usage:', error);
    }
}
