import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, promptCreativeWorkSchema } from "@/lib/schema";
import { CopyButton } from "../CopyButton";
import { UsePromptButton } from "../UsePromptButton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

function buildOgImageUrl(title: string, subtitle: string, categoryLabel: string): string {
  return `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle.slice(0, 100))}&category=${encodeURIComponent(categoryLabel)}`;
}

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

interface PromptRow {
  id: string;
  title: string;
  use_case: string | null;
  prompt: string;
  variables: string[] | null;
  category_id: string | null;
  preview_image_url: string | null;
  capability_mode: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface RelatedRow {
  id: string;
  title: string;
  use_case: string | null;
}

const CAPABILITY_BADGE: Record<string, { label: string; className: string }> = {
  IMAGE_GENERATION: {
    label: "יצירת תמונה",
    className: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  },
  DEEP_RESEARCH: {
    label: "מחקר מעמיק",
    className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  },
  AGENT_BUILDER: {
    label: "בונה סוכנים",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  VIDEO_GENERATION: {
    label: "יצירת וידאו",
    className: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  },
};

export const revalidate = 86400; // 24h ISR — prompt content is stable

export async function generateStaticParams() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("public_library_prompts")
    .select("id, category_id")
    .eq("is_active", true);

  const categoryIdToSlug = Object.fromEntries(
    Object.entries(CATEGORY_SLUG_MAP).map(([slug, d]) => [d.id.toLowerCase(), slug]),
  );

  return (data ?? [])
    .filter((p) => p.category_id && categoryIdToSlug[p.category_id.toLowerCase()])
    .map((p) => ({
      slug: categoryIdToSlug[p.category_id!.toLowerCase()],
      id: String(p.id),
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const categoryData = CATEGORY_SLUG_MAP[slug];

  const supabase = createServiceClient();
  const { data: prompt } = await supabase
    .from("public_library_prompts")
    .select("title, use_case, prompt")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!prompt || !categoryData) return { title: "פרומפט לא נמצא" };

  const title = `${prompt.title} — ${categoryData.labelHe} | Peroot`;
  const baseDesc = prompt.use_case?.trim() || prompt.prompt?.slice(0, 100)?.trim() || "";
  const description = `${baseDesc.slice(0, 100)} — פרומפט בעברית מוכן לשימוש ב-ChatGPT, Claude ו-Gemini.`;
  const canonicalUrl = `/prompts/${slug}/${id}`;
  const ogImage = buildOgImageUrl(prompt.title, description, categoryData.labelHe);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl, languages: { "he-IL": canonicalUrl } },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Peroot",
      locale: "he_IL",
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: prompt.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    robots: { index: true, follow: true },
  };
}

export default async function PromptPage({ params }: Props) {
  const { slug, id } = await params;
  const categoryData = CATEGORY_SLUG_MAP[slug];
  if (!categoryData) notFound();

  // Public data — use service client (no cookies needed, safe for ISR pre-rendering)
  const supabase = createServiceClient();

  const [{ data: prompt, error }, { data: related }] = await Promise.all([
    supabase
      .from("public_library_prompts")
      .select(
        "id, title, use_case, prompt, variables, category_id, preview_image_url, capability_mode, created_at, updated_at",
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("public_library_prompts")
      .select("id, title, use_case")
      .eq("is_active", true)
      .ilike("category_id", categoryData.id.toLowerCase())
      .neq("id", id)
      .limit(6),
  ]);

  if (error || !prompt) notFound();

  const p = prompt as PromptRow;
  const rel = (related ?? []) as RelatedRow[];
  const pageUrl = `${SITE_URL}/prompts/${slug}/${id}`;
  const badge =
    p.capability_mode && p.capability_mode !== "STANDARD"
      ? CAPABILITY_BADGE[p.capability_mode]
      : null;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "ספריית פרומפטים", url: "/prompts" },
          { name: categoryData.labelHe, url: `/prompts/${slug}` },
          { name: p.title, url: `/prompts/${slug}/${id}` },
        ])}
      />
      <JsonLd
        data={promptCreativeWorkSchema({
          title: p.title,
          description: `${(p.use_case?.trim() || p.prompt.slice(0, 100).trim()).slice(0, 100)} — פרומפט בעברית מוכן לשימוש ב-ChatGPT, Claude ו-Gemini.`,
          category: categoryData.labelHe,
          url: pageUrl,
          datePublished: p.created_at,
          dateModified: p.updated_at || p.created_at,
          keywords: `פרומפט, ${categoryData.labelHe}, ChatGPT, Claude, Gemini, AI בעברית`,
        })}
      />

      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-14">
          {/* Breadcrumbs */}
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground mb-8 flex-wrap"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              דף הבית
            </Link>
            <span>/</span>
            <Link href="/prompts" className="hover:text-foreground transition-colors">
              ספריית פרומפטים
            </Link>
            <span>/</span>
            <Link href={`/prompts/${slug}`} className="hover:text-foreground transition-colors">
              {categoryData.labelHe}
            </Link>
            <span>/</span>
            <span className="text-secondary-foreground line-clamp-1 max-w-[200px]">{p.title}</span>
          </nav>

          {/* Hero */}
          <header className="mb-8">
            <div className="flex items-start gap-3 mb-3">
              <span
                className="text-3xl md:text-4xl mt-1 shrink-0"
                role="img"
                aria-label={categoryData.labelHe}
              >
                {categoryData.emoji}
              </span>
              <div className="flex-1 min-w-0">
                {badge && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border mb-2 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
                <h1 className="text-2xl md:text-4xl font-serif text-foreground leading-tight">
                  {p.title}
                </h1>
              </div>
            </div>
            {p.use_case && (
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mt-3">
                {p.use_case}
              </p>
            )}
          </header>

          {/* Preview image (image generation prompts) */}
          {p.preview_image_url && (
            <div className="mb-6 rounded-xl overflow-hidden border border-border max-w-md">
              <Image
                src={p.preview_image_url}
                alt={p.title}
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Prompt text block */}
          <section aria-label="תוכן הפרומפט" className="mb-8">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
                <span className="text-xs font-medium text-muted-foreground">הפרומפט</span>
                <div className="flex items-center gap-2">
                  <CopyButton text={p.prompt} />
                  <UsePromptButton id={p.id} title={p.title} prompt={p.prompt} category={slug} />
                </div>
              </div>
              <div
                className={`p-5 text-sm leading-relaxed text-foreground whitespace-pre-wrap ${
                  p.capability_mode === "IMAGE_GENERATION" ? "font-mono dir-ltr text-left" : ""
                }`}
                dir={p.capability_mode === "IMAGE_GENERATION" ? "ltr" : undefined}
              >
                {p.prompt}
              </div>
            </div>
          </section>

          {/* Variables */}
          {p.variables && p.variables.length > 0 && (
            <section aria-label="משתנים להתאמה אישית" className="mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-3">משתנים להתאמה אישית</h2>
              <div className="flex flex-wrap gap-2">
                {p.variables.map((v) => (
                  <span
                    key={v}
                    className="px-3 py-1 rounded-full bg-secondary border border-border text-sm text-muted-foreground"
                  >
                    {`{${v}}`}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Related prompts */}
          {rel.length > 0 && (
            <section aria-label="פרומפטים קשורים" className="mt-12 md:mt-16">
              <h2 className="text-lg font-serif text-foreground mb-4">
                פרומפטים נוספים ב{categoryData.labelHe}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rel.map((r) => (
                  <Link
                    key={r.id}
                    href={`/prompts/${slug}/${r.id}`}
                    className="rounded-xl border border-border bg-card p-4 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1">
                      {r.title}
                    </p>
                    {r.use_case && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.use_case}</p>
                    )}
                  </Link>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  href={`/prompts/${slug}`}
                  className="text-sm text-amber-600/80 dark:text-amber-400/80 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  לכל הפרומפטים בקטגוריה →
                </Link>
              </div>
            </section>
          )}

          {/* CTA */}
          <section
            className="mt-16 md:mt-20 rounded-2xl border border-amber-500/20 bg-linear-to-l from-amber-500/5 to-transparent p-7 md:p-10 text-center"
            aria-label="קריאה לפעולה"
          >
            <p className="text-sm text-amber-600/70 dark:text-amber-400/70 font-medium mb-2">
              Peroot - מחולל פרומפטים בעברית
            </p>
            <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3">
              רוצים לשדרג את הפרומפט הזה?
            </h2>
            <p className="text-muted-foreground mb-5 max-w-lg mx-auto text-sm leading-relaxed">
              Peroot משדרגת כל פרומפט אוטומטית — מבנה מקצועי, הקשר מדויק ותוצאות טובות יותר
              ב-ChatGPT, Claude ו-Gemini.
            </p>
            <Link
              href="/?ref=library-prompt"
              className="inline-flex px-8 py-3 rounded-xl text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              נסו Peroot - חינם
            </Link>
          </section>

          {/* Back to category */}
          <div className="mt-10">
            <Link
              href={`/prompts/${slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה ל{categoryData.labelHe}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
