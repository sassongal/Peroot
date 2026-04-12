import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { TemplateGrid } from "./TemplateGrid";
import type { LibraryPrompt } from "@/lib/types";

export const metadata: Metadata = {
  title: "תבניות פרומפטים עם משתנים - Peroot",
  description: `${PROMPT_LIBRARY_COUNT}+ תבניות פרומפטים מוכנות לשימוש עם שדות למילוי. שדרגו כל תבנית עם AI ותתאימו אותה לצרכים שלכם.`,
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "תבניות פרומפטים עם משתנים - Peroot",
    description: "תבניות פרומפטים מוכנות לשימוש עם שדות למילוי מותאמים אישית.",
    url: "/templates",
    type: "website",
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/** Check if a prompt contains at least one {variable} placeholder */
function hasPlaceholders(text: string): boolean {
  return /{[^}]+}/.test(text);
}

/** Server-side fetch of library prompts that contain {variable} placeholders */
async function getTemplates(): Promise<LibraryPrompt[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("public_library_prompts")
      .select("*, source:source_metadata")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return [];

    // Normalize category keys
    const categoryKeyMap = Object.fromEntries(
      Object.keys(CATEGORY_LABELS).map((k) => [k.toLowerCase(), k])
    );

    const mapped: LibraryPrompt[] = data.map(
      ({ category_id, ...rest }) =>
        ({
          ...rest,
          category:
            (category_id && categoryKeyMap[category_id.toLowerCase()]) ||
            "General",
        }) as LibraryPrompt
    );

    // Filter to only prompts that contain at least one {variable}
    return mapped.filter((p) => hasPlaceholders(p.prompt));
  } catch {
    return [];
  }
}

const FAQ_ITEMS = [
  {
    question: "מה זו תבנית פרומפט?",
    answer:
      "תבנית פרומפט היא פרומפט מוכן מראש עם משתנים (כמו {נושא} או {קהל יעד}) שאתם ממלאים לפי הצורך שלכם. זה חוסך זמן ומבטיח תוצאות מקצועיות.",
  },
  {
    question: "האם השימוש בתבניות חינמי?",
    answer:
      "כן! כל התבניות הבסיסיות זמינות בחינם. תבניות Pro עם מצבים מתקדמים כמו יצירת תמונות, סרטונים ומחקר מעמיק דורשות מנוי Pro.",
  },
  {
    question: "איך משתמשים בתבנית?",
    answer:
      'לחצו על "השתמש בתבנית", מלאו את המשתנים המסומנים בסוגריים מסולסלות, ו-Peroot ישדרג את הפרומפט אוטומטית לתוצאות מדויקות ב-ChatGPT, Claude או Gemini.',
  },
];

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <>
      {/* Structured data */}
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "תבניות פרומפטים", url: "/templates" },
        ])}
      />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "תבניות פרומפטים מוכנות בעברית",
          description:
            "עשרות תבניות פרומפטים מוכנות לשימוש עם משתנים להתאמה אישית.",
          url: `${SITE_URL}/templates`,
          inLanguage: "he",
          numberOfItems: templates.length,
          publisher: {
            "@type": "Organization",
            name: "Peroot",
            url: SITE_URL,
          },
        }}
      />

      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">
          {/* Breadcrumbs */}
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground mb-8"
          >
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              דף הבית
            </Link>
            <span>/</span>
            <span className="text-secondary-foreground">
              תבניות פרומפטים
            </span>
          </nav>

          {/* Hero */}
          <header className="mb-10 md:mb-14">
            <PageHeading
              title="תבניות פרומפטים"
              highlight="מוכנות לשימוש"
              subtitle="בחרו תבנית, מלאו את המשתנים, וקבלו פרומפט מושלם בשניות. כל התבניות בעברית ומותאמות ל-ChatGPT, Claude ו-Gemini."
              size="large"
              align="start"
            />
            <div className="flex items-center gap-4 text-sm mt-6 heading-enter-delay-3">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {templates.length} תבניות עם משתנים
              </span>
              <span className="text-slate-600 dark:text-slate-500">|</span>
              <span className="text-muted-foreground">
                מתוך {PROMPT_LIBRARY_COUNT} פרומפטים בספרייה
              </span>
            </div>
          </header>

          {/* Template grid with category filter */}
          <TemplateGrid templates={templates} />

          {/* Cross-links */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CrossLinkCard
              href="/prompts"
              title={`כל ${PROMPT_LIBRARY_COUNT} הפרומפטים בספרייה`}
              description="עיינו בספרייה המלאה לפי קטגוריות"
            />
            <CrossLinkCard
              href="/guide"
              title="איך לכתוב פרומפט טוב?"
              description="המדריך המלא עם עקרונות זהב וטכניקות"
            />
          </div>

          {/* CTA */}
          <section
            className="mt-16 md:mt-20 rounded-2xl border border-amber-500/20 bg-linear-to-l from-amber-500/5 to-transparent p-7 md:p-10 text-center"
            aria-label="קריאה לפעולה"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-3">
              רוצים לשדרג כל פרומפט אוטומטית?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Peroot משדרגת כל פרומפט - מבנה מקצועי, הקשר מדויק ותוצאות טובות
              יותר ב-AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/?ref=templates"
                className="px-8 py-3 rounded-xl text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                }}
              >
                נסו Peroot - חינם
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 rounded-xl border border-border text-secondary-foreground text-sm font-medium hover:bg-secondary transition-colors"
              >
                ראו את התוכניות
              </Link>
            </div>
          </section>

          {/* FAQ section for SEO */}
          <section className="mt-16 max-w-3xl mx-auto" aria-label="שאלות נפוצות">
            <h2 className="text-xl md:text-2xl font-serif text-foreground mb-6 text-center">
              שאלות נפוצות על תבניות פרומפטים
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-border bg-card p-5"
                >
                  <summary className="cursor-pointer text-sm font-bold text-foreground list-none flex items-center justify-between gap-2">
                    {item.question}
                    <span className="text-muted-foreground transition-transform group-open:rotate-180">
                      &#9660;
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
