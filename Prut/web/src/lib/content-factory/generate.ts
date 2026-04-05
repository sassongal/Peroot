/**
 * AI content generation for Content Factory.
 *
 * Uses generateText (non-streaming) so callers receive the full result
 * synchronously before persisting to the database.
 *
 * Model: gemini-2.5-flash — best cost/quality ratio for long-form Hebrew content.
 */

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// ---------------------------------------------------------------------------
// Types — Blog
// ---------------------------------------------------------------------------

export interface BlogGenerationParams {
  topic?: string;
  template?: 'guide' | 'listicle' | 'comparison' | 'faq';
  existingTitles: string[];
  existingCategories: string[];
  existingPromptTitles: string[]; // used for internal linking suggestions
}

export interface GeneratedBlogPost {
  title: string;
  englishTitle: string;
  content: string; // full HTML body (no wrapping <article> or <div>)
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  tags: string[];
  internalLinks: { title: string; slug: string }[];
}

// ---------------------------------------------------------------------------
// Types — Prompts
// ---------------------------------------------------------------------------

export interface PromptGenerationParams {
  topic?: string;
  category?: string;
  existingTitles: string[];
  existingCategories: { id: string; name_he: string }[];
  count?: number;
}

export interface GeneratedPrompt {
  title: string;
  prompt: string;
  use_case: string;
  variables: string[];
  output_format: string;
  quality_checks: string[];
  category_id: string;
  capability_mode: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip markdown code fences that some models add around JSON responses,
 * then parse and return the result. Throws on invalid JSON so callers
 * get a clear error rather than a silent empty result.
 */
function parseJsonResponse<T>(raw: string): T {
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError) {
    // Gemini often puts unescaped newlines/tabs inside JSON string values
    // (especially in HTML content fields). Fix them before retrying.
    logger.warn('[ContentFactory] First JSON parse failed, attempting repair...');

    // Fix unescaped control characters inside JSON string values
    // Replace literal newlines/tabs/carriage returns that aren't already escaped
    cleaned = cleaned
      .replace(/(?<=:"[^"]*)\n/g, '\\n')
      .replace(/(?<=:"[^"]*)\r/g, '\\r')
      .replace(/(?<=:"[^"]*)\t/g, '\\t');

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Last resort: try to extract JSON object from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Aggressive cleanup: replace all control characters in string values
          const aggressive = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, (ch) => {
            if (ch === '\n') return '\\n';
            if (ch === '\r') return '\\r';
            if (ch === '\t') return '\\t';
            return '';
          });
          return JSON.parse(aggressive) as T;
        } catch {
          // Give up
        }
      }
      throw firstError;
    }
  }
}

// ---------------------------------------------------------------------------
// generateBlogPost
// ---------------------------------------------------------------------------

export async function generateBlogPost(
  params: BlogGenerationParams
): Promise<GeneratedBlogPost> {
  const {
    topic,
    template = 'guide',
    existingTitles,
    existingCategories,
    existingPromptTitles,
  } = params;

  const templateInstructions: Record<NonNullable<BlogGenerationParams['template']>, string> = {
    guide:
      'מדריך מעמיק ומקצועי עם שלבים ברורים, דוגמאות מעשיות, וטיפים מתקדמים. 2000-2500 מילים.',
    listicle:
      'רשימה מעשית עם X פרומפטים/טיפים, כל אחד עם הסבר קצר ודוגמה. 1000-1500 מילים.',
    comparison:
      'השוואה מעמיקה בין שני כלים/שיטות/גישות עם טבלת יתרונות וחסרונות. 1500-2000 מילים.',
    faq:
      'שאלות ותשובות מקצועיות, כל תשובה מפורטת עם דוגמאות. 1000-1500 מילים.',
  };

  const system = `אתה כותב תוכן מקצועי בעברית עבור אתר peroot.space — מחולל פרומפטים מקצועי בעברית.
התוכן שלך חייב להיות ברמה הגבוהה ביותר: מנוסח בעברית טבעית (לא תרגום), מקצועי אך נגיש, עם ערך אמיתי לקורא.

## כללי ייחודיות (קריטי!)
- לפני שאתה כותב, בדוק את רשימת הכותרות הקיימות שתקבל. אסור בהחלט ליצור תוכן על נושא שכבר קיים.
- אם הנושא המבוקש כבר מכוסה ברשימה הקיימת — בחר זווית שונה לחלוטין או נושא משלים.
- אל תשתמש בכותרות דומות. תוודא שהכותרת שלך שונה באופן מהותי מכל הכותרות הקיימות.

## אסטרטגיית SEO/GEO לשוק הישראלי
- **מילות מפתח**: השתמש במילות מפתח בעברית שאנשים באמת מחפשים בגוגל ישראל. חשוב על "איך ל...", "מה זה...", "מדריך ל...".
- **Long-tail keywords**: כלול ביטויי חיפוש ארוכים בכותרות H2 ובתוכן (למשל: "איך לכתוב פרומפט ל-ChatGPT בעברית", לא רק "פרומפטים").
- **Competitor awareness**: כתוב תוכן שמכסה את הנושא לעומק רב יותר ממה שקיים באינטרנט בעברית. הוסף ערך ייחודי שמתחרים לא מספקים.
- **Featured Snippets**: מבנה כל H2 כשאלה או הוראה ברורה, כדי שגוגל יוכל להציג אותה כ-featured snippet.
- **הקשר ישראלי**: דוגמאות מקומיות, התייחסות לכלים פופולריים בישראל, שמות מותגים ישראליים.
- **meta_title**: עד 60 תווים, כולל מילת מפתח ראשית.
- **meta_description**: עד 155 תווים, כולל CTA וערך ייחודי.
- **tags**: 3-5 תגים שאנשים מחפשים בגוגל ישראל.

## מבנה HTML
- השתמש ב-H2 לכותרות משנה (חשוב לTOC ול-featured snippets)
- פסקאות קצרות (3-4 שורות מקסימום)
- רשימות נקודות ומספרים למידע מובנה
- <strong> להדגשות חשובות
- אסור להשתמש ב-H1 (הכותרת הראשית מגיעה מ-title)
- אל תעטוף את כל התוכן ב-div או ב-article

## קישורים פנימיים (חשוב ל-SEO!)
כלול 2-3 קישורים לפרומפטים קיימים מהספרייה שרלוונטיים לתוכן, בפורמט:
<a href="/prompts/[slug]">[שם הפרומפט]</a>
בחר פרומפטים שמשלימים את הנושא — לא רנדומליים.

## פורמט פלט
החזר JSON בלבד, ללא markdown wrapping:
{
  "title": "כותרת המאמר בעברית",
  "englishTitle": "Article Title In English (for slug)",
  "content": "<h2>...</h2><p>...</p>...",
  "excerpt": "תקציר 2-3 משפטים",
  "metaTitle": "כותרת SEO (עד 60 תווים)",
  "metaDescription": "תיאור SEO (עד 155 תווים)",
  "category": "שם הקטגוריה מהרשימה",
  "tags": ["תג1", "תג2", "תג3"],
  "internalLinks": [{"title": "שם הפרומפט", "slug": "slug-של-הפרומפט"}]
}`;

  const topicInstruction = topic
    ? `כתוב מאמר על הנושא: "${topic}"`
    : `בחר נושא חדש ורלוונטי שעדיין לא קיים באתר. הנושא צריך להיות בתחום פרומפטים, AI, או כלי בינה מלאכותית — ממוקד בשוק הישראלי.`;

  const userPrompt = `${topicInstruction}

סוג מאמר: ${templateInstructions[template]}

קטגוריות קיימות באתר (בחר מתוכן): ${existingCategories.join(', ')}

כותרות מאמרים קיימים (אל תחזור עליהם):
${existingTitles.slice(0, 50).join('\n')}

פרומפטים קיימים בספרייה (לקישורים פנימיים):
${existingPromptTitles.slice(0, 30).join('\n')}

## דרישות קריטיות:
1. וודא שהנושא שבחרת לא מכוסה כבר ברשימת הכותרות למעלה — גם לא בניסוח אחר.
2. התוכן חייב להוסיף ערך ייחודי שלא קיים במאמרים הקיימים.
3. השתמש ב-long-tail keywords שישראלים מחפשים בגוגל.
4. הקישורים הפנימיים חייבים להיות לפרומפטים שרלוונטיים באמת לנושא.`;

  const startTime = Date.now();

  const { text, usage } = await generateText({
    model: google('gemini-2.5-flash'),
    system,
    prompt: userPrompt,
    temperature: 0.8,
  });

  const durationMs = Date.now() - startTime;
  logger.info(
    `[ContentFactory] Blog generated in ${durationMs}ms, tokens: ${usage?.totalTokens ?? 'unknown'}`
  );

  return parseJsonResponse<GeneratedBlogPost>(text);
}

// ---------------------------------------------------------------------------
// generatePromptBatch
// ---------------------------------------------------------------------------

export async function generatePromptBatch(params: PromptGenerationParams): Promise<{
  prompts: GeneratedPrompt[];
  usage: { totalTokens: number };
}> {
  const {
    topic,
    category,
    existingTitles,
    existingCategories,
    count = 5,
  } = params;

  const categoryList = existingCategories
    .map((c) => `${c.id}: ${c.name_he}`)
    .join('\n');

  const system = `אתה מומחה ליצירת פרומפטים מקצועיים בעברית עבור peroot.space — מחולל פרומפטים מקצועי בעברית.

## כללי ייחודיות (קריטי!)
- לפני שאתה יוצר, בדוק את רשימת הכותרות הקיימות שתקבל. אסור בהחלט ליצור פרומפט על נושא שכבר קיים.
- אם הנושא כבר מכוסה — בחר זווית שונה, נישה ספציפית יותר, או שימוש מקצועי שונה.
- הכותרת חייבת להיות שונה באופן מהותי מכל הכותרות הקיימות.

## איכות הפרומפט
הפרומפטים שלך חייבים להיות:
- מנוסחים בעברית מקצועית וטבעית (לא תרגום מאנגלית)
- מובנים היטב: פרסונה → משימה → הקשר → פורמט → מגבלות
- כוללים משתנים (variables) שהמשתמש ממלא בסוגריים מסולסלים {{}}
- כוללים הגדרת פורמט פלט מדויק
- כוללים 2-3 בדיקות איכות (quality checks) מעשיות
- מותאמים לשוק הישראלי: דוגמאות מקומיות, הקשר תרבותי, ביטויים בעברית

## אסטרטגיית תוכן
- צור פרומפטים שפותרים בעיות אמיתיות שאנשים בישראל מתמודדים איתם
- חשוב על use cases מעשיים: עסקים קטנים, פרילנסרים, מנהלי שיווק, יזמים, סטודנטים
- כל פרומפט חייב להיות כזה שמשתמש ישתמש בו שוב ושוב — לא חד-פעמי
- הוסף ערך ייחודי שלא קיים בכלים אחרים

## capability_mode (בחר את המתאים ביותר):
- STANDARD — שדרוג פרומפט כללי (ברירת מחדל)
- DEEP_RESEARCH — מחקר מעמיק, ניתוח, דוחות
- IMAGE_GENERATION — יצירת תמונות
- AGENT_BUILDER — בניית סוכני AI, אוטומציה
- VIDEO_GENERATION — יצירת וידאו

## פורמט פלט
החזר JSON בלבד, ללא markdown wrapping:
{
  "prompts": [
    {
      "title": "שם הפרומפט בעברית — ברור ותיאורי",
      "prompt": "הפרומפט המלא עם {{משתנה}} בסוגריים מסולסלים. חייב להיות מקצועי, מובנה, ומפורט.",
      "use_case": "תיאור ברור של מתי ולמה להשתמש בפרומפט הזה",
      "variables": ["משתנה1", "משתנה2"],
      "output_format": "תיאור מדויק של הפלט הצפוי",
      "quality_checks": ["בדיקה1", "בדיקה2"],
      "category_id": "the-exact-id-from-the-list-below",
      "capability_mode": "STANDARD"
    }
  ]
}`;

  const topicInstruction = topic
    ? `צור ${count} פרומפטים מקצועיים בנושא: "${topic}"`
    : `צור ${count} פרומפטים מקצועיים חדשים וייחודיים. בחר נושאים מגוונים שעדיין לא קיימים באתר.`;

  const categoryInstruction = category
    ? `כל הפרומפטים צריכים להיות בקטגוריה: ${category}`
    : `בחר קטגוריה מתאימה לכל פרומפט מתוך הרשימה הבאה`;

  const userPrompt = `${topicInstruction}

${categoryInstruction}

קטגוריות קיימות:
${categoryList}

כותרות פרומפטים קיימים (אל תחזור עליהם):
${existingTitles.slice(0, 100).join('\n')}

## דרישות קריטיות:
1. וודא שכל פרומפט שונה באופן מהותי מהכותרות הקיימות למעלה — גם בנושא וגם בזווית.
2. כל פרומפט חייב לפתור בעיה אמיתית שאנשים בישראל מתמודדים איתה.
3. category_id חייב להיות בדיוק מהרשימה למעלה (הID באנגלית, לא השם בעברית).
4. אל תייצר פרומפטים גנריים כמו "כתוב טקסט" — כל אחד חייב להיות ספציפי ומקצועי.`;

  const startTime = Date.now();

  const { text, usage } = await generateText({
    model: google('gemini-2.5-flash'),
    system,
    prompt: userPrompt,
    temperature: 0.8,
  });

  const durationMs = Date.now() - startTime;
  logger.info(
    `[ContentFactory] ${count} prompts generated in ${durationMs}ms, tokens: ${usage?.totalTokens ?? 'unknown'}`
  );

  const parsed = parseJsonResponse<{ prompts: GeneratedPrompt[] }>(text);

  return {
    prompts: parsed.prompts,
    usage: { totalTokens: usage?.totalTokens ?? 0 },
  };
}

// ---------------------------------------------------------------------------
// getGenerationContext
// ---------------------------------------------------------------------------

/**
 * Fetch existing content context for AI generation.
 * Used to prevent duplicates and enable internal linking.
 *
 * Pass the result directly into generateBlogPost / generatePromptBatch
 * so the model knows what already exists before producing new content.
 */
export async function getGenerationContext(supabase: SupabaseClient): Promise<{
  existingBlogTitles: string[];
  existingBlogSlugs: string[];
  existingPromptTitles: string[];
  existingCategories: { id: string; name_he: string }[];
  blogCategories: string[];
}> {
  const [blogResult, promptResult, categoryResult] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('title, slug, category')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('public_library_prompts')
      .select('title, category_id')
      .eq('is_active', true)
      .limit(200),
    supabase
      .from('library_categories')
      .select('id, name_he')
      .order('sort_order'),
  ]);

  return {
    existingBlogTitles: (blogResult.data ?? []).map((b: { title: string }) => b.title),
    existingBlogSlugs: (blogResult.data ?? []).map((b: { slug: string }) => b.slug),
    existingPromptTitles: (promptResult.data ?? []).map((p: { title: string }) => p.title),
    existingCategories: categoryResult.data ?? [],
    blogCategories: Array.from(new Set(
      (blogResult.data ?? [])
        .map((b: { category: string }) => b.category)
        .filter(Boolean)
    )),
  };
}
