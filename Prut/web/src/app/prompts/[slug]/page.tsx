import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Copy, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_SLUG_MAP, CATEGORY_ID_TO_SLUG } from "@/lib/category-slugs";
import { CATEGORY_LABELS } from "@/lib/constants";
import { breadcrumbSchema, promptCollectionSchema } from "@/lib/schema";
import { CopyButton } from "./CopyButton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://peroot.space";

interface Props {
  params: Promise<{ slug: string }>;
}

// Build static params from all known slug keys
export async function generateStaticParams() {
  return Object.keys(CATEGORY_SLUG_MAP).map((slug) => ({ slug }));
}

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const categoryData = CATEGORY_SLUG_MAP[slug];

  if (!categoryData) {
    return { title: "קטגוריה לא נמצאה" };
  }

  const title = `${categoryData.labelHe} - ספריית פרומפטים בעברית | Peroot`;
  const description = categoryData.descriptionHe;
  const canonicalUrl = `/prompts/${encodeURIComponent(slug)}`;
  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(categoryData.labelHe)}&subtitle=${encodeURIComponent(categoryData.descriptionHe)}&category=${encodeURIComponent(categoryData.labelHe)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: { "he-IL": canonicalUrl },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Peroot",
      locale: "he_IL",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: categoryData.labelHe }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

interface LibraryRow {
  id: string;
  title: string;
  use_case: string;
  prompt: string;
  variables: string[] | null;
  category_id: string | null;
  preview_image_url: string | null;
}

export default async function CategoryPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const categoryData = CATEGORY_SLUG_MAP[slug];

  if (!categoryData) {
    notFound();
  }

  // Fetch prompts for this category from Supabase
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_library_prompts")
    .select("id, title, use_case, prompt, variables, category_id, preview_image_url")
    .eq("is_active", true)
    .ilike("category_id", categoryData.id.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(60);

  const prompts: LibraryRow[] = error ? [] : (data || []);

  // Build category map for the "all categories" section
  const allCategorySlugs = Object.entries(CATEGORY_SLUG_MAP);

  const pageUrl = `${SITE_URL}/prompts/${encodeURIComponent(slug)}`;

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
              { name: categoryData.labelHe, url: `/prompts/${encodeURIComponent(slug)}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            promptCollectionSchema({
              name: categoryData.labelHe,
              description: categoryData.descriptionHe,
              url: pageUrl,
              itemCount: prompts.length,
            })
          ),
        }}
      />

      <div className="min-h-screen bg-[#0a0a0a] text-slate-200" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">

          {/* Breadcrumbs */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-white transition-colors">דף הבית</Link>
            <span>/</span>
            <Link href="/prompts" className="hover:text-white transition-colors">ספריית פרומפטים</Link>
            <span>/</span>
            <span className="text-slate-300">{categoryData.labelHe}</span>
          </nav>

          {/* Hero header */}
          <header className="mb-10 md:mb-14">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl md:text-5xl" role="img" aria-label={categoryData.labelHe}>
                {categoryData.emoji}
              </span>
              <div>
                <h1 className="text-3xl md:text-5xl font-serif text-white leading-tight">
                  {categoryData.labelHe}
                </h1>
              </div>
            </div>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
              {categoryData.descriptionHe}
            </p>
            {prompts.length > 0 && (
              <p className="text-sm text-amber-400/80 mt-3">
                {prompts.length} פרומפטים זמינים
              </p>
            )}
          </header>

          {/* Prompt grid */}
          {prompts.length > 0 ? (
            <section aria-label="רשימת פרומפטים">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {prompts.map((prompt) => (
                  <article
                    key={prompt.id}
                    className="rounded-2xl border border-white/10 bg-black/40 p-5 md:p-6 flex flex-col gap-3 hover:bg-white/[0.04] transition-colors"
                  >
                    {/* Title + use_case */}
                    <div>
                      <h2 className="text-base md:text-lg font-semibold text-slate-100 leading-snug line-clamp-2">
                        {prompt.title}
                      </h2>
                      {prompt.use_case && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {prompt.use_case}
                        </p>
                      )}
                    </div>

                    {/* Prompt preview */}
                    <div className="text-sm md:text-base text-slate-400 leading-relaxed line-clamp-4 bg-white/[0.03] rounded-xl p-3 border border-white/5 font-mono">
                      {prompt.prompt}
                    </div>

                    {/* Variables */}
                    {prompt.variables && prompt.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {prompt.variables.slice(0, 4).map((v) => (
                          <span
                            key={v}
                            className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400"
                          >
                            {v}
                          </span>
                        ))}
                        {prompt.variables.length > 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500">
                            +{prompt.variables.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-1">
                      <CopyButton text={prompt.prompt} />
                      <Link
                        href="/?ref=prompts-library"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        השתמש ב-Peroot
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-5xl">{categoryData.emoji}</span>
              <p className="text-lg font-semibold text-slate-400">
                עדיין אין פרומפטים בקטגוריה זו
              </p>
              <p className="text-sm text-slate-600">
                הפרומפטים נוספים בקרוב. בינתיים, בדקו קטגוריות אחרות.
              </p>
              <Link
                href="/prompts"
                className="mt-2 px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors"
              >
                לכל הקטגוריות
              </Link>
            </div>
          )}

          {/* CTA section */}
          <section
            className="mt-16 md:mt-20 rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-500/5 to-transparent p-7 md:p-10 text-center"
            aria-label="קריאה לפעולה"
          >
            <p className="text-sm text-amber-400/70 font-medium mb-2">Peroot - מחולל פרומפטים בעברית</p>
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-3">
              רוצים פרומפטים מותאמים אישית?
            </h2>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              הצטרפו ל-Peroot וצרו פרומפטים מקצועיים בשניות. שדרוג אוטומטי, ספריה אישית וגישה ל-480+ פרומפטים.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/?ref=prompts-library"
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

          {/* Related categories */}
          <section className="mt-14 md:mt-16" aria-label="קטגוריות נוספות">
            <h2 className="text-xl font-serif text-white mb-5">קטגוריות נוספות</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allCategorySlugs
                .filter(([s]) => s !== slug)
                .slice(0, 15)
                .map(([catSlug, catData]) => (
                  <Link
                    key={catSlug}
                    href={`/prompts/${encodeURIComponent(catSlug)}`}
                    className="flex flex-col items-center gap-2 p-3 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-colors text-center group"
                  >
                    <span className="text-2xl">{catData.emoji}</span>
                    <span className="text-xs text-slate-400 group-hover:text-white transition-colors leading-snug">
                      {CATEGORY_LABELS[catData.id] || catData.labelHe}
                    </span>
                  </Link>
                ))}
            </div>
          </section>

          {/* Back link */}
          <div className="mt-10 text-center">
            <Link
              href="/prompts"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              לכל ספריית הפרומפטים
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
