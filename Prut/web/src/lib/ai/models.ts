import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

export type ModelId = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash-lite' | 'llama-4-scout' | 'llama-3-70b' | 'gpt-oss-20b' | 'deepseek-chat' | 'mistral-small' | 'mistral-nemo';

// Server-side Google provider - no Referer header needed.
// API key restrictions should use "None" or IP-based (not HTTP referrer)
// since this runs in Vercel serverless functions, not the browser.
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY });

export interface ModelConfig {
    id: ModelId;
    provider: 'google' | 'groq' | 'deepseek' | 'mistral';
    model: LanguageModel;
    label: string;
    contextWindow: number;
    tier: 'free' | 'pro';
}

export const AVAILABLE_MODELS: Record<ModelId, ModelConfig> = {
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        provider: 'google',
        model: google('gemini-2.5-flash'),
        label: 'Gemini 2.5 Flash (Primary)',
        contextWindow: 1000000,
        tier: 'free'
    },
    'gemini-2.5-pro': {
        id: 'gemini-2.5-pro',
        provider: 'google',
        model: google('gemini-2.5-pro'),
        label: 'Gemini 2.5 Pro (Premium)',
        contextWindow: 1000000,
        tier: 'pro'
    },
    'gemini-2.0-flash-lite': {
        id: 'gemini-2.0-flash-lite',
        provider: 'google',
        model: google('gemini-2.0-flash-lite'),
        label: 'Gemini 2.0 Flash Lite (Backup)',
        contextWindow: 1000000,
        tier: 'free'
    },
    'llama-3-70b': {
        id: 'llama-3-70b',
        provider: 'groq',
        model: groq('llama3-70b-8192'),
        label: 'Llama 3 70B (Groq)',
        contextWindow: 8192,
        tier: 'free'
    },
    'deepseek-chat': {
        id: 'deepseek-chat',
        provider: 'deepseek',
        model: deepseek('deepseek-chat'),
        label: 'DeepSeek Chat (Alternative)',
        contextWindow: 64000,
        tier: 'pro'
    },
    'gemini-2.5-flash-lite': {
        id: 'gemini-2.5-flash-lite',
        provider: 'google',
        model: google('gemini-2.5-flash-lite'),
        label: 'Gemini 2.5 Flash Lite',
        contextWindow: 1000000,
        tier: 'free'
    },
    'llama-4-scout': {
        id: 'llama-4-scout',
        provider: 'groq',
        model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
        label: 'Llama 4 Scout (Groq)',
        contextWindow: 512000,
        tier: 'free'
    },
    'gpt-oss-20b': {
        id: 'gpt-oss-20b',
        provider: 'groq',
        model: groq('openai/gpt-oss-20b'),
        label: 'GPT-OSS 20B (Groq)',
        contextWindow: 32768,
        tier: 'free'
    },
    'mistral-small': {
        id: 'mistral-small',
        provider: 'mistral',
        model: mistralProvider('mistral-small-latest'),
        label: 'Mistral Small 3.1',
        contextWindow: 32000,
        tier: 'free'
    },
    'mistral-nemo': {
        id: 'mistral-nemo',
        provider: 'mistral',
        model: mistralProvider('open-mistral-nemo'),
        label: 'Mistral Nemo',
        contextWindow: 128000,
        tier: 'free'
    }
};

export const FALLBACK_ORDER: ModelId[] = [
    'gemini-2.5-flash',
    'mistral-small',
    'gemini-2.5-flash-lite',
    'llama-4-scout',
    'gpt-oss-20b',
    'deepseek-chat'
];

export type TaskType = 'enhance' | 'research' | 'agent' | 'image' | 'chain';

export const TASK_ROUTING: Record<string, ModelId[]> = {
  enhance:  ['gemini-2.5-flash', 'mistral-small', 'gemini-2.5-flash-lite', 'llama-4-scout', 'gpt-oss-20b'],
  research: ['gemini-2.5-flash', 'mistral-small', 'deepseek-chat', 'gemini-2.5-flash-lite'],
  agent:    ['gemini-2.5-flash', 'mistral-small', 'llama-4-scout', 'gpt-oss-20b'],
  image:    ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  chain:    ['gemini-2.5-flash', 'mistral-small', 'llama-4-scout', 'gpt-oss-20b'],
};

export function getModelsForTask(task: string, userTier?: 'free' | 'pro' | 'guest'): ModelId[] {
  const models = TASK_ROUTING[task] ?? TASK_ROUTING.enhance;
  if (userTier === 'pro') {
    return [...new Set(['deepseek-chat' as ModelId, 'gemini-2.5-pro' as ModelId, ...models])];
  }
  // Free/guest users: filter out pro-only models, but ensure at least one model remains
  const freeModels = models.filter(id => AVAILABLE_MODELS[id].tier === 'free');
  return freeModels.length > 0 ? freeModels : [models[0]];
}

/**
 * Check if a specific model requires pro tier
 */
export function isProModel(modelId: ModelId): boolean {
  return AVAILABLE_MODELS[modelId]?.tier === 'pro';
}

/**
 * Get the free-tier fallback for a given model
 */
export function getFreeFallback(modelId: ModelId): ModelId {
  if (AVAILABLE_MODELS[modelId]?.tier === 'free') return modelId;
  // Return the first free model in fallback order
  return FALLBACK_ORDER.find(id => AVAILABLE_MODELS[id].tier === 'free') ?? 'gemini-2.5-flash';
}
