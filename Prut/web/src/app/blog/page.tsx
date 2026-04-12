import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";
import { ENGLISH_TO_HEBREW_SLUG } from "@/lib/blog-slug-map";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { BlogCategoryFilter } from "@/components/blog/BlogCategoryFilter";

export const metadata: Metadata = {
  title: "בלוג - טיפים ומדריכים לפרומפטים ו-AI",
  description: "מדריכים מקצועיים לכתיבת פרומפטים, טיפים לשימוש ב-ChatGPT, Claude ו-Gemini, וחדשות AI בעברית.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "בלוג Peroot - טיפים ומדריכים לפרומפטים ו-AI",
    description: "מדריכים מקצועיים לכתיבת פרומפטים, טיפים לשימוש ב-ChatGPT, Claude ו-Gemini, וחדשות AI בעברית.",
    url: "/blog",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "בלוג Peroot - טיפים ומדריכים לפרומפטים ו-AI",
    description: "מדריכים מקצועיים לכתיבת פרומפטים, טיפים לשימוש ב-ChatGPT, Claude ו-Gemini, וחדשות AI בעברית.",
  },
};

// ISR: regenerate blog listing every hour (blog posts change infrequently)
export const revalidate = 3600;

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, read_time, published_at, thumbnail_url")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <>
    <JsonLd
      data={breadcrumbSchema([
        { name: "דף הבית", url: "/" },
        { name: "בלוג", url: "/blog" },
      ])}
    />
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </Link>

        <div className="mb-12">
          <PageHeading
            title="הבלוג"
            subtitle="טיפים, מדריכים ותובנות על AI ופרומפטים - בעברית"
            align="center"
          />
        </div>

        {(posts ?? []).length === 0 ? (
          <div className="text-center py-16 px-8">
            <p className="text-lg text-muted-foreground font-medium">אין מאמרים עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">מאמרים חדשים יופיעו כאן בקרוב</p>
          </div>
        ) : (
          <BlogCategoryFilter
            categories={Array.from(
              new Set(
                (posts ?? [])
                  .map((p) => p.category)
                  .filter((c): c is string => Boolean(c))
              )
            )}
            posts={posts ?? []}
          />
        )}

        {/* Hidden Hebrew slug links for SEO crawlability */}
        <nav className="sr-only" aria-hidden="true">
          {(posts ?? []).map((post) => {
            const hebrewSlug = ENGLISH_TO_HEBREW_SLUG[post.slug];
            if (!hebrewSlug) return null;
            return (
              <Link key={`he-${post.slug}`} href={`/blog/${hebrewSlug}`}>
                {post.title}
              </Link>
            );
          })}
        </nav>

        {/* Cross-links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12">
          <CrossLinkCard href="/guide" title="מדריך: איך לכתוב פרומפט מושלם" description="עקרונות זהב וטכניקות מתקדמות" />
          <CrossLinkCard href="/prompts" title="ספריית פרומפטים לפי קטגוריה" description={`${PROMPT_LIBRARY_COUNT} תבניות מוכנות לשימוש מיידי`} />
          <CrossLinkCard href="/features" title="הכירו את כל הכלים שלנו" description="5 מנועי AI, תמונות, סרטונים וסוכנים" />
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12">
          <NewsletterSignup />
        </div>
      </div>
    </div>
    </>
  );
}
