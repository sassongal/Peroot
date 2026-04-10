import { estimateTokens } from '@/lib/context/token-counter';

export interface CompressResult {
  text: string;
  truncated: boolean;
  originalTokenCount: number;
  finalTokenCount: number;
}

/**
 * Trim text to a token budget. Uses the project-wide ~4-char-per-token
 * estimator so budget math stays consistent with the rest of the codebase.
 * Preserves paragraph boundaries when possible.
 */
export function compressToLimit(text: string, maxTokens: number): CompressResult {
  const original = estimateTokens(text);
  if (original <= maxTokens) {
    return { text, truncated: false, originalTokenCount: original, finalTokenCount: original };
  }
  const charBudget = maxTokens * 4;
  let cut = text.slice(0, charBudget);
  const lastBreak = cut.lastIndexOf('\n\n');
  if (lastBreak > charBudget * 0.7) cut = cut.slice(0, lastBreak);
  return {
    text: cut,
    truncated: true,
    originalTokenCount: original,
    finalTokenCount: estimateTokens(cut),
  };
}
