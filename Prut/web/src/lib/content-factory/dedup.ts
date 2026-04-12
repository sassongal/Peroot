/**
 * Content deduplication utilities for Content Factory.
 * Prevents generating content that's too similar to existing entries.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Simple similarity score between two strings (0-1).
 * Uses trigram comparison for fuzzy matching.
 */
function similarity(a: string, b: string): number {
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

async function loadExistingTitles(
  supabase: SupabaseClient,
  table: 'blog_posts' | 'public_library_prompts',
): Promise<string[]> {
  const { data } = await supabase.from(table).select('title').limit(500);
  if (!data?.length) return [];
  return data.map(row => row.title as string);
}

/**
 * Best fuzzy match of `title` against `existingTitles` (DB + batch candidates already accepted).
 */
function findBestDuplicateMatch(
  title: string,
  existingTitles: readonly string[],
  threshold: number,
): { existingTitle: string; score: number } | null {
  let maxScore = 0;
  let maxTitle = '';

  for (const t of existingTitles) {
    const score = similarity(title, t);
    if (score > maxScore) {
      maxScore = score;
      maxTitle = t;
    }
  }

  if (maxScore >= threshold) {
    return { existingTitle: maxTitle, score: maxScore };
  }

  return null;
}

/**
 * Check if a title is too similar to any existing title.
 * Returns the most similar existing title and its score, or null if unique enough.
 */
export async function findDuplicate(
  supabase: SupabaseClient,
  title: string,
  table: 'blog_posts' | 'public_library_prompts',
  threshold: number = 0.8,
): Promise<{ existingTitle: string; score: number } | null> {
  const existingTitles = await loadExistingTitles(supabase, table);
  return findBestDuplicateMatch(title, existingTitles, threshold);
}

export type DedupDecision =
  | { ok: true }
  | { ok: false; similar: string; score: number };

/**
 * Filter a batch of candidate titles against the DB (same rules as {@link findDuplicate}),
 * with **one** DB read and **within-batch** dedup (later titles cannot repeat earlier ones).
 */
export async function filterDuplicates(
  supabase: SupabaseClient,
  titles: string[],
  table: 'blog_posts' | 'public_library_prompts',
  threshold = 0.8,
): Promise<{ decisions: DedupDecision[] }> {
  const existingTitles = await loadExistingTitles(supabase, table);
  const pool: string[] = [...existingTitles];
  const decisions: DedupDecision[] = [];

  for (const title of titles) {
    const dup = findBestDuplicateMatch(title, pool, threshold);
    if (dup) {
      decisions.push({ ok: false, similar: dup.existingTitle, score: dup.score });
    } else {
      decisions.push({ ok: true });
      pool.push(title);
    }
  }

  return { decisions };
}
