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
 *
 * When the input already looks structured (starts with a heading, list marker,
 * code fence, or XML tag) we leave it alone — re-wrapping would produce
 * malformed output like `1. # Heading...` or `<task>## Heading</task>`.
 */
export function applyModelTagWrapper(text: string, profile: ModelProfile): string {
  const prefer = (profile.outputFormatRules?.prefer as string | undefined) ?? null;
  if (!prefer) return text;

  const trimmed = text.trim();
  const alreadyStructured = /^(#{1,6}\s|[-*+]\s|\d+\.\s|```|<[a-zA-Z])/.test(trimmed);

  if (prefer === "xml_tags") {
    if (alreadyStructured && trimmed.startsWith("<")) return text;
    return `<task>\n${trimmed}\n</task>`;
  }
  if (prefer === "markdown_headers") {
    if (alreadyStructured) return text;
    return `## משימה\n\n${trimmed}`;
  }
  if (prefer === "numbered_lists") {
    if (alreadyStructured) return text;
    return `1. ${trimmed}`;
  }
  return text;
}
