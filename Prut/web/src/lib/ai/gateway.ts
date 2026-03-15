import { streamText, StreamTextResult } from "ai";
import { AVAILABLE_MODELS, FALLBACK_ORDER, ModelId, getModelsForTask } from "./models";
import { isProviderAvailable, recordSuccess, recordFailure } from "./circuit-breaker";
import { acquireSlot, releaseSlot, ConcurrencyError } from "./concurrency";

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
    static async generateStream(params: GatewayParams & { task?: string }): Promise<{ result: StreamTextResult<Record<string, any>, any>; modelId: ModelId }> {
        // Acquire a concurrency slot (waits in queue if at capacity)
        await acquireSlot();

        let lastError: unknown;
        const models = params.task ? getModelsForTask(params.task) : FALLBACK_ORDER;

        try {
            for (const modelId of models) {
                const config = AVAILABLE_MODELS[modelId];

                // Circuit breaker: skip providers that are currently failing
                if (!isProviderAvailable(config.provider)) {
                    console.log(`[AIGateway] Skipping ${config.label} (circuit open)`);
                    continue;
                }

                // Provider API key checks
                if (config.provider === 'groq' && !process.env.GROQ_API_KEY) {
                    console.warn('[AIGateway] Skipping Groq (No API Key)');
                    continue;
                }
                if (config.provider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
                    console.warn('[AIGateway] Skipping DeepSeek (No API Key)');
                    continue;
                }

                try {
                    console.log(`[AIGateway] Attempting: ${config.label}...`);

                    const result = await streamText({
                        model: config.model,
                        system: params.system,
                        prompt: params.prompt,
                        temperature: params.temperature ?? 0.7,
                        onFinish: async (completion) => {
                            // Record success only when stream actually completes
                            recordSuccess(config.provider);
                            // Release concurrency slot when stream ends
                            releaseSlot();
                            // Call user's onFinish handler
                            if (params.onFinish) {
                                await params.onFinish(completion);
                            }
                        }
                    });

                    console.log(`[AIGateway] Stream initiated with ${config.label}`);

                    // Slot is released in onFinish when stream actually completes
                    // Safety timeout: release slot if stream hangs for 5 minutes
                    const safetyTimeout = setTimeout(() => {
                        console.warn(`[AIGateway] Safety timeout - releasing slot for ${config.label}`);
                        releaseSlot();
                    }, 5 * 60 * 1000);
                    // Clear timeout when stream finishes (onFinish already releases)
                    Promise.resolve(result.text).then(() => clearTimeout(safetyTimeout), () => clearTimeout(safetyTimeout));

                    return { result, modelId };

                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`[AIGateway] Failed with ${modelId}:`, errorMessage);

                    // Record failure for circuit breaker
                    recordFailure(config.provider);
                    lastError = error;
                    console.log(`[AIGateway] Falling back to next available model...`);
                    continue;
                }
            }

            // All models failed - release slot since no stream was established
            releaseSlot();
            throw lastError || new Error("All AI models failed to respond.");
        } catch (err) {
            // Release slot on any unexpected error
            releaseSlot();
            throw err;
        }
    }
}
