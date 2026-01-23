import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

// Primary: Google Gemini 2.5 Flash (Verified Available)
export const gemini = google('gemini-2.5-flash');

// Fallback: Groq Llama 3 70B (Free beta, ultra-fast)
export const groqLlama = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
})('llama3-70b-8192');

export const AI_PROVIDERS = {
  PRIMARY: 'gemini',
  FALLBACK: 'groq-llama3',
} as const;
