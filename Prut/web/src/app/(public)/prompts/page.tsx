import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import Link from "next/link";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import {
  CATEGORY_LABELS,
  PROMPT_COLLECTIONS,
  PROMPT_LIBRARY_COUNT,
  PROMPT_TEMPLATE_COUNT,
} from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, speakablePageSchema } from "@/lib/schema";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { PromptSearch } from "@/components/features/library/PromptSearch";
import { PromptLinkTile } from "@/components/ui/PromptLinkTile";
import { CategoryQuickNav } from "@/components/features/library/CategoryQuickNav";
import { Code, PenTool, Rocket, Settings, Sparkles, TrendingUp, LayoutGrid } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { promptPagePath } from "@/lib/category-slugs";

// ISR: the popular strip refreshes hourly; everything else is static.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/** The catalogue index should show real prompts, not just category doors
 *  (U3.1: it previously displayed zero prompts). The table has no usage
 *  signal yet (last_used_at is null on every row), so "newest" is the
 *  honest strip until real popularity data exists. */
async function getFreshPrompts(): Promise<
  Array<{ id: string; title: string; use_case: string | null; category_id: string | null }>
> {
  try {
    const { data } = await createServiceClient()
      .from("public_library_prompts")
      .select("id, title, use_case, category_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: `ספריית פרומפטים בעברית: ${PROMPT_TEMPLATE_COUNT} תבניות`,
  description: `${PROMPT_TEMPLATE_COUNT} תבניות פרומפטים מוכנות בעברית לשיווק, פיתוח, תמונות, חינוך ועוד 25 קטגוריות. העתיקו, שדרגו עם AI, והתאימו לכל פלטפורמת AI.`,
  alternates: {
    canonical: "/prompts",
    languages: { "he-IL": "/prompts" },
  },
  openGraph: {
    title: `ספריית פרומפטים בעברית: ${PROMPT_TEMPLATE_COUNT} תבניות | Peroot`,
    description: `${PROMPT_TEMPLATE_COUNT} תבניות פרומפטים מוכנות בעברית לשיווק, פיתוח, תמונות וחינוך. העתיקו ושדרגו בשניות.`,
    url: `${SITE_URL}/prompts`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/assets/branding/logo.png`,
        width: 1200,
        height: 630,
        alt: "ספריית פרומפטים בעברית | Peroot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ספריית פרומפטים בעברית | Peroot",
    description: `${PROMPT_LIBRARY_COUNT} פרומפטים מקצועיים בעברית ל-25 תחומים.`,
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
        const slug = Object.entries(CATEGORY_SLUG_MAP).find(([, v]) => v.id === catId);
        return slug
          ? {
              slug: slug[0],
              id: catId,
              labelHe: CATEGORY_LABELS[catId] || slug[1].labelHe,
              emoji: slug[1].emoji,
            }
          : null;
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
    .map(([slug, v]) => ({
      slug,
      id: v.id,
      labelHe: CATEGORY_LABELS[v.id] || v.labelHe,
      emoji: v.emoji,
    }));

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

/**
 * PROMPT_COLLECTIONS stores `icon` as a lucide component NAME ("TrendingUp"),
 * but the section header rendered it inside a <span role="img">, so six
 * headings on this page displayed the literal strings "TrendingUp", "Rocket",
 * "PenTool", "Settings", "Code" and "SparklesIcon" next to the Hebrew title.
 * Map the names to the components they were always meant to be.
 */
const SECTION_ICONS: Record<string, typeof TrendingUp> = {
  TrendingUp,
  Rocket,
  PenTool,
  Settings,
  Code,
  SparklesIcon: Sparkles,
};

export default async function PromptsIndexPage() {
  const groups = groupSlugsByCollection();
  const totalCategories = Object.keys(CATEGORY_SLUG_MAP).length;
  const popular = await getFreshPrompts();

  return (
    <>
      {/* Structured data */}
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "ספריית פרומפטים", url: "/prompts" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "ספריית פרומפטים בעברית",
          description: "מאות פרומפטים מקצועיים בעברית לכל תחום: שיווק, מכירות, פיתוח, עיצוב ועוד.",
          url: `${SITE_URL}/prompts`,
          inLanguage: "he",
          publisher: {
            "@type": "Organization",
            name: "Peroot",
            url: SITE_URL,
          },
        }}
      />
      <JsonLd
        data={speakablePageSchema(`${SITE_URL}/prompts`, [
          "h1",
          "h2",
          "h3",
          ".prompt-collection-description",
        ])}
      />

      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-14">
          {/* Breadcrumbs */}
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground mb-8"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              דף הבית
            </Link>
            <span>/</span>
            <span className="text-secondary-foreground">ספריית פרומפטים</span>
          </nav>

          {/* Hero */}
          <header className="mb-12 md:mb-16">
            <PageHeading
              title="ספריית פרומפטים"
              highlight="בעברית"
              subtitle="מאות פרומפטים מקצועיים מוכנים לשימוש ב-ChatGPT, Claude ו-Gemini. בחרו קטגוריה, העתיקו פרומפט ושדרגו את התוצאות שלכם."
              size="large"
              align="start"
            />
            <div className="flex items-center gap-4 text-sm mt-6 heading-enter-delay-3">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {totalCategories} קטגוריות
              </span>
              <span className="text-(--text-muted)">|</span>
              <span className="text-muted-foreground">{PROMPT_LIBRARY_COUNT} פרומפטים</span>
            </div>
          </header>

          {/* Search */}
          <PromptSearch />

          {/* Jump-nav across the six category sections. What stood here was a
              chip labelled "סינון:" that filtered nothing — it navigated to
              /templates. The templates entry is now an honest link, below. */}
          <CategoryQuickNav
            sections={groups.map((g) => ({
              id: `cat-${g.collectionId}`,
              title: g.title,
              count: g.items.length,
            }))}
          />

          {/* Fresh prompts — real content above the category doors */}
          {popular.length > 0 && (
            <section className="mb-12 md:mb-16" aria-label="פרומפטים חדשים">
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                <h2 className="text-xl md:text-2xl font-serif text-foreground">חדשים בספרייה</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {popular.map((p) => {
                  const href = promptPagePath(p.category_id, p.id);
                  if (!href) return null;
                  return (
                    <PromptLinkTile key={p.id} href={href} title={p.title} useCase={p.use_case} />
                  );
                })}
              </div>
            </section>
          )}

          {/* Category groups */}
          <div className="space-y-12 md:space-y-16">
            {groups.map((group) => (
              <section
                key={group.collectionId}
                id={`cat-${group.collectionId}`}
                aria-label={group.title}
                className="scroll-mt-24"
              >
                {/* Section header */}
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
                  {(() => {
                    const Icon = SECTION_ICONS[group.icon] ?? LayoutGrid;
                    return <Icon className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />;
                  })()}
                  <h2 className="text-xl md:text-2xl font-serif text-foreground">{group.title}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {group.items.length}
                  </span>
                </div>

                {/* Category cards */}
                {/* On 360px iPhone SE widths, 2-col Hebrew labels wrap
                    aggressively and overflow the card. Drop to 1-col under
                    `sm` so the card label always fits. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                  {group.items.map(({ slug, labelHe, emoji }) => (
                    <Link
                      key={slug}
                      href={`/prompts/${slug}`}
                      className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 min-h-[104px] h-full rounded-xl border border-border bg-secondary hover:bg-(--glass-bg) hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-colors text-center"
                    >
                      <span className="text-2xl md:text-3xl" aria-hidden>
                        {emoji}
                      </span>
                      <span className="text-xs md:text-sm text-(--text-secondary) leading-snug wrap-break-word">
                        {labelHe}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Cross-links. The templates entry lives here, described for what it
              is, instead of masquerading as a filter above the catalogue. */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CrossLinkCard
              href="/templates"
              title="תבניות עם שדות למילוי"
              description="הפרומפטים שיש בהם משתנים: ממלאים את השדות ומקבלים פרומפט מותאם"
            />
            <CrossLinkCard
              href="/guide"
              title="איך לכתוב פרומפט טוב?"
              description="המדריך המלא עם עקרונות זהב וטכניקות"
            />
            <CrossLinkCard
              href="/features"
              title="מצבי עבודה מתקדמים"
              description="תמונות, סרטונים, מחקר מעמיק וסוכני AI"
            />
          </div>

          {/* CTA */}
          <section
            className="mt-16 md:mt-20 rounded-2xl border border-amber-500/20 bg-linear-to-l from-amber-500/5 to-transparent p-7 md:p-10 text-center"
            aria-label="קריאה לפעולה"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-3">
              רוצים לשדרג את הפרומפטים שלכם?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Peroot משדרגת כל פרומפט אוטומטית - מבנה מקצועי, הקשר מדויק ותוצאות טובות יותר ב-AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <ButtonLink href="/?ref=prompts-index" size="lg">
                נסו Peroot - חינם
              </ButtonLink>
              <Link
                href="/pricing"
                className="px-8 py-3 rounded-xl border border-border text-secondary-foreground text-sm font-medium hover:bg-secondary transition-colors"
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
