/**
 * Validates that a raw LLM output string contains valid JSON.
 *
 * Before parsing, strips trailing metadata blocks that engines append after the
 * main JSON payload ([PROMPT_TITLE], [GENIUS_QUESTIONS]) and markdown code fences.
 */
export function validateJsonOutput(text: string): { jsonValid: boolean; jsonError: string | null } {
  const cleaned = text
    .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/, '')
    .replace(/\[GENIUS_QUESTIONS\][\s\S]*$/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
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
