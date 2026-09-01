/**
 * Hebrew fuzzy search utility — THE one text normalizer for prompt search
 * (U3.2). Strips niqqud and common Hebrew prefixes, then substring-matches
 * on the stripped forms. Every prompt search (public catalogue, personal
 * library, graph, guest localStorage) goes through these helpers so a typo
 * or a vowelized text behaves the same everywhere.
 */

const HEBREW_PREFIXES = ["ה", "ו", "ב", "ל", "מ", "ש", "כ"];

// Hebrew points (niqqud + cantillation range) — stripped so "פֵּרוּט" matches "פרוט".
const NIQQUD_RE = /[֑-ׇ]/g;

/** Lowercase + strip niqqud. The shared base every matcher builds on. */
export function normalizeHebrew(text: string): string {
  return text.toLowerCase().replace(NIQQUD_RE, "");
}

/**
 * Strip a single Hebrew prefix from a word if present.
 * Returns both the original and stripped form.
 */
function stripHebrewPrefix(word: string): string[] {
  const forms = [word];
  if (word.length > 2) {
    for (const prefix of HEBREW_PREFIXES) {
      if (word.startsWith(prefix)) {
        forms.push(word.slice(prefix.length));
      }
    }
  }
  return forms;
}

/**
 * Check if `text` fuzzy-matches `query` with Hebrew prefix awareness.
 * Tries substring match on all prefix-stripped forms of each query word.
 */
export function hebrewFuzzyMatch(text: string, query: string): boolean {
  if (!query || !text) return !query;

  const normalizedText = normalizeHebrew(text);
  const normalizedQuery = normalizeHebrew(query).trim();

  // Direct substring match first (fast path)
  if (normalizedText.includes(normalizedQuery)) return true;

  // Split query into words and check each
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return true;

  return queryWords.every((qWord) => {
    // Try all prefix-stripped forms of the query word
    const queryForms = stripHebrewPrefix(qWord);
    // Also try stripping prefixes from text words
    const textWords = normalizedText.split(/\s+/);

    return queryForms.some(
      (qForm) =>
        normalizedText.includes(qForm) ||
        textWords.some((tWord) =>
          stripHebrewPrefix(tWord).some((tForm) => tForm.includes(qForm) || qForm.includes(tForm)),
        ),
    );
  });
}

/**
 * Score a match for ranking (higher = better match).
 * Returns 0 for no match.
 */
export function hebrewMatchScore(text: string, query: string): number {
  if (!query || !text) return query ? 0 : 1;

  const normalizedText = normalizeHebrew(text);
  const normalizedQuery = normalizeHebrew(query).trim();

  // Exact match
  if (normalizedText === normalizedQuery) return 100;
  // Starts with
  if (normalizedText.startsWith(normalizedQuery)) return 80;
  // Contains as substring
  if (normalizedText.includes(normalizedQuery)) return 60;
  // Fuzzy match (prefix-stripped)
  if (hebrewFuzzyMatch(text, query)) return 30;

  return 0;
}
