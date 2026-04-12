/**
 * Simple token estimation utilities.
 *
 * Uses character-based heuristics rather than a full tokenizer to keep
 * the bundle lightweight and avoid runtime dependencies.
 *
 * Heuristic:
 *   - English / Latin text: ~1 token per 4 characters
 *   - Hebrew / Arabic (RTL) text: ~1 token per 2 characters
 *   - Mixed text: weighted average based on RTL character ratio
 */

// Unicode ranges for RTL scripts (Hebrew, Arabic, and related)
const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * Estimate the number of tokens in a text string.
 *
 * @param text - The input text to estimate
 * @returns Estimated token count (always >= 0)
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  const rtlMatches = text.match(RTL_REGEX);
  const rtlCharCount = rtlMatches ? rtlMatches.length : 0;
  const totalChars = text.length;

  if (totalChars === 0) return 0;

  const rtlRatio = rtlCharCount / totalChars;

  // Weighted average: RTL chars use ~2 chars/token, Latin uses ~4 chars/token
  const charsPerToken = 2 * rtlRatio + 4 * (1 - rtlRatio);

  return Math.ceil(totalChars / charsPerToken);
}

/**
 * Trim text to a token budget (RTL-aware char budget), preferring sentence
 * boundaries. Used by context compression and anywhere we must cap text
 * while staying consistent with `estimateTokens`.
 *
 * @param appendTrimMarker - When true (default), appends a visible marker so
 *   user-facing snippets show that truncation occurred. Pass false for
 *   internal context injection (e.g. `compressToLimit`).
 */
export function trimToTokenLimit(
  text: string,
  maxTokens: number,
  appendTrimMarker = true
): { text: string; trimmed: boolean } {
  if (!text) return { text: "", trimmed: false };

  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) {
    return { text, trimmed: false };
  }

  const rtlMatches = text.match(RTL_REGEX);
  const rtlCharCount = rtlMatches ? rtlMatches.length : 0;
  const rtlRatio = text.length > 0 ? rtlCharCount / text.length : 0;
  const charsPerToken = 2 * rtlRatio + 4 * (1 - rtlRatio);
  const charLimit = Math.floor(maxTokens * charsPerToken);

  let trimmed = text.slice(0, charLimit);

  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf(".\n"),
    trimmed.lastIndexOf("! "),
    trimmed.lastIndexOf("!\n"),
    trimmed.lastIndexOf("? "),
    trimmed.lastIndexOf("?\n"),
    trimmed.lastIndexOf("\n\n")
  );

  if (lastSentenceEnd > charLimit * 0.6) {
    trimmed = trimmed.slice(0, lastSentenceEnd + 1);
  }

  const body = trimmed.trimEnd();
  const out = appendTrimMarker ? `${body}\n\n[...content trimmed...]` : body;
  return { text: out, trimmed: true };
}
