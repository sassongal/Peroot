import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { LanguageModel } from "ai";

export type ModelId = 'gemini-2.0-flash' | 'gemini-1.5-flash' | 'llama-3-70b';

export interface ModelConfig {
    id: ModelId;
    provider: 'google' | 'groq';
    model: LanguageModel;
    label: string;
    contextWindow: number;
    tier: 'free' | 'paid';
}

export const AVAILABLE_MODELS: Record<ModelId, ModelConfig> = {
    'gemini-2.0-flash': {
        id: 'gemini-2.0-flash',
        provider: 'google',
        model: google('gemini-2.0-flash'),
        label: 'Gemini 2.0 Flash (Primary)',
        contextWindow: 1000000,
        tier: 'free'
    },
    'gemini-1.5-flash': {
        id: 'gemini-1.5-flash',
        provider: 'google',
        model: google('gemini-1.5-flash'),
        label: 'Gemini 1.5 Flash (Backup)',
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
    }
};

export const FALLBACK_ORDER: ModelId[] = [
    'gemini-2.0-flash', 
    'gemini-1.5-flash', 
    'llama-3-70b'
];
