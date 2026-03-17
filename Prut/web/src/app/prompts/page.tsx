import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import { CATEGORY_LABELS, PROMPT_COLLECTIONS, PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { breadcrumbSchema } from "@/lib/schema";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export const metadata: Metadata = {
  title: "ספריית פרומפטים בעברית - כל הקטגוריות | Peroot",
  description:
    "מאות פרומפטים מקצועיים בעברית לכל תחום: שיווק, מכירות, פיתוח, עיצוב, תוכן ועוד. בחרו קטגוריה וגלו פרומפטים מוכנים לשימוש ב-ChatGPT, Claude ו-Gemini.",
  alternates: {
    canonical: "/prompts",
    languages: { "he-IL": "/prompts" },
  },
  openGraph: {
    title: "ספריית פרומפטים בעברית | Peroot",
    description:
      "מאות פרומפטים מקצועיים בעברית לכל תחום. גלו, העתיקו ושדרגו פרומפטים ב-ChatGPT, Claude ו-Gemini.",
    url: `${SITE_URL}/prompts`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/assets/branding/logo.png`,
        width: 1200,
        height: 630,
        alt: "ספריית פרומפטים - Peroot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ספריית פרומפטים בעברית | Peroot",
    description: "מאות פרומפטים מקצועיים בעברית לכל תחום.",
    images: [`${SITE_URL}/assets/branding/logo.png`],
  },
  robots: { index: true, follow: true },
};

// Group slugs by collection for a nicer layout
function groupSlugsByCollection() {
  const collectionGroups: Array<{
    collectionId: string;
    title: string;
    icon: string;
    color: string;
    items: Array<{ slug: string; id: string; labelHe: string; emoji: string }>;
  }> = [];

  const assignedIds = new Set<string>();

  for (const collection of PROMPT_COLLECTIONS) {
    const items = collection.categories
      .map((catId) => {
        const slug = Object.entries(CATEGORY_SLUG_MAP).find(
          ([, v]) => v.id === catId
        );
        return slug ? { slug: slug[0], id: catId, labelHe: CATEGORY_LABELS[catId] || slug[1].labelHe, emoji: slug[1].emoji } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    items.forEach((item) => assignedIds.add(item.id));

    collectionGroups.push({
      collectionId: collection.id,
      title: collection.title,
      icon: collection.icon,
      color: collection.color,
      items,
    });
  }

  // Remaining categories not in any collection
  const remaining = Object.entries(CATEGORY_SLUG_MAP)
    .filter(([, v]) => !assignedIds.has(v.id))
    .map(([slug, v]) => ({ slug, id: v.id, labelHe: CATEGORY_LABELS[v.id] || v.labelHe, emoji: v.emoji }));

  if (remaining.length > 0) {
    collectionGroups.push({
      collectionId: "other",
      title: "קטגוריות נוספות",
      icon: "📋",
      color: "from-slate-500/10 to-transparent",
      items: remaining,
    });
  }

  return collectionGroups;
}

export default function PromptsIndexPage() {
  const groups = groupSlugsByCollection();
  const totalCategories = Object.keys(CATEGORY_SLUG_MAP).length;

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "ספריית פרומפטים", url: "/prompts" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "ספריית פרומפטים בעברית",
            description:
              "מאות פרומפטים מקצועיים בעברית לכל תחום: שיווק, מכירות, פיתוח, עיצוב ועוד.",
            url: `${SITE_URL}/prompts`,
            inLanguage: "he",
            publisher: {
              "@type": "Organization",
              name: "Peroot",
              url: SITE_URL,
            },
          }),
        }}
      />

      <div className="min-h-screen bg-[#0a0a0a] text-slate-200" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">

          {/* Breadcrumbs */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-white transition-colors">דף הבית</Link>
            <span>/</span>
            <span className="text-slate-300">ספריית פרומפטים</span>
          </nav>

          {/* Hero */}
          <header className="mb-12 md:mb-16">
            <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
              ספריית פרומפטים
              <span className="block text-amber-400/90">בעברית</span>
            </h1>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed mb-6">
              מאות פרומפטים מקצועיים מוכנים לשימוש ב-ChatGPT, Claude ו-Gemini.
              בחרו קטגוריה, העתיקו פרומפט ושדרגו את התוצאות שלכם.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {totalCategories} קטגוריות
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">{PROMPT_LIBRARY_COUNT} פרומפטים</span>
            </div>
          </header>

          {/* Category groups */}
          <div className="space-y-12 md:space-y-16">
            {groups.map((group) => (
              <section key={group.collectionId} aria-label={group.title}>
                {/* Section header */}
                <div
                  className={`flex items-center gap-3 mb-5 pb-4 border-b border-white/8`}
                >
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {group.icon}
                  </span>
                  <h2 className="text-xl md:text-2xl font-serif text-white">
                    {group.title}
                  </h2>
                </div>

                {/* Category cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {group.items.map(({ slug, labelHe, emoji }) => (
                    <Link
                      key={slug}
                      href={`/prompts/${slug}`}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-all text-center group"
                    >
                      <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                        {emoji}
                      </span>
                      <span className="text-sm text-slate-400 group-hover:text-white transition-colors leading-snug">
                        {labelHe}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Cross-links */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CrossLinkCard href="/guide" title="איך לכתוב פרומפט טוב?" description="המדריך המלא עם עקרונות זהב וטכניקות" />
            <CrossLinkCard href="/features" title="מצבי עבודה מתקדמים" description="תמונות, סרטונים, מחקר מעמיק וסוכני AI" />
          </div>

          {/* CTA */}
          <section
            className="mt-16 md:mt-20 rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-500/5 to-transparent p-7 md:p-10 text-center"
            aria-label="קריאה לפעולה"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-3">
              רוצים לשדרג את הפרומפטים שלכם?
            </h2>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Peroot משדרגת כל פרומפט אוטומטית - מבנה מקצועי, הקשר מדויק ותוצאות טובות יותר ב-AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/?ref=prompts-index"
                className="px-8 py-3 rounded-xl text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
              >
                נסו Peroot - חינם
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 rounded-xl border border-white/15 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                ראו את התוכניות
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
