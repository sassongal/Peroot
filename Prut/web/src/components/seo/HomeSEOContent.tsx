import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { softwareAppSchema, faqSchema } from "@/lib/schema";
import { PROMPT_LIBRARY_COUNT, PROMPT_TEMPLATE_COUNT } from "@/lib/constants";

/**
 * Server-rendered content section for the homepage, in normal flow BELOW
 * the app (page.tsx order) and ALWAYS VISIBLE to everyone.
 *
 * INVARIANT — never hide this block (no display:none, no opacity:0, no
 * hydration toggle): a previous version hid it on mobile + post-hydration,
 * which made the homepage's copy, FAQ and internal links invisible to
 * Google's mobile-first crawl and tripped the hidden-text pattern
 * (2026-08-31 SEO audit). The page's single H1 lives in HomeViewChrome;
 * this section's top heading is deliberately an h2.
 *
 * Also includes structured data (JSON-LD) for rich results.
 */
export function HomeSEOContent() {
  const topFAQs = FAQ_ITEMS.slice(0, 10);

  return (
    <>
      {/* Structured data */}
      <JsonLd data={softwareAppSchema()} />
      {/* webSiteSchema is already rendered in the root layout — no duplicate needed */}
      <JsonLd data={faqSchema(topFAQs.map((f) => ({ question: f.question, answer: f.answer })))} />

      {/* Always-visible content section below the app. Never hide this block —
          it carries the homepage's copy, FAQ, and internal-link hub for search
          and answer engines (the page's H1 lives in the app hero above). */}
      <section className="home-seo-hero" dir="rtl" aria-label="על פירוט">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
            Peroot (פירוט), מחולל ומשדרג פרומפטים בעברית
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            פלטפורמת הנדסת הפרומפטים (prompt engineering) המובילה בישראל. כתיבת פרומפטים מקצועיים
            לכל מודל שפה, ChatGPT, Claude, Gemini ו-Midjourney, בעברית, בחינם, תוך שניות.
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Peroot מנתח, משפר ומייעל כל פרומפט עם מבנה מקצועי, שאלות מיקוד ודירוג איכות בזמן אמת.
            <Link href="/guide" className="text-amber-600 dark:text-amber-400 hover:underline mx-1">
              מה זה פרומפט?
            </Link>
            ·
            <Link href="/guide" className="text-amber-600 dark:text-amber-400 hover:underline mx-1">
              מדריך לכתיבת פרומפטים
            </Link>
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <ButtonLink href="/#enhance" size="lg">
              נסו עכשיו בחינם
            </ButtonLink>
            <Link
              href="/prompts"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border border-border text-foreground font-medium text-lg hover:bg-secondary transition-colors"
            >
              ספריית פרומפטים
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-right mb-16">
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">שדרוג אוטומטי</h3>
              <p className="text-sm text-muted-foreground">
                מזינים פרומפט גולמי ומקבלים גרסה מקצועית עם מבנה ברור ודירוג איכות בזמן אמת.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">4 מצבי עבודה</h3>
              <p className="text-sm text-muted-foreground">
                טקסט, מחקר מעמיק, יצירת תמונות (DALL-E, Midjourney) וסוכני AI מותאמים.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">{PROMPT_TEMPLATE_COUNT} תבניות</h3>
              <p className="text-sm text-muted-foreground">
                <Link
                  href="/prompts"
                  className="text-amber-600 dark:text-amber-400 hover:underline"
                >
                  ספריית פרומפטים
                </Link>{" "}
                עם תבניות מוכנות ב-30+ קטגוריות, כולל משתנים חכמים.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">עברית מהיסוד</h3>
              <p className="text-sm text-muted-foreground">
                לא תרגום, יצירה מקורית בעברית עם תמיכה מלאה ב-RTL ושאלות הבהרה חכמות.
              </p>
            </div>
          </div>
        </div>

        {/* Quotable facts — answer engines cite concrete numbers (GEO) */}
        <div className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center mb-6">
            פירוט במספרים
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl border border-border bg-card">
              <dt className="text-xs text-muted-foreground mb-1">פרומפטים בספרייה הציבורית</dt>
              <dd className="text-2xl font-bold text-foreground">{PROMPT_LIBRARY_COUNT}</dd>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <dt className="text-xs text-muted-foreground mb-1">תבניות עם משתנים חכמים</dt>
              <dd className="text-2xl font-bold text-foreground">{PROMPT_TEMPLATE_COUNT}</dd>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <dt className="text-xs text-muted-foreground mb-1">קטגוריות תוכן</dt>
              <dd className="text-2xl font-bold text-foreground">30+</dd>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <dt className="text-xs text-muted-foreground mb-1">מצבי יצירה</dt>
              <dd className="text-2xl font-bold text-foreground">5</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground text-center mt-3">
            טקסט · מחקר מעמיק · תמונות · וידאו · סוכני AI, הכול בעברית נטיבית, RTL מלא.
          </p>
        </div>

        {/* Head-term targeted section — boosts ranking for "הנדסת פרומפטים" / "כתיבת פרומפטים" */}
        <div className="max-w-3xl mx-auto px-4 mb-16 text-right">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-6">
            הנדסת פרומפטים בעברית, מה זה?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            הנדסת פרומפטים (prompt engineering) היא האומנות של ניסוח הוראות מדויקות למודלי בינה
            מלאכותית כדי לקבל תשובות איכותיות ועקביות. כתיבת פרומפטים טובים דורשת מבנה ברור, הקשר
            מדויק, דוגמאות רלוונטיות וניסוח בהיר של התוצאה הרצויה.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Peroot הופך כל פרומפט גולמי לפרומפט מקצועי אוטומטית: הוא מזהה את המטרה, מוסיף הקשר חסר,
            מציע שאלות הבהרה, ומחזיר גרסה מובנית עם דירוג איכות לכל ממד. כך תקבלו תוצאות טובות יותר
            ב-ChatGPT, Claude ו-Gemini בלי להיות מומחים להנדסת פרומפטים.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <Link href="/guide" className="text-amber-600 dark:text-amber-400 hover:underline">
              המדריך המלא להנדסת פרומפטים →
            </Link>
            <Link href="/prompts" className="text-amber-600 dark:text-amber-400 hover:underline">
              דוגמאות לפרומפטים מוכנים →
            </Link>
            <Link
              href="/blog/prompt-engineering-dictionary-glossary"
              className="text-amber-600 dark:text-amber-400 hover:underline"
            >
              מילון מושגים →
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-8">
            איך Peroot עובד?
          </h2>
          <ol className="space-y-4 text-right list-decimal list-inside">
            <li className="text-muted-foreground">
              <strong className="text-foreground">הזנת פרומפט</strong> , כתבו פרומפט או רעיון בעברית
              בתיבת הקלט.
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">בחירת מצב</strong> , בחרו קטגוריה ומצב עבודה
              (טקסט, מחקר, תמונות או סוכנים).
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">שדרוג אוטומטי</strong> , לחצו על &quot;שדרג&quot;
              והמערכת תייצר פרומפט מקצועי ומובנה.
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">דיוק</strong> , ענו על שאלות הבהרה (אם יש) כדי
              לדייק את התוצאה.
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">שמירה</strong> , העתיקו, שמרו לספרייה האישית, או
              המשיכו לשפר.
            </li>
          </ol>
        </div>

        {/* Target audience */}
        <div className="max-w-3xl mx-auto px-4 mb-16 text-right">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">למי מתאים Peroot?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            מחולל הפרומפטים מתאים למשווקים, מפתחים, יוצרי תוכן, מורים, מנהלי מוצר ולכל מי שעובד עם
            ChatGPT, Claude או Gemini ורוצה פרומפטים ברורים ומובנים בעברית.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guide"
              className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
            >
              המדריך המלא לפרומפטים
            </Link>
            <Link
              href="/features"
              className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
            >
              כל התכונות
            </Link>
            <Link
              href="/pricing"
              className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
            >
              תוכניות ומחירים
            </Link>
            <Link
              href="/blog"
              className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
            >
              הבלוג
            </Link>
            <Link
              href="/teachers"
              className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
            >
              פרומפטים למורים
            </Link>
            <Link
              href="/examples"
              className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
            >
              דוגמאות לפני ואחרי
            </Link>
          </div>
        </div>

        {/* FAQ section */}
        <div className="max-w-3xl mx-auto px-4 pb-12 text-right">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">שאלות נפוצות</h2>
          <div className="space-y-3">
            {topFAQs.map((item) => (
              <details key={item.question} className="border border-border rounded-lg p-4 group">
                <summary className="font-medium text-foreground cursor-pointer">
                  {item.question}
                </summary>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
