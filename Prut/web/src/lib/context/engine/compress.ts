import { estimateTokens, trimToTokenLimit } from '@/lib/context/token-counter';

interface CompressResult {
  text: string;
  truncated: boolean;
  originalTokenCount: number;
  finalTokenCount: number;
}

/**
 * Trim text to a token budget. Delegates to `trimToTokenLimit` so the same
 * RTL-aware heuristic as `estimateTokens` is used (not a flat ×4 char rule).
 */
export function compressToLimit(text: string, maxTokens: number): CompressResult {
  const original = estimateTokens(text);
  if (original <= maxTokens) {
    return { text, truncated: false, originalTokenCount: original, finalTokenCount: original };
  }
  const { text: cut, trimmed } = trimToTokenLimit(text, maxTokens, false);
  return {
    text: cut,
    truncated: trimmed,
    originalTokenCount: original,
    finalTokenCount: estimateTokens(cut),
  };
}
