import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq as defaultGroq, createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createGateway } from "@ai-sdk/gateway";
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
  | "gemini-3-flash"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-backup"
  | "gemini-2.5-flash-lite"
  | "gpt-5-mini"
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

// Vercel AI Gateway — cross-vendor fallback lane (0% markup, provider list
// prices, $5/month included on the team plan). Gives the chain a non-Google
// model with STRONG Hebrew (GPT-5 family, #4 on the HF Hebrew leaderboard)
// without opening an OpenAI account. Only constructed when the key is set,
// same pattern as the backup Google key.
const vercelGateway = process.env.AI_GATEWAY_API_KEY
  ? createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY })
  : null;

// Re-exported so callers route through the optional CF AI Gateway instead of
// importing from `@ai-sdk/{google,groq,mistral}` directly. Keeping the same
// import surface (`google("model-id")`, etc.) means callers don't need any
// other code changes.
export { google, groq, mistralProvider };

interface ModelConfig {
  id: ModelId;
  provider: "google" | "google-backup" | "groq" | "mistral" | "vercel-gateway";
  model: LanguageModel;
  label: string;
  contextWindow: number;
  supportsVision: boolean;
  /**
   * Output languages this model writes badly enough that a fallback to it
   * would be worse than the next model in the chain. Languages spec B3.6:
   * Mistral Small and gpt-oss-20b are weak in Arabic, so an Arabic request
   * skips them and lands on Flash Lite or Llama 4 Scout instead.
   */
  weakLanguages?: readonly string[];
}

export const AVAILABLE_MODELS: Partial<Record<ModelId, ModelConfig>> = {
  // Primary since 2026-09-05 (branch "gateway"). Family holds #1+#2 on the HF
  // Hebrew LLM leaderboard; live A/B against 2.5-flash on the production
  // STANDARD prompt measured TTFT 0.95s vs 5.2s (5x faster) with sharper
  // output. MUST run with thinkingConfig.thinkingLevel "minimal"/"low"
  // (buildProviderOptions handles it) — default thinking makes TTFT 15s+.
  "gemini-3-flash": {
    id: "gemini-3-flash",
    provider: "google",
    model: google("gemini-3-flash-preview"),
    label: "Gemini 3 Flash (Primary)",
    contextWindow: 1000000,
    supportsVision: true,
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    model: google("gemini-2.5-flash"),
    label: "Gemini 2.5 Flash",
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
  ...(vercelGateway
    ? {
        "gpt-5-mini": {
          id: "gpt-5-mini" as const,
          provider: "vercel-gateway" as const,
          model: vercelGateway("openai/gpt-5-mini"),
          label: "GPT-5 Mini (Vercel AI Gateway)",
          contextWindow: 400000,
          supportsVision: true,
        },
      }
    : {}),
  "llama-4-scout": {
    id: "llama-4-scout",
    provider: "groq",
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    label: "Llama 4 Scout (Groq)",
    contextWindow: 512000,
    supportsVision: false,
    // Meta's 12 official Llama 4 languages include Arabic but NOT Hebrew or
    // Russian. Hebrew can't be filtered (the language filter deliberately
    // leaves he/en chains untouched), so the tail position is its Hebrew
    // guard; Russian is filtered here. Arabic stays available — the Arabic
    // chain relies on it (see the language-filter tests).
    weakLanguages: ["russian"],
  },
  "gpt-oss-20b": {
    id: "gpt-oss-20b",
    provider: "groq",
    model: groq("openai/gpt-oss-20b"),
    label: "GPT-OSS 20B (Groq)",
    contextWindow: 32768,
    supportsVision: false,
    weakLanguages: ["arabic"],
  },
  "mistral-small": {
    id: "mistral-small",
    provider: "mistral",
    model: mistralProvider("mistral-small-latest"),
    label: "Mistral Small 3.1",
    contextWindow: 32000,
    supportsVision: false,
    weakLanguages: ["arabic"],
  },
};

const HAS_BACKUP_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY_BACKUP);
const HAS_GATEWAY_KEY = Boolean(process.env.AI_GATEWAY_API_KEY);

// Drop models whose keys aren't configured — otherwise every fallback wastes
// a round-trip waiting for the circuit breaker to open on a missing-key error.
const dropUnkeyed = (ids: ModelId[]): ModelId[] =>
  ids.filter(
    (id) =>
      (HAS_BACKUP_KEY || id !== "gemini-2.5-flash-backup") &&
      (HAS_GATEWAY_KEY || id !== "gpt-5-mini"),
  );
// Kept under the old name so existing call sites/tests read naturally.
const dropBackupIfMissing = dropUnkeyed;

// Chain philosophy (2026-09-05, branch "gateway"): the Google key is on the
// PAID tier (verified live: 15 parallel calls, zero 429s), so ordering is by
// Hebrew quality + latency, not by free-tier juggling. Hebrew-weak models
// (Mistral historically mediocre; Llama 4 does not officially support Hebrew)
// sit at the tail as absolute last resorts.
export const FALLBACK_ORDER: ModelId[] = dropUnkeyed([
  "gemini-3-flash", // Primary: #2 Hebrew (HF leaderboard), TTFT ~1s at thinkingLevel minimal
  "gemini-2.5-flash", // Proven previous primary, same key
  "gemini-2.5-flash-backup", // Same model, backup API key (skipped if key not set)
  "gpt-5-mini", // Cross-vendor lane via Vercel AI Gateway — strong-Hebrew family
  "gemini-2.5-flash-lite", // Light + cheapest, fastest TTFT
  "mistral-small", // Tail: fallback of last resort
  "llama-4-scout", // Tail: no official Hebrew support
  "gpt-oss-20b", // Tail
]);

type TaskType = "enhance" | "research" | "agent" | "image" | "video" | "chain" | "classify";

// No expensive pro models in any route; primary lanes run on the paid Google
// tier at flash-class prices.
export const TASK_ROUTING: Record<string, ModelId[]> = {
  enhance: dropUnkeyed([
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "gpt-5-mini",
    "gemini-2.5-flash-lite",
    "mistral-small",
    "llama-4-scout",
    "gpt-oss-20b",
  ]),
  research: dropUnkeyed([
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "gpt-5-mini",
    "gemini-2.5-flash-lite",
    "mistral-small",
  ]),
  agent: dropUnkeyed([
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-backup",
    "gpt-5-mini",
    "mistral-small",
    "llama-4-scout",
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

/**
 * Drop models that are weak in the requested output language (B3.6).
 *
 * Never empties the chain: if every model is weak, the original order is
 * returned, because a weak answer beats no answer. Hebrew and English are
 * fine everywhere, so they return the chain untouched.
 */
export function filterModelsForLanguage(models: ModelId[], outputLanguage?: string): ModelId[] {
  if (!outputLanguage || outputLanguage === "hebrew" || outputLanguage === "english") return models;
  const strong = models.filter(
    (m) => !AVAILABLE_MODELS[m]?.weakLanguages?.includes(outputLanguage),
  );
  return strong.length > 0 ? strong : models;
}

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
  return charCount < threshold ? "gemini-2.5-flash-lite" : "gemini-3-flash";
}
