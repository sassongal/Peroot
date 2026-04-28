import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { LanguageModel } from "ai";

export type ModelId =
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "llama-4-scout"
  | "gpt-oss-20b"
  | "mistral-small";

// Server-side Google provider - no Referer header needed.
// API key restrictions should use "None" or IP-based (not HTTP referrer)
// since this runs in Vercel serverless functions, not the browser.
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY });

interface ModelConfig {
  id: ModelId;
  provider: "google" | "groq" | "mistral";
  model: LanguageModel;
  label: string;
  contextWindow: number;
  supportsVision: boolean;
}

export const AVAILABLE_MODELS: Record<ModelId, ModelConfig> = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    model: google("gemini-2.5-flash"),
    label: "Gemini 2.5 Flash (Primary)",
    contextWindow: 1000000,
    supportsVision: true,
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    provider: "google",
    model: google("gemini-2.5-flash-lite"),
    label: "Gemini 2.5 Flash Lite",
    contextWindow: 1000000,
    supportsVision: true,
  },
  "llama-4-scout": {
    id: "llama-4-scout",
    provider: "groq",
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    label: "Llama 4 Scout (Groq)",
    contextWindow: 512000,
    supportsVision: false,
  },
  "gpt-oss-20b": {
    id: "gpt-oss-20b",
    provider: "groq",
    model: groq("openai/gpt-oss-20b"),
    label: "GPT-OSS 20B (Groq)",
    contextWindow: 32768,
    supportsVision: false,
  },
  "mistral-small": {
    id: "mistral-small",
    provider: "mistral",
    model: mistralProvider("mistral-small-latest"),
    label: "Mistral Small 3.1",
    contextWindow: 32000,
    supportsVision: false,
  },
};

export const FALLBACK_ORDER: ModelId[] = [
  "gemini-2.5-flash", // Best quality, free tier on Google
  "mistral-small", // Fast, free tier on Mistral
  "gemini-2.5-flash-lite", // Lighter Google backup
  "llama-4-scout", // Free on Groq
  "gpt-oss-20b", // Free on Groq
];

type TaskType = "enhance" | "research" | "agent" | "image" | "video" | "chain" | "classify";

// All models are free/low-cost — no expensive pro models in any route
export const TASK_ROUTING: Record<string, ModelId[]> = {
  enhance: [
    "gemini-2.5-flash",
    "mistral-small",
    "gemini-2.5-flash-lite",
    "llama-4-scout",
    "gpt-oss-20b",
  ],
  research: ["gemini-2.5-flash", "mistral-small", "gemini-2.5-flash-lite", "llama-4-scout"],
  agent: ["gemini-2.5-flash", "mistral-small", "llama-4-scout", "gpt-oss-20b"],
  image: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "mistral-small", "llama-4-scout"],
  video: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "mistral-small"],
  chain: ["gemini-2.5-flash", "mistral-small", "llama-4-scout", "gpt-oss-20b"],
  // Lightweight internal tasks (category suggestion, tagging). Flash Lite is
  // the cheapest Google model and handles simple JSON classification well.
  classify: ["gemini-2.5-flash-lite", "mistral-small", "llama-4-scout"],
};

export function getModelsForTask(task: string, userTier?: "free" | "pro" | "guest"): ModelId[] {
  // All users get the same optimized low-cost model routing (userTier reserved for future tier-based routing)
  void userTier;
  return TASK_ROUTING[task] ?? TASK_ROUTING.enhance;
}
