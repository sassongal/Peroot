import type { PersonalPrompt } from "@/lib/types";

export interface CorpusLookupResult {
  /** The selected prompts that were resolvable, in selection order. */
  found: PersonalPrompt[];
  /** How many selected ids could not be resolved from corpus or page. */
  missingCount: number;
}

/**
 * Resolve a set of selected prompt ids against the full personal-library corpus,
 * with the current page taking precedence (its objects are the freshest).
 *
 * A batch selection can span pages, so the current page alone is not enough — an
 * item selected on page 2 must still be found when the batch runs on page 3.
 * Page items are inserted last so they win over any stale corpus copy. Anything
 * that resolves from neither is reported via `missingCount` instead of being
 * silently dropped.
 */
export function lookupSelectedAcrossCorpus(
  selectedIds: Iterable<string>,
  corpus: PersonalPrompt[],
  pageItems: PersonalPrompt[],
): CorpusLookupResult {
  const lookup = new Map<string, PersonalPrompt>();
  for (const p of corpus) lookup.set(p.id, p);
  for (const p of pageItems) lookup.set(p.id, p);
  const ids = Array.from(selectedIds);
  const found = ids.map((id) => lookup.get(id)).filter((p): p is PersonalPrompt => Boolean(p));
  return { found, missingCount: ids.length - found.length };
}
