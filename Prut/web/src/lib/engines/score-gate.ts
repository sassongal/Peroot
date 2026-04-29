import type { ModelProfile } from "./types";

/**
 * Stage-1 gate: returns true when the input is already strong enough that
 * we should skip the LLM and just return a model-tagged wrapper.
 */
export function shouldSkipLLM(score: number, threshold: number): boolean {
  return score >= threshold;
}

/**
 * Apply model-specific scaffolding to text without an LLM call. Pure function.
 */
export function applyModelTagWrapper(text: string, profile: ModelProfile): string {
  const prefer = (profile.outputFormatRules?.prefer as string | undefined) ?? null;
  if (!prefer) return text;

  if (prefer === "xml_tags") {
    return `<task>\n${text.trim()}\n</task>`;
  }
  if (prefer === "markdown_headers") {
    return `## משימה\n\n${text.trim()}`;
  }
  if (prefer === "numbered_lists") {
    return `1. ${text.trim()}`;
  }
  return text;
}
