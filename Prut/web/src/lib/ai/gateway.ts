import { streamText, generateText, StreamTextResult } from "ai";
import { AVAILABLE_MODELS, FALLBACK_ORDER, ModelId, getModelsForTask } from "./models";
import { isProviderAvailable, recordSuccess, recordFailure } from "./circuit-breaker";
import { acquireSlot, releaseSlot } from "./concurrency";
import { logger } from "@/lib/logger";

export interface GatewayParams {
    system: string;
    prompt: string;
    temperature?: number;
    onFinish?: (completion: { usage: unknown; text: string }) => Promise<void>;
    onStreamEnd?: () => void;
}

export class AIGateway {
    /**
     * Attempts to generate text streaming using the defined fallback order.
     * Includes circuit breaker (skip failing providers) and concurrency limiter
     * (queue excess requests instead of overwhelming providers).
     */
    static async generateStream(params: GatewayParams & { task?: string; userTier?: 'free' | 'pro' | 'guest' }): Promise<{ result: StreamTextResult<Record<string, any>, any>; modelId: ModelId }> {
        // Acquire a concurrency slot (waits in queue if at capacity)
        await acquireSlot();

        let slotReleased = false;
        const safeRelease = () => {
            if (!slotReleased) {
                slotReleased = true;
                releaseSlot();
            }
        };

        let lastError: unknown;
        const models = params.task ? getModelsForTask(params.task, params.userTier) : FALLBACK_ORDER;

        try {
            for (const modelId of models) {
                const config = AVAILABLE_MODELS[modelId];

                // Circuit breaker: skip providers that are currently failing
                if (!isProviderAvailable(config.provider)) {
                    logger.info(`[AIGateway] Skipping ${config.label} (circuit open)`);
                    continue;
                }

                // Provider API key checks
                if (config.provider === 'groq' && !process.env.GROQ_API_KEY) continue;
                if (config.provider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) continue;

                try {
                    logger.info(`[AIGateway] Attempting: ${config.label}...`);

                    const result = await streamText({
                        model: config.model,
                        system: params.system,
                        prompt: params.prompt,
                        temperature: params.temperature ?? 0.7,
                        onFinish: async (completion) => {
                            recordSuccess(config.provider);
                            safeRelease();
                            if (params.onFinish) {
                                await params.onFinish(completion);
                            }
                        }
                    });

                    // Safety timeout: release slot if stream hangs for 5 minutes
                    const safetyTimeout = setTimeout(() => {
                        logger.warn(`[AIGateway] Safety timeout - releasing slot for ${config.label}`);
                        safeRelease();
                    }, 5 * 60 * 1000);
                    Promise.resolve(result.text).then(() => clearTimeout(safetyTimeout), () => { clearTimeout(safetyTimeout); safeRelease(); });

                    return { result, modelId };

                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger.error(`[AIGateway] Failed with ${modelId}: ${errorMessage}`);
                    recordFailure(config.provider);
                    lastError = error;
                    continue;
                }
            }

            // All models failed
            safeRelease();
            throw lastError || new Error("All AI models failed to respond.");
        } catch (err) {
            safeRelease();
            throw err;
        }
    }

    /**
     * Non-streaming generation — more efficient for structured JSON output.
     * No SSE overhead, lower latency for short responses.
     */
    static async generateFull(params: GatewayParams & { task?: string; userTier?: 'free' | 'pro' | 'guest' }): Promise<{ text: string; modelId: ModelId; usage?: unknown }> {
        await acquireSlot();

        let slotReleased = false;
        const safeRelease = () => {
            if (!slotReleased) { slotReleased = true; releaseSlot(); }
        };

        let lastError: unknown;
        const models = params.task ? getModelsForTask(params.task, params.userTier) : FALLBACK_ORDER;

        try {
            for (const modelId of models) {
                const config = AVAILABLE_MODELS[modelId];
                if (!isProviderAvailable(config.provider)) {
                    logger.info(`[AIGateway] Skipping ${config.label} (circuit open)`);
                    continue;
                }
                if (config.provider === 'groq' && !process.env.GROQ_API_KEY) continue;
                if (config.provider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) continue;

                try {
                    logger.info(`[AIGateway] generateFull: ${config.label}...`);
                    const result = await generateText({
                        model: config.model,
                        system: params.system,
                        prompt: params.prompt,
                        temperature: params.temperature ?? 0.7,
                    });
                    recordSuccess(config.provider);
                    safeRelease();
                    if (params.onFinish) {
                        await params.onFinish({ usage: result.usage, text: result.text });
                    }
                    return { text: result.text, modelId, usage: result.usage };
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger.error(`[AIGateway] generateFull failed with ${modelId}: ${errorMessage}`);
                    recordFailure(config.provider);
                    lastError = error;
                    continue;
                }
            }
            safeRelease();
            throw lastError || new Error("All AI models failed to respond.");
        } catch (err) {
            safeRelease();
            throw err;
        }
    }
}
