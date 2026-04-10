import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import { articleSchema, breadcrumbSchema, faqSchema, howToSchema } from "@/lib/schema";
import { HEBREW_BLOG_SLUGS, ENGLISH_TO_HEBREW_SLUG } from "@/lib/blog-slug-map";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { BlogHeroImage } from "@/components/blog/BlogHeroImage";
import { BlogShareButtons } from "@/components/blog/BlogShareButtons";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { BlogTOC } from "@/components/blog/BlogTOC";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";

interface Props {
  params: Promise<{ slug: string }>;
}

// Pre-render all published blog posts at build time + ISR every 60 minutes
export async function generateStaticParams() {
  // Graceful fallback when Supabase env vars are absent (preview deploys)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Object.keys(HEBREW_BLOG_SLUGS).map((heSlug) => ({ slug: heSlug }));
  }

  const { createClient: createSupabase } = await import("@supabase/supabase-js");
  const supabase = createSupabase(url, key);
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  const englishSlugs = (posts || []).map((post) => ({ slug: post.slug }));
  const hebrewSlugs = Object.keys(HEBREW_BLOG_SLUGS).map((heSlug) => ({
    slug: heSlug,
  }));
  return [...englishSlugs, ...hebrewSlugs];
}

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const hebrewRedirect = HEBREW_BLOG_SLUGS[decodedSlug];
  if (hebrewRedirect) {
    return { title: "Redirecting..." };
  }
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, meta_title, meta_description, excerpt, slug, thumbnail_url, category")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) return { title: "מאמר לא נמצא" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";

  // Dynamic OG image with title + category styling
  const ogImage = `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.excerpt || "")}&category=${encodeURIComponent(post.category || "")}`;

  // Build hreflang alternates if Hebrew slug mapping exists
  const hebrewSlug = ENGLISH_TO_HEBREW_SLUG[post.slug];
  const languages: Record<string, string> = {
    "he-IL": `/blog/${post.slug}`,
    "x-default": `/blog/${post.slug}`,
  };
  if (hebrewSlug) {
    languages["he"] = `/blog/${encodeURIComponent(hebrewSlug)}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
      languages,
    },
    openGraph: {
      title: `${title} | Peroot`,
      description,
      url: `/blog/${post.slug}`,
      siteName: "Peroot",
      locale: "he_IL",
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Peroot`,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Inject stable `id` attributes into every H2 element in raw HTML so that
 * BlogTOC anchor links work. The same slug logic used in BlogTOC must be
 * mirrored here so that generated IDs match what the TOC builds.
 */
function injectH2Ids(html: string): string {
  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_match, attrs: string, inner: string) => {
    // Skip if an id is already present
    if (/\bid\s*=/.test(attrs)) return _match;

    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = text
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0590-\u05FF-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    if (!id) return _match;
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
}

/**
 * Extract Q&A pairs from blog content for FAQ schema.
 * Looks for H2/H3 that end with "?" followed by paragraph content.
 */
function extractFaqPairs(html: string): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  const regex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*([\s\S]*?)(?=<h[23]|$)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const heading = match[1].replace(/<[^>]+>/g, "").trim();
    if (!heading.includes("?")) continue;
    const answerHtml = match[2];
    const answer = answerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (answer.length > 20) {
      pairs.push({ question: heading, answer: answer.slice(0, 500) });
    }
  }
  return pairs;
}

/**
 * Extract step-by-step instructions from blog content for HowTo schema.
 * Uses H2 headings as step names and following paragraph as step text.
 */
function extractHowToSteps(html: string): { name: string; text: string }[] {
  const steps: { name: string; text: string }[] = [];
  const regex = /<h2[^>]*>([\s\S]*?)<\/h2>\s*([\s\S]*?)(?=<h2|$)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const name = match[1].replace(/<[^>]+>/g, "").trim();
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (name && text.length > 10) {
      steps.push({ name, text: text.slice(0, 300) });
    }
  }
  return steps;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const hebrewRedirect = HEBREW_BLOG_SLUGS[decodedSlug];
  if (hebrewRedirect) {
    permanentRedirect(`/blog/${hebrewRedirect}`);
  }

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) notFound();

  const blogSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
  const ogImageUrl = `${blogSiteUrl}/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.excerpt || "")}&category=${encodeURIComponent(post.category || "")}`;

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("he-IL")
    : "";

  // Enrich the HTML with id attributes on H2 headings for TOC linking
  const enrichedContent = injectH2Ids(post.content ?? "");

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      {/* Outer centering wrapper */}
      <div className="max-w-5xl mx-auto">
        <Link
          href="/blog"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה לבלוג</span>
        </Link>

        {/*
          Two-column layout on xl+:
            RTL order: article (right) | TOC (left)
          flex-row-reverse keeps RTL visual order while TOC sticks on the left.
        */}
        <div className="flex flex-row-reverse items-start gap-10">
          {/* Main article column */}
          <article className="min-w-0 flex-1 max-w-3xl">
            <header className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">
                  {post.category}
                </span>
                {publishedDate && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{publishedDate}</span>
                  </div>
                )}
                {post.read_time && (
                  <span className="text-[10px] text-muted-foreground">{post.read_time}</span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-4 leading-tight">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
              )}
            </header>

            <div className="mb-10">
              <BlogHeroImage
                title={post.title}
                category={post.category || ""}
                excerpt={post.excerpt || ""}
              />
            </div>

            {/* Share buttons — above content */}
            <div className="mb-6">
              <BlogShareButtons url={`${blogSiteUrl}/blog/${post.slug}`} title={post.title} />
            </div>

            <SafeHtml
              html={enrichedContent}
              className="prose dark:prose-invert prose-amber max-w-none
                prose-headings:font-serif prose-headings:text-foreground
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                prose-li:text-muted-foreground prose-li:leading-relaxed
                prose-strong:text-foreground
                prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline"
            />

            {/* Share buttons — below content */}
            <div className="mt-8 mb-4">
              <BlogShareButtons url={`${blogSiteUrl}/blog/${post.slug}`} title={post.title} />
            </div>

            {/* Newsletter signup */}
            <div className="mt-8 p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-lg font-serif text-foreground mb-3">נהנית מהתוכן? הצטרף לניוזלטר שלנו</p>
              <NewsletterSignup />
            </div>

            {/* Author Bio */}
            <div className="mt-12 p-6 rounded-2xl border border-border bg-secondary flex items-start gap-4" dir="rtl">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/20 shrink-0">
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">G</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{post.author || "Gal Sasson"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">מייסד JoyaTech ויוצר Peroot</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  מפתח ויזם בתחום ה-AI עם התמחות בעיבוד שפה טבעית ופרומפט אנג&apos;ינירינג.
                  בונה כלים שעוזרים למשתמשים לתקשר טוב יותר עם מודלי AI.
                </p>
              </div>
            </div>

            {/* Related links */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CrossLinkCard href="/prompts" title="תבניות פרומפטים קשורות" description={`${PROMPT_LIBRARY_COUNT} פרומפטים מוכנים לכל תחום`} />
              <CrossLinkCard href="/guide" title="המדריך המלא לפרומפטים בעברית" description="5 עקרונות זהב וטכניקות מתקדמות" />
              <CrossLinkCard href="/features" title="כל הכלים של Peroot" description="תמונות, סרטונים, מחקר וסוכני AI" />
            </div>

            {/* Gradient CTA */}
            <div className="mt-12 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-8 text-center space-y-4">
              <h3 className="text-2xl font-serif text-foreground">רוצים לשדרג את הפרומפטים שלכם?</h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Peroot משדרג כל פרומפט לרמה מקצועית - בעברית, בחינם, תוך שניות.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:scale-[1.03] transition-transform"
              >
                <Sparkles className="w-5 h-5" />
                נסו עכשיו בחינם
              </Link>
            </div>
          </article>

          {/* Sticky TOC — only visible on xl+ screens */}
          <BlogTOC content={enrichedContent} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleSchema({
              title: post.title,
              excerpt: post.meta_description || post.excerpt || "",
              slug: post.slug,
              published_at: post.published_at,
              author: post.author || "Gal Sasson",
              thumbnail_url: ogImageUrl,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "בלוג", url: "/blog" },
              { name: post.title, url: `/blog/${post.slug}` },
            ])
          ),
        }}
      />
      {/* FAQ schema for Q&A category posts */}
      {post.category === "שאלות ותשובות" && (() => {
        const pairs = extractFaqPairs(post.content ?? "");
        return pairs.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(pairs)) }}
          />
        ) : null;
      })()}
      {/* HowTo schema for guide category posts */}
      {post.category === "מדריכים" && (() => {
        const steps = extractHowToSteps(post.content ?? "");
        return steps.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(howToSchema({ name: post.title, steps })),
            }}
          />
        ) : null;
      })()}
    </main>
  );
}
