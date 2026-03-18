/**
 * Slug sanitization utilities for Content Factory
 * IRON RULE: Only a-z, 0-9, א-ת, single hyphens. No --, no special chars.
 */

/**
 * Sanitize a string into a valid URL slug.
 * Supports both Hebrew and English slugs.
 */
export function sanitizeSlug(input: string, locale: 'he' | 'en' = 'en'): string {
  let slug = input.trim().toLowerCase();

  if (locale === 'en') {
    // Remove everything except a-z, 0-9, spaces, hyphens
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
  } else {
    // Hebrew: keep א-ת, a-z, 0-9, spaces, hyphens
    slug = slug.replace(/[^\u0590-\u05FFa-z0-9\s-]/g, '');
  }

  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');

  // Collapse multiple hyphens into one
  slug = slug.replace(/-{2,}/g, '-');

  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');

  return slug;
}

/**
 * Generate both Hebrew and English slugs from a Hebrew title.
 * English slug is a transliteration.
 */
export function generateSlugPair(hebrewTitle: string, englishTitle?: string): {
  heSlug: string;
  enSlug: string;
} {
  const heSlug = sanitizeSlug(hebrewTitle, 'he');

  // If we have an English title (from AI), use it directly
  if (englishTitle) {
    return {
      heSlug,
      enSlug: sanitizeSlug(englishTitle, 'en'),
    };
  }

  // Fallback: simple transliteration for slug
  const enSlug = sanitizeSlug(transliterateHebrew(hebrewTitle), 'en');
  return { heSlug, enSlug };
}

/**
 * Basic Hebrew to English transliteration for slug generation.
 * Not meant to be perfect — just produces readable URL-safe strings.
 */
function transliterateHebrew(text: string): string {
  const map: Record<string, string> = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
    'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y',
    'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
    'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p',
    'ף': 'f', 'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r',
    'ש': 'sh', 'ת': 't',
  };

  return text
    .split('')
    .map(char => map[char] || char)
    .join('');
}

/**
 * Check if a slug already exists in the database.
 */
export async function isSlugUnique(
  supabase: any,
  slug: string,
  table: 'blog_posts' | 'public_library_prompts',
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select('id')
    .eq('slug', slug)
    .limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return !data || data.length === 0;
}

/**
 * Generate a unique slug by appending a counter if needed.
 */
export async function ensureUniqueSlug(
  supabase: any,
  baseSlug: string,
  table: 'blog_posts' | 'public_library_prompts'
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (!(await isSlugUnique(supabase, slug, table))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 20) {
      // Safety: add timestamp to guarantee uniqueness
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * Calculate read time from HTML content.
 * Average reading speed in Hebrew: ~200 words per minute.
 */
export function calculateReadTime(htmlContent: string): string {
  // Strip HTML tags
  const text = htmlContent.replace(/<[^>]*>/g, '');
  // Count words (split on whitespace)
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} דקות קריאה`;
}
