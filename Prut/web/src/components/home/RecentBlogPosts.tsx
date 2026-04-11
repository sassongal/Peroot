import Link from "next/link";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  published_at: string | null;
}

function truncateExcerpt(text: string | null, maxLength = 110): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

async function RecentBlogPostsContent() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, read_time, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);

  if (!posts || posts.length === 0) return null;

  return (
    <section
      dir="rtl"
      className="w-full max-w-5xl mx-auto px-4 pb-16"
      aria-labelledby="recent-posts-heading"
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          id="recent-posts-heading"
          className="text-2xl font-serif text-(--text-primary)"
        >
          מאמרים אחרונים
        </h2>
        <Link
          href="/blog"
          className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors group"
        >
          <span>לכל המאמרים</span>
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:translate-x-[-2px]" />
        </Link>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(posts as BlogPost[]).map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex flex-col bg-(--glass-bg) border border-(--glass-border) rounded-xl p-5 hover:border-amber-500/30 hover:bg-black/6 dark:hover:bg-white/8 transition-all group"
          >
            {/* Category badge + meta */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.category && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">
                  {post.category}
                </span>
              )}
              {post.published_at && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>
                    {new Date(post.published_at).toLocaleDateString("he-IL")}
                  </span>
                </div>
              )}
              {post.read_time && (
                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{post.read_time}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-serif text-(--text-primary) mb-2 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-200 transition-colors">
              {post.title}
            </h3>

            {/* Excerpt */}
            <p className="text-sm text-(--text-muted) leading-relaxed mt-auto">
              {truncateExcerpt(post.excerpt)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentBlogPostsSkeleton() {
  return (
    <section dir="rtl" className="w-full max-w-5xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-36 bg-(--glass-bg) rounded-md animate-pulse" />
        <div className="h-4 w-24 bg-(--glass-bg) rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-(--glass-bg) border border-(--glass-border) rounded-xl p-5 space-y-3"
          >
            <div className="flex gap-2">
              <div className="h-4 w-16 bg-black/5 dark:bg-white/10 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-(--glass-bg) rounded-full animate-pulse" />
            </div>
            <div className="h-5 w-full bg-black/5 dark:bg-white/10 rounded-md animate-pulse" />
            <div className="h-5 w-3/4 bg-black/5 dark:bg-white/10 rounded-md animate-pulse" />
            <div className="space-y-1.5 pt-1">
              <div className="h-3.5 w-full bg-(--glass-bg) rounded animate-pulse" />
              <div className="h-3.5 w-5/6 bg-(--glass-bg) rounded animate-pulse" />
              <div className="h-3.5 w-4/6 bg-(--glass-bg) rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentBlogPosts() {
  return (
    <Suspense fallback={<RecentBlogPostsSkeleton />}>
      <RecentBlogPostsContent />
    </Suspense>
  );
}
