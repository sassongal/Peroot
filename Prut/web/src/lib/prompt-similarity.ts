/**
 * Fuzzy duplicate detection for the personal library.
 * Uses Jaccard word-overlap similarity to find near-duplicate prompts.
 */

/**
 * Normalize text for comparison: trim, collapse whitespace, lowercase Latin chars.
 * Hebrew characters are unaffected by toLowerCase but still benefit from
 * whitespace normalization.
 */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Tokenize text into a Set of words.
 * Splits on whitespace and strips leading/trailing punctuation from each token.
 */
function tokenize(text: string): Set<string> {
  const normalized = normalize(text);
  if (!normalized) return new Set();

  const tokens = normalized
    .split(/\s+/)
    .map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(t => t.length > 0);

  return new Set(tokens);
}

/**
 * Compute Jaccard similarity between two texts based on word overlap.
 * Returns a value between 0 (no overlap) and 1 (identical word sets).
 */
function jaccardSimilarity(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const word of setA) {
    if (setB.has(word)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Find prompts in existingPrompts that are similar to newText.
 * Returns matches above threshold, sorted by similarity descending.
 *
 * Also flags exact title matches (similarity = 1) regardless of prompt text.
 */
export function findSimilarPrompts(
  newText: string,
  existingPrompts: Array<{ id: string; title: string; prompt: string }>,
  threshold = 0.6
): Array<{ id: string; title: string; similarity: number }> {
  const results: Array<{ id: string; title: string; similarity: number }> = [];

  for (const existing of existingPrompts) {
    const similarity = jaccardSimilarity(newText, existing.prompt);

    if (similarity >= threshold) {
      results.push({
        id: existing.id,
        title: existing.title,
        similarity,
      });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}
