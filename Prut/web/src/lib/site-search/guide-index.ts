/**
 * Static index for /guide — mirrors section anchors in app/guide/page.tsx TABLE_OF_CONTENTS.
 * Used by site search (no DB).
 */
import { hebrewFuzzyMatch } from "@/lib/hebrew-search";

const GUIDE_SEARCH_INDEX: Array<{
  id: string;
  label: string;
  keywords?: string[];
}> = [
  { id: "what-is-prompt", label: "מה זה פרומפט?", keywords: ["הגדרה", "prompt", "פרומפט"] },
  { id: "golden-rules", label: "5 עקרונות הזהב", keywords: ["עקרונות", "כללים", "golden"] },
  { id: "advanced", label: "טכניקות מתקדמות", keywords: ["מתקדם", "chain", "few-shot"] },
  { id: "image-video", label: "פרומפטים לתמונות ווידאו", keywords: ["תמונה", "וידאו", "image", "video"] },
  { id: "ai-agents", label: "בניית סוכני AI", keywords: ["סוכן", "agent", "אוטומציה"] },
  { id: "deep-research", label: "מחקר מעמיק עם AI", keywords: ["מחקר", "research", "perplexity"] },
  { id: "by-platform", label: "פרומפטים לפי פלטפורמה", keywords: ["chatgpt", "claude", "gemini"] },
  { id: "tips-2026", label: "טיפים ל-2026", keywords: ["טיפים", "עדכוני"] },
  { id: "mistakes", label: "טעויות נפוצות", keywords: ["שגיאות", "טעויות"] },
];

export function searchGuideSections(query: string): typeof GUIDE_SEARCH_INDEX {
  const q = query.trim();
  if (q.length < 2) return [];

  return GUIDE_SEARCH_INDEX.filter((entry) => {
    if (hebrewFuzzyMatch(entry.label, q)) return true;
    if (entry.keywords?.some((k) => hebrewFuzzyMatch(k, q))) return true;
    return false;
  });
}
