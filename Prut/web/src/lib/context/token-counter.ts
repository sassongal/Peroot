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

/** Maximum tokens allowed for a single attachment */
export const MAX_TOKENS_PER_ATTACHMENT = 5000;

/** Maximum total tokens across all attachments in one prompt */
export const MAX_TOTAL_TOKENS = 15000;

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
 * Trim text to fit within a token limit, cutting at the last sentence boundary.
 *
 * @param text - The input text to trim
 * @param maxTokens - Maximum number of tokens allowed
 * @returns Object with the (possibly trimmed) text and a flag indicating if trimming occurred
 */
export function trimToTokenLimit(
  text: string,
  maxTokens: number
): { text: string; trimmed: boolean } {
  if (!text) return { text: '', trimmed: false };

  const currentTokens = estimateTokens(text);

  if (currentTokens <= maxTokens) {
    return { text, trimmed: false };
  }

  // Estimate the character limit based on the same heuristic
  const rtlMatches = text.match(RTL_REGEX);
  const rtlCharCount = rtlMatches ? rtlMatches.length : 0;
  const rtlRatio = text.length > 0 ? rtlCharCount / text.length : 0;
  const charsPerToken = 2 * rtlRatio + 4 * (1 - rtlRatio);
  const charLimit = Math.floor(maxTokens * charsPerToken);

  // Cut the text to the character limit
  let trimmed = text.slice(0, charLimit);

  // Try to cut at the last sentence boundary (., !, ?, or newline)
  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('.\n'),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('!\n'),
    trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('?\n'),
    trimmed.lastIndexOf('\n\n')
  );

  // Only use the sentence boundary if it preserves at least 60% of the content
  if (lastSentenceEnd > charLimit * 0.6) {
    trimmed = trimmed.slice(0, lastSentenceEnd + 1);
  }

  return {
    text: trimmed.trimEnd() + '\n\n[...content trimmed...]',
    trimmed: true,
  };
}
