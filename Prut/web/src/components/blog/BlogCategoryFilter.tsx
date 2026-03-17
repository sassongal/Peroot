"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { BlogHeroImage } from "@/components/blog/BlogHeroImage";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
}

interface BlogCategoryFilterProps {
  categories: string[];
  posts: BlogPost[];
}

const ALL_LABEL = "הכל";

export function BlogCategoryFilter({ categories, posts }: BlogCategoryFilterProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_LABEL);

  const filteredPosts =
    activeCategory === ALL_LABEL
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  return (
    <div>
      {/* Category tab strip — horizontally scrollable, RTL */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 mb-8 scrollbar-hide"
        dir="rtl"
        role="tablist"
        aria-label="סינון לפי קטגוריה"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {[ALL_LABEL, ...categories].map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat)}
              className={[
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                isActive
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200 hover:border-white/20",
              ].join(" ")}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Post list */}
      <div className="space-y-4">
        {filteredPosts.length === 0 && (
          <div className="text-center py-16 px-8">
            <p className="text-lg text-slate-400 font-medium">אין מאמרים בקטגוריה זו</p>
            <p className="text-sm text-slate-500 mt-2">נסו לבחור קטגוריה אחרת</p>
          </div>
        )}
        {filteredPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block glass-card rounded-xl border border-white/10 p-6 hover:bg-white/[0.03] hover:border-white/20 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">
                {post.category}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString("he-IL")
                    : ""}
                </span>
              </div>
              <span className="text-[10px] text-slate-600">{post.read_time}</span>
            </div>
            <div className="mb-4">
              <BlogHeroImage
                title={post.title}
                category={post.category ?? ""}
                excerpt={post.excerpt ?? ""}
              />
            </div>
            <h2 className="text-xl font-serif text-white mb-2 group-hover:text-amber-200 transition-colors">
              {post.title}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
