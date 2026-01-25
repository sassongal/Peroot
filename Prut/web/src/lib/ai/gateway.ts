import { streamText, StreamTextResult } from "ai";
import { AVAILABLE_MODELS, FALLBACK_ORDER, ModelId } from "./models";

export interface GatewayParams {
    system: string;
    prompt: string;
    temperature?: number;
    onFinish?: (completion: { usage: unknown; text: string }) => Promise<void>;
}

export class AIGateway {
    /**
     * Attempts to generate text streaming using the defined fallback order.
     * Guaranteed to try all free models before failing.
     */
    static async generateStream(params: GatewayParams): Promise<{ result: StreamTextResult<object>; modelId: ModelId }> {
        let lastError: unknown;

        for (const modelId of FALLBACK_ORDER) {
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

                console.log(`[AIGateway] Attempting generation with: ${config.label}`);

                const result = await streamText({
                    model: config.model,
                    system: params.system,
                    prompt: params.prompt,
                    temperature: params.temperature ?? 0.7,
                    onFinish: params.onFinish
                });

                return { result, modelId };

            } catch (error) {
                console.error(`[AIGateway] Failed with ${modelId}:`, error);
                lastError = error;
                // Loop continues to next model...
            }
        }

        // If we get here, all models failed
        throw lastError || new Error("All AI models failed to respond.");
    }
}
