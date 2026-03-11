import { streamText, StreamTextResult } from "ai";
import { AVAILABLE_MODELS, FALLBACK_ORDER, ModelId, getModelsForTask } from "./models";

export interface GatewayParams {
    system: string;
    prompt: string;
    temperature?: number;
    onFinish?: (completion: { usage: unknown; text: string }) => Promise<void>;
}

export class AIGateway {
    /**
     * Attempts to generate text streaming using the defined fallback order.
     * Uses console directly for production visibility in Vercel runtime logs.
     */
    static async generateStream(params: GatewayParams & { task?: string }): Promise<{ result: StreamTextResult<Record<string, any>, any>; modelId: ModelId }> {
        let lastError: unknown;
        const models = params.task ? getModelsForTask(params.task) : FALLBACK_ORDER;

        for (const modelId of models) {
            try {
                const config = AVAILABLE_MODELS[modelId];

                // Providers safety checks
                if (config.provider === 'groq' && !process.env.GROQ_API_KEY) {
                    console.warn('[AIGateway] Skipping Groq (No API Key)');
                    continue;
                }
                if (config.provider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
                    console.warn('[AIGateway] Skipping DeepSeek (No API Key)');
                    continue;
                }

                console.log(`[AIGateway] Attempting: ${config.label}...`);

                const result = await streamText({
                    model: config.model,
                    system: params.system,
                    prompt: params.prompt,
                    temperature: params.temperature ?? 0.7,
                    onFinish: params.onFinish
                });

                console.log(`[AIGateway] Stream initiated with ${config.label}`);
                return { result, modelId };

            } catch (error: any) {
                const errorMessage = error?.message || String(error);
                // Use console.error directly (not logger) so it appears in Vercel runtime logs
                console.error(`[AIGateway] Failed with ${modelId}:`, errorMessage);
                lastError = error;
                console.log(`[AIGateway] Falling back to next available model...`);
                continue;
            }
        }

        // If we get here, all models failed
        throw lastError || new Error("All AI models failed to respond.");
    }
}
