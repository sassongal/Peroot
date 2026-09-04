import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, FolderOpen, SlidersHorizontal } from "lucide-react";
import { PromptLinkTile } from "@/components/ui/PromptLinkTile";
import { ButtonLink } from "@/components/ui/Button";
import { createServiceClient } from "@/lib/supabase/service";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, howToSchema, promptCreativeWorkSchema } from "@/lib/schema";
import {
  CapabilityMode,
  ENGINE_HUE,
  getCapabilityLabelHe,
  parseCapabilityMode,
} from "@/lib/capability-mode";
import { formatDateHe } from "@/lib/dates/format";
import { PromptWorkbench } from "./PromptWorkbench";
import {
  buildHowToSteps,
  fieldsPhrase,
  isMeaningfullyUpdated,
  resolveVariables,
} from "./prompt-detail-utils";

// The full prompt body is public and server-rendered (owner decision,
// 2026-08-31): the raw prompt is the SEO/GEO asset — 650+ unique landing
// pages — while the product (personalized enhancement) is pitched by the
// CTA. The previous 160-char auth-gated stub made every library page a
// thin near-duplicate and suppressed the whole domain.

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

export const revalidate = 86400; // 24h ISR: prompt content is stable

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
    .select("title, use_case, prompt, variables")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!prompt || !categoryData) return { title: "פרומפט לא נמצא" };

  // No " | Peroot" suffix; the root title template appends it (avoids a doubled
  // "… | Peroot | Peroot").
  const title = `${prompt.title} - ${categoryData.labelHe}`;
  // Lead with the page's own unique text (use case, else the prompt opening) so
  // descriptions differ across the ~650 library pages; the suffix stays short
  // and carries the category, and the field count when the prompt has fields.
  const baseDesc = prompt.use_case?.trim() || prompt.prompt?.slice(0, 140)?.trim() || "";
  const fieldCount = resolveVariables(
    prompt.prompt ?? "",
    prompt.variables as string[] | null,
  ).length;
  const suffix =
    fieldCount > 0
      ? `פרומפט ${categoryData.labelHe} בעברית עם ${fieldsPhrase(fieldCount)}, חינם, כולל שדרוג אוטומטי ב-Peroot.`
      : `פרומפט ${categoryData.labelHe} מלא בעברית, חינם, כולל שדרוג אוטומטי ב-Peroot.`;
  const description = `${baseDesc.slice(0, 120)} · ${suffix}`;
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

/** Low-alpha hex suffixes for the engine pill (DESIGN.md, Chips). */
const HUE_BG_ALPHA = "24";
const HUE_BORDER_ALPHA = "59";

export default async function PromptPage({ params }: Props) {
  const { slug, id } = await params;
  const categoryData = CATEGORY_SLUG_MAP[slug];
  if (!categoryData) notFound();

  // Public data: use service client (no cookies needed, safe for ISR pre-rendering)
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
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (error || !prompt) notFound();

  const p = prompt as PromptRow;
  const rel = (related ?? []) as RelatedRow[];
  const pageUrl = `${SITE_URL}/prompts/${slug}/${id}`;
  const variables = resolveVariables(p.prompt, p.variables);
  const hasFields = variables.length > 0;

  const mode = parseCapabilityMode(p.capability_mode);
  const modeBadge =
    mode !== CapabilityMode.STANDARD
      ? { label: getCapabilityLabelHe(mode), hue: ENGINE_HUE[mode] }
      : null;
  const updatedLabel = isMeaningfullyUpdated(p.created_at, p.updated_at)
    ? formatDateHe(p.updated_at)
    : "";

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
          description: `${(p.use_case?.trim() || p.prompt.slice(0, 100).trim()).slice(0, 100)}. פרומפט בעברית מוכן לשימוש ב-ChatGPT, Claude ו-Gemini.`,
          category: categoryData.labelHe,
          url: pageUrl,
          datePublished: p.created_at,
          dateModified: p.updated_at || p.created_at,
          keywords: `פרומפט, ${categoryData.labelHe}, ChatGPT, Claude, Gemini, AI בעברית`,
        })}
      />
      {hasFields && (
        <JsonLd
          data={howToSchema({
            name: `איך משתמשים בפרומפט ${p.title}`,
            description: `מילוי ${fieldsPhrase(variables.length)} ושדרוג הפרומפט ב-Peroot.`,
            steps: buildHowToSteps(variables),
          })}
        />
      )}

      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-14">
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
            <div className="flex items-start gap-3">
              <span
                className="text-3xl md:text-4xl mt-1 shrink-0"
                role="img"
                aria-label={categoryData.labelHe}
              >
                {categoryData.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-4xl font-serif text-foreground leading-tight text-balance">
                  {p.title}
                </h1>
              </div>
            </div>
            {p.use_case && (
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mt-3">
                {p.use_case}
              </p>
            )}

            {/* Facts strip */}
            <ul
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
              aria-label="פרטי הפרומפט"
            >
              <li>
                <Link
                  href={`/prompts/${slug}`}
                  className="inline-flex items-center gap-1.5 min-h-[32px] hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded"
                >
                  <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  {categoryData.labelHe}
                </Link>
              </li>
              {modeBadge && (
                <li>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-foreground font-medium"
                    style={{
                      backgroundColor: `${modeBadge.hue}${HUE_BG_ALPHA}`,
                      borderColor: `${modeBadge.hue}${HUE_BORDER_ALPHA}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: modeBadge.hue }}
                      aria-hidden="true"
                    />
                    {modeBadge.label}
                  </span>
                </li>
              )}
              {hasFields && (
                <li className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  {fieldsPhrase(variables.length)}
                </li>
              )}
              {updatedLabel && (
                <li className="inline-flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    עודכן <time dateTime={p.updated_at ?? undefined}>{updatedLabel}</time>
                  </span>
                </li>
              )}
            </ul>
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

          {/* Prompt body as a live preview, the fields, and the one gold action */}
          <section aria-label="תוכן הפרומפט" className="mb-10">
            <PromptWorkbench
              promptId={p.id}
              title={p.title}
              slug={slug}
              capabilityMode={p.capability_mode}
              fullText={p.prompt}
              variables={variables}
            />
          </section>

          {/* How to use: answer-shaped content for search and answer engines */}
          <section aria-label="איך משתמשים בפרומפט" className="mb-10 max-w-2xl">
            <h2 className="text-sm font-semibold text-foreground mb-3">איך משתמשים בפרומפט הזה?</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
              {hasFields && (
                <li>
                  מלאו את {fieldsPhrase(variables.length)} בפאנל שליד הפרומפט, התצוגה מתעדכנת תוך
                  כדי הקלדה.
                </li>
              )}
              <li>
                רוצים גרסה חדה יותר? לחצו על &quot;
                {hasFields ? "מלאו ושדרגו בפירוט" : "שדרגו בפירוט"}
                &quot;, Peroot מרחיבה את הפרומפט עם הקשר, מבנה מקצועי ודירוג איכות, מותאם למודל היעד
                שלכם.
              </li>
              <li>
                או העתיקו את הפרומפט כמו שהוא (כפתור ההעתקה בראש הכרטיס) והדביקו ב-ChatGPT, Claude
                או Gemini.
              </li>
            </ol>
          </section>

          {/* Related prompts */}
          {rel.length > 0 && (
            <section aria-label="פרומפטים קשורים" className="mt-12 md:mt-16">
              <h2 className="text-lg font-serif text-foreground mb-4">
                עוד פרומפטים ב{categoryData.labelHe}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rel.map((r) => (
                  <PromptLinkTile
                    key={r.id}
                    href={`/prompts/${slug}/${r.id}`}
                    title={r.title}
                    useCase={r.use_case}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Cross-links */}
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={`/prompts/${slug}`} variant="ghost">
              לכל הפרומפטים ב{categoryData.labelHe}
            </ButtonLink>
            {hasFields && (
              <ButtonLink href="/templates" variant="ghost">
                לכל התבניות למילוי
              </ButtonLink>
            )}
          </div>

          {/* Back to category */}
          <div className="mt-10">
            <Link
              href={`/prompts/${slug}`}
              className="inline-flex items-center gap-2 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
              חזרה ל{categoryData.labelHe}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
