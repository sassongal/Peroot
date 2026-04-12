import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_SLUG_MAP, HEBREW_SLUG_TO_ENGLISH } from "@/lib/category-slugs";
import { CATEGORY_LABELS } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, promptCollectionSchema } from "@/lib/schema";
import { CopyButton } from "./CopyButton";
import { UsePromptButton } from "./UsePromptButton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

interface Props {
  params: Promise<{ slug: string }>;
}

// Build static params from all known English slug keys
export async function generateStaticParams() {
  return Object.keys(CATEGORY_SLUG_MAP).map((slug) => ({ slug }));
}

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const decoded = decodeURIComponent(rawSlug);
  // Resolve Hebrew legacy slugs to their English counterpart for metadata
  const slug = HEBREW_SLUG_TO_ENGLISH[decoded] ?? decoded;
  const categoryData = CATEGORY_SLUG_MAP[slug];

  if (!categoryData) {
    return { title: "קטגוריה לא נמצאה" };
  }

  const title = `${categoryData.labelHe} - ספריית פרומפטים בעברית | Peroot`;
  const description = categoryData.descriptionHe;
  const canonicalUrl = `/prompts/${slug}`;
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
  capability_mode: string | null;
}

export default async function CategoryPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const decoded = decodeURIComponent(rawSlug);

  // Redirect old Hebrew-encoded slugs to their English equivalents (301)
  if (HEBREW_SLUG_TO_ENGLISH[decoded]) {
    redirect(`/prompts/${HEBREW_SLUG_TO_ENGLISH[decoded]}`);
  }

  const slug = decoded;
  const categoryData = CATEGORY_SLUG_MAP[slug];

  if (!categoryData) {
    notFound();
  }

  // Fetch prompts for this category from Supabase
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_library_prompts")
    .select("id, title, use_case, prompt, variables, category_id, preview_image_url, capability_mode")
    .eq("is_active", true)
    .ilike("category_id", categoryData.id.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(60);

  const prompts: LibraryRow[] = error ? [] : (data || []);

  // Build category map for the "all categories" section
  const allCategorySlugs = Object.entries(CATEGORY_SLUG_MAP);

  const pageUrl = `${SITE_URL}/prompts/${slug}`;

  return (
    <>
      {/* Structured data */}
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "ספריית פרומפטים", url: "/prompts" },
          { name: categoryData.labelHe, url: `/prompts/${slug}` },
        ])}
      />
      <JsonLd
        data={promptCollectionSchema({
          name: categoryData.labelHe,
          description: categoryData.descriptionHe,
          url: pageUrl,
          itemCount: prompts.length,
        })}
      />

      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">

          {/* Breadcrumbs */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition-colors">דף הבית</Link>
            <span>/</span>
            <Link href="/prompts" className="hover:text-foreground transition-colors">ספריית פרומפטים</Link>
            <span>/</span>
            <span className="text-secondary-foreground">{categoryData.labelHe}</span>
          </nav>

          {/* Hero header */}
          <header className="mb-10 md:mb-14">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl md:text-5xl" role="img" aria-label={categoryData.labelHe}>
                {categoryData.emoji}
              </span>
              <div>
                <h1 className="text-3xl md:text-5xl font-serif text-foreground leading-tight">
                  {categoryData.labelHe}
                </h1>
              </div>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {categoryData.descriptionHe}
            </p>
            {prompts.length > 0 && (
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-3">
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
                    className="rounded-2xl border border-border bg-card p-5 md:p-6 flex flex-col gap-3 hover:bg-secondary transition-colors"
                  >
                    {/* Title + use_case */}
                    <div>
                      <h2 className="text-base md:text-lg font-semibold text-foreground leading-snug line-clamp-2">
                        {prompt.title}
                      </h2>
                      {prompt.use_case && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {prompt.use_case}
                        </p>
                      )}
                    </div>

                    {/* Capability badge */}
                    {prompt.capability_mode && prompt.capability_mode !== 'STANDARD' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                        prompt.capability_mode === 'IMAGE_GENERATION' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' :
                        prompt.capability_mode === 'DEEP_RESEARCH' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                        prompt.capability_mode === 'AGENT_BUILDER' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                        'bg-secondary text-muted-foreground border border-border'
                      }`}>
                        {prompt.capability_mode === 'IMAGE_GENERATION' ? 'יצירת תמונה' :
                         prompt.capability_mode === 'DEEP_RESEARCH' ? 'מחקר מעמיק' :
                         prompt.capability_mode === 'AGENT_BUILDER' ? 'בונה סוכנים' :
                         prompt.capability_mode}
                      </span>
                    )}

                    {/* Preview image for image generation prompts */}
                    {prompt.preview_image_url && (
                      <div className="rounded-xl overflow-hidden border border-border">
                        <Image
                          src={prompt.preview_image_url}
                          alt={prompt.title}
                          width={400}
                          height={400}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Prompt preview */}
                    <div
                      className={`text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-4 bg-secondary rounded-xl p-3 border border-border ${
                        prompt.capability_mode === 'IMAGE_GENERATION' ? 'font-mono text-left dir-ltr' : ''
                      }`}
                      dir={prompt.capability_mode === 'IMAGE_GENERATION' ? 'ltr' : undefined}
                    >
                      {prompt.prompt}
                    </div>

                    {/* Variables */}
                    {prompt.variables && prompt.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {prompt.variables.slice(0, 4).map((v) => (
                          <span
                            key={v}
                            className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground"
                          >
                            {v}
                          </span>
                        ))}
                        {prompt.variables.length > 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                            +{prompt.variables.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-1">
                      <CopyButton text={prompt.prompt} />
                      <UsePromptButton
                        id={prompt.id}
                        title={prompt.title}
                        prompt={prompt.prompt}
                        category={slug}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-5xl">{categoryData.emoji}</span>
              <p className="text-lg font-semibold text-muted-foreground">
                עדיין אין פרומפטים בקטגוריה זו
              </p>
              <p className="text-sm text-muted-foreground">
                הפרומפטים נוספים בקרוב. בינתיים, בדקו קטגוריות אחרות.
              </p>
              <Link
                href="/prompts"
                className="mt-2 px-5 py-2.5 rounded-lg border border-border text-secondary-foreground text-sm hover:bg-secondary transition-colors"
              >
                לכל הקטגוריות
              </Link>
            </div>
          )}

          {/* CTA section */}
          <section
            className="mt-16 md:mt-20 rounded-2xl border border-amber-500/20 bg-linear-to-l from-amber-500/5 to-transparent p-7 md:p-10 text-center"
            aria-label="קריאה לפעולה"
          >
            <p className="text-sm text-amber-600/70 dark:text-amber-400/70 font-medium mb-2">Peroot - מחולל פרומפטים בעברית</p>
            <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-3">
              רוצים פרומפטים מותאמים אישית?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
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
                className="px-8 py-3 rounded-xl border border-border text-secondary-foreground text-sm font-medium hover:bg-secondary transition-colors"
              >
                ראו את התוכניות
              </Link>
            </div>
          </section>

          {/* Related categories */}
          <section className="mt-14 md:mt-16" aria-label="קטגוריות נוספות">
            <h2 className="text-xl font-serif text-foreground mb-5">קטגוריות נוספות</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allCategorySlugs
                .filter(([s]) => s !== slug)
                .slice(0, 15)
                .map(([catSlug, catData]) => (
                  <Link
                    key={catSlug}
                    href={`/prompts/${catSlug}`}
                    className="flex flex-col items-center gap-2 p-3 min-h-[44px] rounded-xl border border-border bg-secondary hover:bg-white/6 hover:border-white/20 transition-colors text-center group"
                  >
                    <span className="text-2xl">{catData.emoji}</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                      {CATEGORY_LABELS[catData.id] || catData.labelHe}
                    </span>
                  </Link>
                ))}
            </div>
          </section>

          {/* Cross-links to high-value pages */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/guide" className="p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-right">
              <p className="font-medium text-foreground text-sm mb-1">המדריך המלא לפרומפטים</p>
              <p className="text-xs text-muted-foreground">5 עקרונות זהב וטכניקות מתקדמות</p>
            </Link>
            <Link href="/blog" className="p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-right">
              <p className="font-medium text-foreground text-sm mb-1">מאמרים ומדריכים</p>
              <p className="text-xs text-muted-foreground">טיפים מקצועיים לשימוש ב-AI</p>
            </Link>
            <Link href="/examples" className="p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-right">
              <p className="font-medium text-foreground text-sm mb-1">דוגמאות לפני ואחרי</p>
              <p className="text-xs text-muted-foreground">ראו איך Peroot משדרג פרומפטים</p>
            </Link>
          </div>

          {/* Back link */}
          <div className="mt-10 text-center">
            <Link
              href="/prompts"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
