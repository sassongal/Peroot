/**
 * Hebrew quality assurance for AI-generated content.
 * Checks for common issues: low Hebrew ratio, untranslated English,
 * broken HTML, and placeholder strings.
 */

interface QAResult {
  score: number; // 0-100
  issues: string[];
}

export function checkHebrewQuality(text: string): QAResult {
  const issues: string[] = [];

  // Strip HTML tags for text analysis
  const plainText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!plainText) {
    return { score: 0, issues: ["Empty content"] };
  }

  // 1. Check Hebrew character ratio (should be >60% of alphabetical chars)
  const hebrewChars = (plainText.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (plainText.match(/[a-zA-Z]/g) || []).length;
  const totalAlpha = hebrewChars + latinChars;

  if (totalAlpha > 0) {
    const hebrewRatio = hebrewChars / totalAlpha;
    if (hebrewRatio < 0.6) {
      issues.push(`אחוז עברית נמוך: ${(hebrewRatio * 100).toFixed(0)}% (מינימום 60%)`);
    }
  }

  // 2. Check for lone English sentences (3+ consecutive English words)
  const sentences = plainText.split(/[.!?。\n]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    // Count words that are purely English (no Hebrew)
    const words = trimmed.split(/\s+/);
    const englishWords = words.filter((w) => /^[a-zA-Z]+$/.test(w));
    if (englishWords.length >= 5 && englishWords.length / words.length > 0.8) {
      issues.push(`משפט באנגלית שלא תורגם: "${trimmed.slice(0, 60)}..."`);
      break; // Report only the first occurrence
    }
  }

  // 3. Check for balanced HTML tags
  const openTags = text.match(/<([a-z][a-z0-9]*)\b[^>]*(?<!\/)>/gi) || [];
  const closeTags = text.match(/<\/([a-z][a-z0-9]*)\s*>/gi) || [];
  // Self-closing and void elements don't need closing tags
  const voidElements = new Set(["br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]);
  const filteredOpen = openTags.filter((tag) => {
    const name = tag.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
    return name && !voidElements.has(name);
  });
  if (Math.abs(filteredOpen.length - closeTags.length) > 2) {
    issues.push(`תגיות HTML לא מאוזנות: ${filteredOpen.length} פתיחה, ${closeTags.length} סגירה`);
  }

  // 4. Check for placeholder/debug strings
  const placeholders = ["undefined", "null", "NaN", "[object Object]", "TODO", "FIXME"];
  for (const placeholder of placeholders) {
    if (plainText.includes(placeholder)) {
      issues.push(`מחרוזת שגויה נמצאה: "${placeholder}"`);
    }
  }

  // 5. Check for mixed RTL/LTR issues (common: parentheses/brackets in wrong direction)
  const brokenParens = plainText.match(/\([^)]*[\u0590-\u05FF][^)]*$/gm);
  if (brokenParens && brokenParens.length > 2) {
    issues.push("סוגריים לא סגורים עם טקסט עברי (בעיית RTL אפשרית)");
  }

  // Calculate score: start at 100, deduct per issue
  const deductions: Record<string, number> = {
    "אחוז עברית נמוך": 30,
    "משפט באנגלית": 20,
    "תגיות HTML": 15,
    "מחרוזת שגויה": 25,
    "סוגריים": 10,
  };

  let score = 100;
  for (const issue of issues) {
    for (const [key, deduction] of Object.entries(deductions)) {
      if (issue.includes(key)) {
        score -= deduction;
        break;
      }
    }
  }

  return { score: Math.max(0, score), issues };
}
