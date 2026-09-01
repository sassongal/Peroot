/**
 * "שגר למודל" — hand a finished prompt to the target model with the text
 * ALREADY in its composer, so the only thing left for the user is Send.
 *
 * Reality check, because getting this wrong is worse than not doing it:
 *
 * - ChatGPT and Claude both read the prompt from a `?q=` query parameter and
 *   drop it into the composer. That is the whole feature.
 * - Gemini has no such parameter. Pretending otherwise would open an empty
 *   chat and leave the user staring at it, so Gemini deliberately stays on
 *   the copy-then-open path.
 * - A URL is not an unlimited pipe. Hebrew percent-encodes to 6 characters
 *   per letter, so a long prompt blows past what servers accept and would be
 *   silently TRUNCATED — the user would send half a prompt without knowing.
 *   Above the budget we fall back to copy-then-open, which is exactly the
 *   old behavior: nothing regresses, and the toast says what happened.
 */

export type HandoffTarget = "chatgpt" | "claude" | "gemini" | "perplexity" | "grok" | "copilot";

interface HandoffConfig {
  name: string;
  /** Plain landing page, used for the copy-then-open fallback. */
  baseUrl: string;
  /** Builds a URL carrying the prompt, when the platform supports it. */
  withPrompt?: (prompt: string) => string;
}

/**
 * Conservative ceiling for the ENCODED prompt. Keeps the whole request line
 * under the ~8KB most servers and proxies accept.
 */
const MAX_ENCODED_LENGTH = 7000;

export const HANDOFF_TARGETS: Record<HandoffTarget, HandoffConfig> = {
  chatgpt: {
    name: "ChatGPT",
    baseUrl: "https://chatgpt.com/",
    withPrompt: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
  },
  claude: {
    name: "Claude",
    baseUrl: "https://claude.ai/new",
    withPrompt: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
  },
  gemini: {
    name: "Gemini",
    baseUrl: "https://gemini.google.com/app",
    // No prefill parameter exists. Copy-then-open, honestly.
  },
  perplexity: {
    name: "Perplexity",
    baseUrl: "https://www.perplexity.ai/",
    withPrompt: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`,
  },
  grok: {
    name: "Grok",
    baseUrl: "https://grok.com/",
    withPrompt: (p) => `https://grok.com/?q=${encodeURIComponent(p)}`,
  },
  copilot: {
    name: "Copilot",
    baseUrl: "https://copilot.microsoft.com/",
    withPrompt: (p) => `https://copilot.microsoft.com/?q=${encodeURIComponent(p)}`,
  },
};

/** The order the buttons render in. */
export const HANDOFF_ORDER: HandoffTarget[] = [
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "grok",
  "copilot",
];

/**
 * Map the enhance flow's `target_model` (the model the prompt was tuned for)
 * onto a handoff target, so that button can be highlighted.
 */
export function handoffTargetForModel(targetModel?: string | null): HandoffTarget | null {
  switch (targetModel) {
    case "chatgpt":
      return "chatgpt";
    case "claude":
      return "claude";
    case "gemini":
      return "gemini";
    default:
      return null;
  }
}

export interface HandoffPlan {
  /** Where to send the browser. */
  url: string;
  /** True when the prompt travels in the URL and lands in the composer. */
  prefilled: boolean;
  /** Why we fell back, when we did — drives the toast wording. */
  fallbackReason?: "unsupported" | "too_long";
  name: string;
}

export function planModelHandoff(target: HandoffTarget, prompt: string): HandoffPlan {
  const config = HANDOFF_TARGETS[target];
  const text = prompt.trim();

  if (!config.withPrompt) {
    return {
      url: config.baseUrl,
      prefilled: false,
      fallbackReason: "unsupported",
      name: config.name,
    };
  }
  if (!text) {
    return { url: config.baseUrl, prefilled: false, fallbackReason: "too_long", name: config.name };
  }

  const candidate = config.withPrompt(text);
  if (encodeURIComponent(text).length > MAX_ENCODED_LENGTH) {
    return { url: config.baseUrl, prefilled: false, fallbackReason: "too_long", name: config.name };
  }
  return { url: candidate, prefilled: true, name: config.name };
}

/** Hebrew toast copy for each outcome, so every call site says the same thing. */
export function handoffMessage(plan: HandoffPlan): string {
  if (plan.prefilled) return `${plan.name} נפתח עם הפרומפט מוכן, נשאר רק לשלוח`;
  if (plan.fallbackReason === "too_long") {
    return `הפרומפט ארוך מדי לשיגור ישיר, הועתק ללוח. הדביקו ב${plan.name}`;
  }
  return `הפרומפט הועתק ללוח. הדביקו ב${plan.name}`;
}
