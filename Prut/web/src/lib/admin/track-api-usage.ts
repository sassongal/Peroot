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
    'gemini-2.5-flash':      { input: 0.15,  output: 0.60 },
    'gemini-2.5-flash-lite': { input: 0.075, output: 0.30 },
    'llama-4-scout':         { input: 0.11,  output: 0.34 },
    'gpt-oss-20b':           { input: 0.0,   output: 0.0 },
    'mistral-small':         { input: 0.10,  output: 0.30 },
};

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[modelId];
    if (!pricing) return 0;
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export interface SkillMetadata {
    type?: 'image' | 'video' | 'text';
    platform?: string;
    examplesSelected?: string[]; // Category names of selected examples
    hasMistakes?: boolean;
    hasScoring?: boolean;
}

export interface ApiUsageData {
    userId?: string;
    modelId: ModelId;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    endpoint?: string;
    skillMetadata?: SkillMetadata;
    /**
     * True when the response was served from the Redis result cache and no
     * LLM provider was called. For cache hits, inputTokens/outputTokens/cost
     * should all be zero — we still log the row so the dashboard can compute
     * hit rate per endpoint.
     */
    cacheHit?: boolean;
}

/**
 * Track API usage to api_usage_logs table.
 * Fire-and-forget - errors are logged but don't block the request.
 *
 * Skill metadata is logged via logger.info as structured JSON so it appears
 * in Vercel logs and can be queried later. We also attempt to insert it into
 * the api_usage_logs.metadata column if it exists, with a try/catch fallback
 * to a metadata-less insert if the column is missing.
 */
export async function trackApiUsage(data: ApiUsageData): Promise<void> {
    try {
        const supabase = await createClient();
        const config = AVAILABLE_MODELS[data.modelId];
        const cost = estimateCost(data.modelId, data.inputTokens, data.outputTokens);

        const baseRow = {
            user_id: data.userId || null,
            provider: config?.provider || 'unknown',
            model: data.modelId,
            input_tokens: data.inputTokens,
            output_tokens: data.outputTokens,
            estimated_cost_usd: cost,
            endpoint: data.endpoint || 'enhance',
            duration_ms: data.durationMs,
            cache_hit: data.cacheHit === true,
        };

        // Always log skill metadata as structured info so it's queryable in Vercel logs.
        if (data.skillMetadata) {
            logger.info('[ApiUsage:skill]', JSON.stringify({
                userId: data.userId || null,
                model: data.modelId,
                endpoint: data.endpoint || 'enhance',
                durationMs: data.durationMs,
                skill: data.skillMetadata,
            }));
        }

        // Attempt insert with metadata column first; fall back to a plain insert
        // if the column doesn't exist (schema not yet migrated).
        if (data.skillMetadata) {
            const { error: metaError } = await supabase
                .from('api_usage_logs')
                .insert({ ...baseRow, metadata: data.skillMetadata });

            if (metaError) {
                // Likely the column doesn't exist — fall back silently.
                await supabase.from('api_usage_logs').insert(baseRow);
            }
        } else {
            await supabase.from('api_usage_logs').insert(baseRow);
        }
    } catch (error) {
        logger.error('[TrackApiUsage] Failed to log usage:', error);
    }
}
