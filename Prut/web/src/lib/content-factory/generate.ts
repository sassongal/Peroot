/**
 * AI content generation for Content Factory.
 *
 * Uses generateObject + zod so the model's JSON is schema-enforced by the
 * provider. The previous generateText + hand-rolled JSON.parse repair chain
 * failed on ~half of all runs (unescaped Hebrew quotes / control characters
 * inside the HTML content field) — the same failure mode that broke
 * style-analysis twice. Structured output is the house rule for model JSON.
 *
 * Models: gemini-2.5-flash for blog posts (quality matters),
 *         gemini-2.5-flash-lite for prompt batch generation (cost savings).
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { promptPagePath } from "@/lib/category-slugs";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const cfGateway = process.env.CF_AI_GATEWAY_URL?.replace(/\/$/, "");
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  baseURL: cfGateway ? `${cfGateway}/google-ai-studio/v1beta` : undefined,
});

// ---------------------------------------------------------------------------
// Schemas — Blog
// ---------------------------------------------------------------------------

// Soft limits (tag count, meta lengths) are CLAMPED after generation, never
// enforced by the schema — a hard .max() here once threw away a complete,
// valid article because the model emitted 7 tags instead of 6
// (AI_NoObjectGeneratedError, Sentry JAVASCRIPT-NEXTJS-M). The schema keeps
// only true invariants: fields exist, types match, content is substantial.
const BlogPostSchema = z.object({
  title: z.string().min(10).describe("כותרת המאמר בעברית"),
  englishTitle: z.string().min(5).describe("Article title in English (for the slug)"),
  content: z
    .string()
    .min(500)
    .describe("גוף המאמר: HTML עם H2 לכותרות משנה, בלי H1 ובלי עטיפת div/article"),
  excerpt: z.string().min(30).describe("תקציר 2-3 משפטים"),
  metaTitle: z.string().min(10).describe("כותרת SEO, עד 60 תווים"),
  metaDescription: z.string().min(30).describe("תיאור SEO, עד 155 תווים, כולל CTA"),
  category: z.string().min(2).describe("שם קטגוריה מהרשימה שסופקה"),
  tags: z.array(z.string().min(1)).min(1).describe("3-5 תגים"),
  internalLinks: z
    .array(z.object({ title: z.string(), slug: z.string() }))
    .describe("2-3 פרומפטים רלוונטיים מהספרייה"),
});

/** Clamp soft limits the schema deliberately does not enforce. */
function clampBlogPost(post: GeneratedBlogPost): GeneratedBlogPost {
  return {
    ...post,
    title: post.title.slice(0, 200),
    englishTitle: post.englishTitle.slice(0, 200),
    excerpt: post.excerpt.slice(0, 600),
    metaTitle: post.metaTitle.slice(0, 90),
    metaDescription: post.metaDescription.slice(0, 255),
    category: post.category.slice(0, 60),
    tags: post.tags.slice(0, 6).map((t) => t.slice(0, 40)),
    internalLinks: post.internalLinks.slice(0, 5),
  };
}

type GeneratedBlogPost = z.infer<typeof BlogPostSchema>;

interface BlogGenerationParams {
  topic?: string;
  template?: "guide" | "listicle" | "comparison" | "faq";
  existingTitles: string[];
  existingCategories: string[];
  existingPromptTitles: string[]; // legacy — titles only
  existingPromptLinks?: { title: string; url: string }[]; // title + REAL page URL
}

// ---------------------------------------------------------------------------
// Schemas — Prompts
// ---------------------------------------------------------------------------

// Same clamp-don't-reject policy as the blog schema (see note above).
const GeneratedPromptSchema = z.object({
  title: z.string().min(5).describe("שם הפרומפט בעברית — ברור ותיאורי"),
  prompt: z
    .string()
    .min(80)
    .describe("הפרומפט המלא עם {{משתנה}} בסוגריים מסולסלים; מקצועי, מובנה ומפורט"),
  use_case: z.string().min(10).describe("מתי ולמה להשתמש בפרומפט"),
  variables: z.array(z.string().min(1)).describe("שמות המשתנים"),
  output_format: z.string().min(5).describe("תיאור מדויק של הפלט הצפוי"),
  quality_checks: z.array(z.string().min(3)).min(1).describe("2-3 בדיקות איכות"),
  category_id: z.string().min(2).describe("ה-ID המדויק מהרשימה (באנגלית)"),
  capability_mode: z.enum([
    "STANDARD",
    "DEEP_RESEARCH",
    "IMAGE_GENERATION",
    "AGENT_BUILDER",
    "VIDEO_GENERATION",
  ]),
});

function clampPrompt(p: GeneratedPrompt): GeneratedPrompt {
  return {
    ...p,
    title: p.title.slice(0, 150),
    use_case: p.use_case.slice(0, 500),
    variables: p.variables.slice(0, 10).map((v) => v.slice(0, 60)),
    output_format: p.output_format.slice(0, 500),
    quality_checks: p.quality_checks.slice(0, 5).map((c) => c.slice(0, 200)),
    category_id: p.category_id.slice(0, 60),
  };
}

type GeneratedPrompt = z.infer<typeof GeneratedPromptSchema>;

interface PromptGenerationParams {
  topic?: string;
  category?: string;
  existingTitles: string[];
  existingCategories: { id: string; name_he: string }[];
  count?: number;
}

// ---------------------------------------------------------------------------
// generateBlogPost
// ---------------------------------------------------------------------------

export async function generateBlogPost(params: BlogGenerationParams): Promise<GeneratedBlogPost> {
  const {
    topic,
    template = "guide",
    existingTitles,
    existingCategories,
    existingPromptTitles,
    existingPromptLinks,
  } = params;

  const templateInstructions: Record<NonNullable<BlogGenerationParams["template"]>, string> = {
    guide: "מדריך מעמיק ומקצועי עם שלבים ברורים, דוגמאות מעשיות, וטיפים מתקדמים. 2000-2500 מילים.",
    listicle: "רשימה מעשית עם X פרומפטים/טיפים, כל אחד עם הסבר קצר ודוגמה. 1000-1500 מילים.",
    comparison: "השוואה מעמיקה בין שני כלים/שיטות/גישות עם טבלת יתרונות וחסרונות. 1500-2000 מילים.",
    faq: "שאלות ותשובות מקצועיות, כל תשובה מפורטת עם דוגמאות. 1000-1500 מילים.",
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
- **ציטוטים ונתונים (GEO)**: כלול נתונים מספריים קונקרטיים ועובדות ניתנות-לציטוט — מנועי תשובה (ChatGPT, Perplexity) מצטטים תוכן עם מספרים ומבנה שאלה-תשובה.
- **הקשר ישראלי**: דוגמאות מקומיות, התייחסות לכלים פופולריים בישראל, שמות מותגים ישראליים.

## מבנה HTML
- השתמש ב-H2 לכותרות משנה (חשוב לTOC ול-featured snippets)
- פסקאות קצרות (3-4 שורות מקסימום)
- רשימות נקודות ומספרים למידע מובנה
- <strong> להדגשות חשובות
- אסור להשתמש ב-H1 (הכותרת הראשית מגיעה מ-title)
- אל תעטוף את כל התוכן ב-div או ב-article

## קישורים פנימיים (חשוב ל-SEO!)
כלול 2-3 קישורים לפרומפטים קיימים מהספרייה שרלוונטיים לתוכן. השתמש אך ורק
בכתובות ה-URL המדויקות מהרשימה שתקבל (עמודה url) — אסור להמציא כתובת. פורמט:
<a href="[url מהרשימה]">[שם הפרומפט]</a>
בחר פרומפטים שמשלימים את הנושא — לא רנדומליים.`;

  const topicInstruction = topic
    ? `כתוב מאמר על הנושא: "${topic}"`
    : `בחר נושא חדש ורלוונטי שעדיין לא קיים באתר. הנושא צריך להיות בתחום פרומפטים, AI, או כלי בינה מלאכותית — ממוקד בשוק הישראלי.`;

  const userPrompt = `${topicInstruction}

סוג מאמר: ${templateInstructions[template]}

קטגוריות קיימות באתר (בחר מתוכן): ${existingCategories.join(", ")}

כותרות מאמרים קיימים (אל תחזור עליהם):
${existingTitles.slice(0, 50).join("\n")}

פרומפטים קיימים בספרייה (לקישורים פנימיים — השתמש ב-url המדויק בלבד):
${(existingPromptLinks ?? existingPromptTitles.map((t) => ({ title: t, url: "/prompts" })))
  .slice(0, 30)
  .map((l) => `- ${l.title} → ${l.url}`)
  .join("\n")}

## דרישות קריטיות:
1. וודא שהנושא שבחרת לא מכוסה כבר ברשימת הכותרות למעלה — גם לא בניסוח אחר.
2. התוכן חייב להוסיף ערך ייחודי שלא קיים במאמרים הקיימים.
3. השתמש ב-long-tail keywords שישראלים מחפשים בגוגל.
4. הקישורים הפנימיים חייבים להיות לפרומפטים שרלוונטיים באמת לנושא.`;

  const startTime = Date.now();

  const { object, usage } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: BlogPostSchema,
    system,
    prompt: userPrompt,
    temperature: 0.8,
  });

  const durationMs = Date.now() - startTime;
  logger.info(
    `[ContentFactory] Blog generated in ${durationMs}ms, tokens: ${usage?.totalTokens ?? "unknown"}`,
  );

  return clampBlogPost(object);
}

// ---------------------------------------------------------------------------
// generatePromptBatch
// ---------------------------------------------------------------------------

export async function generatePromptBatch(params: PromptGenerationParams): Promise<{
  prompts: GeneratedPrompt[];
  usage: { totalTokens: number };
}> {
  const { topic, category, existingTitles, existingCategories, count = 5 } = params;

  const categoryList = existingCategories.map((c) => `${c.id}: ${c.name_he}`).join("\n");

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
- הוסף ערך ייחודי שלא קיים בכלים אחרים`;

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
${existingTitles.slice(0, 100).join("\n")}

## דרישות קריטיות:
1. וודא שכל פרומפט שונה באופן מהותי מהכותרות הקיימות למעלה — גם בנושא וגם בזווית.
2. כל פרומפט חייב לפתור בעיה אמיתית שאנשים בישראל מתמודדים איתה.
3. category_id חייב להיות בדיוק מהרשימה למעלה (הID באנגלית, לא השם בעברית).
4. אל תייצר פרומפטים גנריים כמו "כתוב טקסט" — כל אחד חייב להיות ספציפי ומקצועי.`;

  const startTime = Date.now();

  const { object, usage } = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    schema: z.object({ prompts: z.array(GeneratedPromptSchema).min(1).max(10) }),
    system,
    prompt: userPrompt,
    temperature: 0.8,
  });

  const durationMs = Date.now() - startTime;
  logger.info(
    `[ContentFactory] ${count} prompts generated in ${durationMs}ms, tokens: ${usage?.totalTokens ?? "unknown"}`,
  );

  return {
    prompts: object.prompts.map(clampPrompt),
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
  existingPromptLinks: { title: string; url: string }[];
  existingCategories: { id: string; name_he: string }[];
  blogCategories: string[];
}> {
  const [blogResult, promptResult, categoryResult] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("title, slug, category")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("public_library_prompts")
      .select("id, title, category_id")
      .eq("is_active", true)
      .limit(200),
    supabase.from("library_categories").select("id, name_he").order("sort_order"),
  ]);

  // Real prompt-page URLs — the model once invented /prompts/<hebrew-title>
  // slugs and every internal link in a generated post 404'd.
  const promptRows = (promptResult.data ?? []) as {
    id: string;
    title: string;
    category_id: string | null;
  }[];
  const existingPromptLinks = promptRows
    .map((p) => ({ title: p.title, url: promptPagePath(p.category_id, p.id) }))
    .filter((l): l is { title: string; url: string } => l.url !== null);

  return {
    existingBlogTitles: (blogResult.data ?? []).map((b: { title: string }) => b.title),
    existingBlogSlugs: (blogResult.data ?? []).map((b: { slug: string }) => b.slug),
    existingPromptTitles: promptRows.map((p) => p.title),
    existingPromptLinks,
    existingCategories: categoryResult.data ?? [],
    blogCategories: Array.from(
      new Set((blogResult.data ?? []).map((b: { category: string }) => b.category).filter(Boolean)),
    ),
  };
}
