import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Calendar, ExternalLink } from "lucide-react";
import { breadcrumbSchema, articleSchema, faqSchema, howToSchema } from "@/lib/schema";
import { IMAGE_GUIDES } from "../_data/image-guides";
import type { Guide } from "../_data/image-guides";
import { enrichGuideFromSkills } from "@/lib/engines/skills/guide-enricher";

async function getAllGuides(): Promise<Guide[]> {
  const { VIDEO_GUIDES } = await import("../_data/video-guides");
  return [...IMAGE_GUIDES, ...VIDEO_GUIDES];
}

function getGuide(slug: string, guides: Guide[]): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export async function generateStaticParams() {
  const guides = await getAllGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guides = await getAllGuides();
  const guide = getGuide(slug, guides);
  if (!guide) return { title: "מדריך לא נמצא | Peroot" };

  const ogUrl = `/api/og?title=${encodeURIComponent(guide.title)}&subtitle=${encodeURIComponent(guide.platform)}&category=${encodeURIComponent(guide.category === "image" ? "תמונות" : "סרטונים")}`;

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: `/guides/${guide.slug}`,
      locale: "he_IL",
      type: "article",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: guide.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guides = await getAllGuides();
  const rawGuide = getGuide(slug, guides);
  if (!rawGuide) notFound();

  // Enrich guide with fresh data from skill files (single source of truth for examples/mistakes)
  const guide = enrichGuideFromSkills(rawGuide, { mergeMode: 'append' });

  const relatedGuides = guide.relatedSlugs
    .map((s: string) => guides.find((g) => g.slug === s))
    .filter(Boolean) as Guide[];

  // Build HowTo steps from the structure
  const howToSteps = [
    { name: "הגדרת נושא מרכזי", text: "תאר את הנושא העיקרי בצורה ספציפית ומדויקת" },
    { name: "בחירת סגנון", text: "הגדר סגנון אמנותי, מדיום או אסתטיקה ברורה" },
    { name: "הוספת פרטים טכניים", text: "כלול מפרט מצלמה, תאורה וצבעים" },
    { name: "התאמה לפלטפורמה", text: `התאם את הפרומפט לדרישות ${guide.platform}` },
  ];

  return (
    <>
      {/* Schema markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "מדריכי פרומפטים", url: "/guides" },
              { name: guide.title, url: `/guides/${guide.slug}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleSchema({
              title: guide.title,
              excerpt: guide.metaDescription,
              published_at: guide.lastUpdated,
              author: "Gal Sasson",
              slug: `guides/${guide.slug}`,
            })
          ),
        }}
      />
      {guide.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              faqSchema(guide.faq)
            ),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            howToSchema({
              name: `איך לכתוב פרומפט מושלם ל-${guide.platform}`,
              steps: howToSteps,
            })
          ),
        }}
      />

      <article className="p-6 md:p-12 lg:p-20">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Back link */}
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-500 transition-colors text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה למדריכים
          </Link>

          {/* Hero */}
          <header className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  color: guide.color,
                  borderColor: `${guide.color}40`,
                  background: `${guide.color}10`,
                }}
              >
                {guide.icon} {guide.platform}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                עודכן: {new Date(guide.lastUpdated).toLocaleDateString("he-IL")}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {guide.readTime}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-serif font-bold leading-tight text-foreground">
              {guide.title}
            </h1>
          </header>

          {/* Intro — storytelling */}
          <section className="prose prose-lg dark:prose-invert max-w-none leading-relaxed text-muted-foreground">
            <div dangerouslySetInnerHTML={{ __html: guide.intro }} />
          </section>

          {/* What is */}
          <section className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-foreground" id="what-is">
              מה זה {guide.platform}?
            </h2>
            <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: guide.whatIs }} />
            </div>
          </section>

          {/* Optimal structure */}
          <section className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-foreground" id="structure">
              המבנה המושלם לפרומפט
            </h2>
            <div
              className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: guide.structure }}
            />
          </section>

          {/* Critical rules */}
          <section className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-foreground" id="rules">
              כללים קריטיים
            </h2>
            <ul className="space-y-2">
              {guide.rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground">
                  <span className="font-bold shrink-0" style={{ color: guide.color }}>{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Parameters */}
          {guide.params.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xl font-serif font-bold text-foreground" id="params">
                פרמטרים ותחביר
              </h2>
              <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-muted/30">
                      <th className="text-right p-3 font-bold text-foreground">פרמטר</th>
                      <th className="text-right p-3 font-bold text-foreground">ערכים</th>
                      <th className="text-right p-3 font-bold text-foreground">תיאור</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guide.params.map((p, i) => (
                      <tr key={i} className="border-b border-[hsl(var(--border))] last:border-0">
                        <td className="p-3 font-mono text-xs" style={{ color: guide.color }}>{p.name}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{p.values}</td>
                        <td className="p-3 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Examples */}
          <section className="space-y-5">
            <h2 className="text-2xl font-serif font-bold text-foreground" id="examples">
              דוגמאות מעשיות
            </h2>
            {guide.examples.map((ex, i) => (
              <div key={i} className="space-y-2 p-4 rounded-xl border border-[hsl(var(--border))] bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: guide.color }}>קונספט:</span>
                  <span className="text-foreground font-medium">{ex.concept}</span>
                </div>
                <div className="bg-background rounded-lg p-3 border border-[hsl(var(--border))]">
                  <p className="font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap" dir="ltr">
                    {ex.prompt}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{ex.explanation}</p>
              </div>
            ))}
          </section>

          {/* Common mistakes */}
          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-foreground" id="mistakes">
              טעויות נפוצות
            </h2>
            {guide.mistakes.map((m, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                  <span className="text-xs font-bold text-red-500 block mb-1">❌ לא לעשות:</span>
                  <p className="text-sm text-muted-foreground">{m.bad}</p>
                </div>
                <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                  <span className="text-xs font-bold text-green-500 block mb-1">✅ לעשות:</span>
                  <p className="text-sm text-muted-foreground">{m.good}</p>
                </div>
                <p className="md:col-span-2 text-xs text-muted-foreground pr-2">{m.why}</p>
              </div>
            ))}
          </section>

          {/* Personal tip */}
          <section className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
            <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">💡 טיפ אישי</h2>
            <p className="text-muted-foreground leading-relaxed">{guide.personalTip}</p>
          </section>

          {/* FAQ */}
          {guide.faq.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-foreground" id="faq">
                שאלות נפוצות
              </h2>
              {guide.faq.map((f, i) => (
                <details key={i} className="group border border-[hsl(var(--border))] rounded-xl">
                  <summary className="p-4 font-bold text-foreground cursor-pointer list-none flex items-center justify-between">
                    {f.question}
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="px-4 pb-4 text-muted-foreground leading-relaxed">
                    {f.answer}
                  </div>
                </details>
              ))}
            </section>
          )}

          {/* CTA */}
          <div className="text-center py-6 space-y-3 border-t border-[hsl(var(--border))]">
            <p className="text-muted-foreground text-sm">
              רוצה ש-Peroot יכתוב את הפרומפט המושלם עבורך?
            </p>
            <Link
              href={`/?mode=${guide.category === "image" ? "IMAGE_GENERATION" : "VIDEO_GENERATION"}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-amber-500/90 to-orange-500/90 text-white font-bold text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20"
            >
              נסה עכשיו ב-Peroot
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Related guides */}
          {relatedGuides.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">מדריכים קשורים</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedGuides.map((rg) => (
                  <Link
                    key={rg.slug}
                    href={`/guides/${rg.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))] hover:border-amber-500/30 transition-colors"
                  >
                    <span className="text-lg">{rg.icon}</span>
                    <div>
                      <div className="font-bold text-sm text-foreground">{rg.title}</div>
                      <div className="text-xs text-muted-foreground">{rg.platform}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </>
  );
}
