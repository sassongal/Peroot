import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { softwareAppSchema, faqSchema } from "@/lib/schema";

/**
 * Server-rendered SEO content for the homepage.
 *
 * Renders a VISIBLE hero section with H1, value proposition, features,
 * CTAs, and FAQ. This is the content Google sees on first crawl.
 *
 * When HomeClient hydrates (adds .hydrated class), CSS hides this
 * section so users only see the interactive UI.
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
      <JsonLd
        data={faqSchema(topFAQs.map((f) => ({ question: f.question, answer: f.answer })))}
      />

      {/* Visible server-rendered hero — hidden after client hydration via CSS */}
      <div className="home-seo-hero" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
            Peroot - מחולל פרומפטים מקצועי בעברית
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            שדרגו כל פרומפט לרמה מקצועית עם AI. Peroot מנתח, משפר ומייעל
            פרומפטים ל-ChatGPT, Claude, Gemini ועוד — בעברית, בחינם, תוך שניות.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link
              href="/#enhance"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-linear-to-r from-amber-500 to-yellow-500 text-black font-bold text-lg hover:scale-[1.03] transition-transform"
            >
              נסו עכשיו בחינם
            </Link>
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
              <p className="text-sm text-muted-foreground">מזינים פרומפט גולמי ומקבלים גרסה מקצועית עם מבנה ברור ודירוג איכות בזמן אמת.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">4 מצבי עבודה</h3>
              <p className="text-sm text-muted-foreground">טקסט, מחקר מעמיק, יצירת תמונות (DALL-E, Midjourney) וסוכני AI מותאמים.</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">480+ תבניות</h3>
              <p className="text-sm text-muted-foreground">
                <Link href="/prompts" className="text-amber-600 dark:text-amber-400 hover:underline">ספריית פרומפטים</Link> עם תבניות מוכנות ב-30+ קטגוריות, כולל משתנים חכמים.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-foreground mb-2">עברית מהיסוד</h3>
              <p className="text-sm text-muted-foreground">לא תרגום — יצירה מקורית בעברית עם תמיכה מלאה ב-RTL ושאלות הבהרה חכמות.</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-8">
            איך Peroot עובד?
          </h2>
          <ol className="space-y-4 text-right list-decimal list-inside">
            <li className="text-muted-foreground"><strong className="text-foreground">הזנת פרומפט</strong> — כתבו פרומפט או רעיון בעברית בתיבת הקלט.</li>
            <li className="text-muted-foreground"><strong className="text-foreground">בחירת מצב</strong> — בחרו קטגוריה ומצב עבודה (טקסט, מחקר, תמונות או סוכנים).</li>
            <li className="text-muted-foreground"><strong className="text-foreground">שדרוג אוטומטי</strong> — לחצו על &quot;שדרג&quot; והמערכת תייצר פרומפט מקצועי ומובנה.</li>
            <li className="text-muted-foreground"><strong className="text-foreground">דיוק</strong> — ענו על שאלות הבהרה (אם יש) כדי לדייק את התוצאה.</li>
            <li className="text-muted-foreground"><strong className="text-foreground">שמירה</strong> — העתיקו, שמרו לספריה האישית, או המשיכו לשפר.</li>
          </ol>
        </div>

        {/* Target audience */}
        <div className="max-w-3xl mx-auto px-4 mb-16 text-right">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">למי מתאים Peroot?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            מחולל הפרומפטים מתאים למשווקים, מפתחים, יוצרי תוכן, מורים, מנהלי מוצר
            ולכל מי שעובד עם ChatGPT, Claude או Gemini ורוצה פרומפטים ברורים ומובנים בעברית.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/guide" className="text-amber-600 dark:text-amber-400 hover:underline text-sm">המדריך המלא לפרומפטים</Link>
            <Link href="/features" className="text-amber-600 dark:text-amber-400 hover:underline text-sm">כל התכונות</Link>
            <Link href="/pricing" className="text-amber-600 dark:text-amber-400 hover:underline text-sm">תוכניות ומחירים</Link>
            <Link href="/blog" className="text-amber-600 dark:text-amber-400 hover:underline text-sm">הבלוג</Link>
            <Link href="/teachers" className="text-amber-600 dark:text-amber-400 hover:underline text-sm">פרומפטים למורים</Link>
            <Link href="/examples" className="text-amber-600 dark:text-amber-400 hover:underline text-sm">דוגמאות לפני ואחרי</Link>
          </div>
        </div>

        {/* FAQ section */}
        <div className="max-w-3xl mx-auto px-4 pb-12 text-right">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">שאלות נפוצות</h2>
          <div className="space-y-3">
            {topFAQs.map((item) => (
              <details key={item.question} className="border border-border rounded-lg p-4 group">
                <summary className="font-medium text-foreground cursor-pointer">{item.question}</summary>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
