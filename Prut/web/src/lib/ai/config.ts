import { createOpenAI } from '@ai-sdk/openai';

// DeepSeek V3 Configuration (Primary)
export const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// Groq Configuration (Fallback)
export const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

// Model identifiers
export const MODELS = {
  DEEPSEEK_CHAT: 'deepseek-chat',
  QWEN_72B: 'qwen-2.5-72b-versatile',
} as const;
