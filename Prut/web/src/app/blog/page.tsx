import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";

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

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, read_time, published_at, thumbnail_url")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">הבלוג</h1>
          <p className="text-lg text-slate-400">
            טיפים, מדריכים ותובנות על AI ופרומפטים - בעברית
          </p>
        </div>

        <div className="space-y-4">
          {(posts ?? []).length === 0 && (
            <div className="text-center py-16 px-8">
              <p className="text-lg text-slate-400 font-medium">אין מאמרים עדיין</p>
              <p className="text-sm text-slate-500 mt-2">מאמרים חדשים יופיעו כאן בקרוב</p>
            </div>
          )}
          {(posts ?? []).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block glass-card rounded-xl border border-white/10 p-6 hover:bg-white/[0.03] hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">
                  {post.category}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("he-IL") : ""}</span>
                </div>
                <span className="text-[10px] text-slate-600">{post.read_time}</span>
              </div>
              {post.thumbnail_url && (
                <img
                  src={post.thumbnail_url}
                  alt={post.title}
                  className="w-full h-48 sm:h-48 aspect-video object-cover rounded-lg mb-4"
                />
              )}
              <h2 className="text-xl font-serif text-white mb-2 group-hover:text-amber-200 transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12">
          <NewsletterSignup />
        </div>
      </div>
    </div>
  );
}
