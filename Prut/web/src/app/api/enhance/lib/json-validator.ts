import { parseTrailer } from "@/lib/prompt-stream/trailer";

/**
 * Validates that a raw LLM output string contains valid JSON.
 *
 * Strips the prompt-trailer ([PROMPT_TITLE] / [GENIUS_QUESTIONS]) via the shared
 * `parseTrailer` seam, then peels any markdown code fences, before parsing.
 */
export function validateJsonOutput(text: string): { jsonValid: boolean; jsonError: string | null } {
  const cleaned = parseTrailer(text)
    .body.replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    JSON.parse(cleaned);
    return { jsonValid: true, jsonError: null };
  } catch (err) {
    return {
      jsonValid: false,
      jsonError: err instanceof Error ? err.message : String(err),
    };
  }
}
