/**
 * Content deduplication utilities for Content Factory.
 * Prevents generating content that's too similar to existing entries.
 */

/**
 * Simple similarity score between two strings (0-1).
 * Uses trigram comparison for fuzzy matching.
 */
export function similarity(a: string, b: string): number {
  const aNorm = a.trim().toLowerCase();
  const bNorm = b.trim().toLowerCase();

  if (aNorm === bNorm) return 1;
  if (aNorm.length < 3 || bNorm.length < 3) return 0;

  const trigramsA = getTrigrams(aNorm);
  const trigramsB = getTrigrams(bNorm);

  const intersection = trigramsA.filter(t => trigramsB.includes(t));
  const union = new Set([...trigramsA, ...trigramsB]);

  return intersection.length / union.size;
}

function getTrigrams(str: string): string[] {
  const trigrams: string[] = [];
  for (let i = 0; i <= str.length - 3; i++) {
    trigrams.push(str.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Check if a title is too similar to any existing title.
 * Returns the most similar existing title and its score, or null if unique enough.
 */
export async function findDuplicate(
  supabase: any,
  title: string,
  table: 'blog_posts' | 'public_library_prompts',
  threshold: number = 0.8
): Promise<{ existingTitle: string; score: number } | null> {
  const column = 'title';

  const { data } = await supabase
    .from(table)
    .select(column)
    .limit(500);

  if (!data || data.length === 0) return null;

  let maxScore = 0;
  let maxTitle = '';

  for (const row of data) {
    const score = similarity(title, row[column]);
    if (score > maxScore) {
      maxScore = score;
      maxTitle = row[column];
    }
  }

  if (maxScore >= threshold) {
    return { existingTitle: maxTitle, score: maxScore };
  }

  return null;
}

/**
 * Filter a batch of generated titles, removing duplicates.
 * Returns only titles that are unique enough.
 */
export async function filterDuplicates(
  supabase: any,
  titles: string[],
  table: 'blog_posts' | 'public_library_prompts',
  threshold: number = 0.8
): Promise<{ unique: string[]; duplicates: { title: string; similar: string; score: number }[] }> {
  const unique: string[] = [];
  const duplicates: { title: string; similar: string; score: number }[] = [];

  for (const title of titles) {
    const dup = await findDuplicate(supabase, title, table, threshold);
    if (dup) {
      duplicates.push({ title, similar: dup.existingTitle, score: dup.score });
    } else {
      unique.push(title);
    }
  }

  return { unique, duplicates };
}
