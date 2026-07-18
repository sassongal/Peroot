import type { PersonalPrompt } from "@/lib/types";

/**
 * The markup shown for a saved personal prompt: the styled variant when present,
 * otherwise the raw prompt text. Extracted from PersonalLibraryView so both the
 * card renderer and any future consumer share one definition.
 */
export function getStyledPromptMarkup(prompt: PersonalPrompt): string {
  return prompt.prompt_style || prompt.prompt;
}

/**
 * Every unique `{token}` placeholder in a piece of prompt text, braces stripped.
 * Kept byte-for-byte identical to the former PersonalLibraryView closure so the
 * "has variables" gate on a card behaves exactly as before.
 */
export function extractVariablesFromPrompt(text: string): string[] {
  const matches = text.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}
