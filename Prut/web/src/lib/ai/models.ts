import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq as defaultGroq, createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { LanguageModel } from "ai";

/**
 * Optional Cloudflare AI Gateway pass-through.
 * When CF_AI_GATEWAY_URL is set (e.g.
 *   https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway-id>),
 * each provider's baseURL is rewritten to the gateway's per-provider path.
 * Cloudflare proxies the request to the upstream provider using the same
 * API key we already pass, and we get caching + observability + rate-limit
 * controls in the CF dashboard for free.
 *
 * When unset, providers use their default upstream URL (current behaviour).
 */
const CF_GATEWAY = process.env.CF_AI_GATEWAY_URL?.replace(/\/$/, "");
// CF AI Gateway requires the upstream provider's API version segment in the path,
// because the AI SDK appends the route (e.g. "/models/..." or "/chat/completions")
// directly to the baseURL we hand it. Without these suffixes the gateway 404s.
const PROVIDER_SUFFIX: Record<string, string> = {
  "google-ai-studio": "/v1beta",
  groq: "/v1",
  mistral: "/v1",
};
const gatewayBase = (provider: string) =>
  CF_GATEWAY ? `${CF_GATEWAY}/${provider}${PROVIDER_SUFFIX[provider] ?? ""}` : undefined;

export type ModelId =
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-backup"
  | "gemini-2.5-flash-lite"
  | "llama-4-scout"
  | "gpt-oss-20b"
  | "mistral-small";

// Server-side Google provider - no Referer header needed.
// API key restrictions should use "None" or IP-based (not HTTP referrer)
// since this runs in Vercel serverless functions, not the browser.
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  baseURL: gatewayBase("google-ai-studio"),
});

// Backup Google provider — only constructed when GOOGLE_GENERATIVE_AI_API_KEY_BACKUP
// is set. When unset, it's omitted from AVAILABLE_MODELS entirely so nothing can
// route to a provider with no credentials.
const googleBackup = process.env.GOOGLE_GENERATIVE_AI_API_KEY_BACKUP
  ? createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY_BACKUP,
      baseURL: gatewayBase("google-ai-studio"),
    })
  : null;

const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: gatewayBase("mistral"),
});

const groq = CF_GATEWAY
  ? createGroq({ apiKey: process.env.GROQ_API_KEY, baseURL: gatewayBase("groq") })
  : defaultGroq;

// Re-exported so callers route through the optional CF AI Gateway instead of
// importing from `@ai-sdk/{google,groq,mistral}` directly. Keeping the same
// import surface (`google("model-id")`, etc.) means callers don't need any
// other code changes.
export { google, groq, mistralProvider };

interface ModelConfig {
  id: ModelId;
  provider: "google" | "google-backup" | "groq" | "mistral";
  model: LanguageModel;
  label: string;
  contextWindow: number;
  supportsVision: boolean;
}

export const AVAILABLE_MODELS: Partial<Record<ModelId, ModelConfig>> = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    model: google("gemini-2.5-flash"),
    label: "Gemini 2.5 Flash (Primary)",
    contextWindow: 1000000,
    supportsVision: true,
  },
  ...(googleBackup
    ? {
        "gemini-2.5-flash-backup": {
          id: "gemini-2.5-flash-backup" as const,
          provider: "google-backup" as const,
          model: googleBackup("gemini-2.5-flash"),
          label: "Gemini 2.5 Flash (Backup Key)",
          contextWindow: 1000000,
          supportsVision: true,
        },
      }
    : {}),
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

const HAS_BACKUP_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY_BACKUP);

// Drop the backup model from any chain when its key isn't configured —
// otherwise every fallback wastes a round-trip waiting for the circuit
// breaker to open on the missing-key error.
const dropBackupIfMissing = (ids: ModelId[]): ModelId[] =>
  HAS_BACKUP_KEY ? ids : ids.filter((id) => id !== "gemini-2.5-flash-backup");

export const FALLBACK_ORDER: ModelId[] = dropBackupIfMissing([
  "gemini-2.5-flash", // Best quality, free tier on Google
  "gemini-2.5-flash-backup", // Same model, backup API key (skipped if key not set)
  "mistral-small", // Fast, free tier on Mistral
  "gemini-2.5-flash-lite", // Lighter Google backup
  "llama-4-scout", // Free on Groq
  "gpt-oss-20b", // Free on Groq
]);

type TaskType = "enhance" | "research" | "agent" | "image" | "video" | "chain" | "classify";

// All models are free/low-cost — no expensive pro models in any route
export const TASK_ROUTING: Record<string, ModelId[]> = {
  enhance: dropBackupIfMissing([
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "mistral-small",
    "gemini-2.5-flash-lite",
    "llama-4-scout",
    "gpt-oss-20b",
  ]),
  research: dropBackupIfMissing([
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "mistral-small",
    "gemini-2.5-flash-lite",
    "llama-4-scout",
  ]),
  agent: dropBackupIfMissing([
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "mistral-small",
    "llama-4-scout",
    "gpt-oss-20b",
  ]),
  image: dropBackupIfMissing([
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "gemini-2.5-flash-lite",
    "mistral-small",
    "llama-4-scout",
  ]),
  video: dropBackupIfMissing([
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "gemini-2.5-flash-lite",
    "mistral-small",
  ]),
  chain: dropBackupIfMissing([
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "mistral-small",
    "llama-4-scout",
    "gpt-oss-20b",
  ]),
  // Lightweight internal tasks (category suggestion, tagging). Flash Lite is
  // the cheapest Google model and handles simple JSON classification well.
  classify: ["gemini-2.5-flash-lite", "mistral-small", "llama-4-scout"],
};

export function getModelsForTask(task: string, userTier?: "free" | "pro" | "guest"): ModelId[] {
  // All users get the same optimized low-cost model routing (userTier reserved for future tier-based routing)
  void userTier;
  return TASK_ROUTING[task] ?? TASK_ROUTING.enhance;
}

/**
 * Stage-3 cost-funnel tier selection. Short prompts route to flash-lite,
 * which is ~70% cheaper. Threshold is 200 chars by default.
 */
export function selectModelByLength(charCount: number, threshold: number = 200): ModelId {
  return charCount < threshold ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
}
