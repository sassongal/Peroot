import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import { IMAGE_GUIDES } from "./(public)/guides/_data/image-guides";
import { VIDEO_GUIDES } from "./(public)/guides/_data/video-guides";

/**
 * Comprehensive sitemap — includes all indexable content pages.
 *
 * Static pages + ALL prompt categories + ALL published blog posts + ALL
 * active library prompt pages. Hebrew slug aliases are excluded (they
 * 308-redirect to English canonicals).
 *
 * lastModified policy: only emitted where we KNOW the real value (DB
 * updated_at). A previous version stamped request-time on all 737 URLs,
 * which teaches Google to distrust the field entirely — omitting it is
 * better than lying.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

  // Guide slugs derive from the same _data source the pages render from —
  // a hardcoded list here silently drifted when guides were added.
  const guideSlugs = [...IMAGE_GUIDES, ...VIDEO_GUIDES].map((g) => g.slug);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/features`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/guide`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/guide/prompt-engineering`, changeFrequency: "monthly", priority: 0.95 },
    { url: `${baseUrl}/guides`, changeFrequency: "monthly", priority: 0.9 },
    ...guideSlugs.map((slug) => ({
      url: `${baseUrl}/guides/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${baseUrl}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/teachers`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/examples`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/templates`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/connect`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/connect/docs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/extension`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/accessibility`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.4 },
  ];

  // ALL prompt categories (not just top 6)
  const promptsPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/prompts`, changeFrequency: "weekly", priority: 0.9 },
    ...Object.keys(CATEGORY_SLUG_MAP).map((slug) => ({
      url: `${baseUrl}/prompts/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // ALL published blog posts + ALL individual library prompt pages.
  // Cookieless service client: public data only, and no cookie read that
  // would drag the sitemap route into per-request dynamic rendering.
  try {
    const supabase = createServiceClient();

    // Paginate through public_library_prompts — Supabase caps a single select
    // at 1000 rows, which would silently truncate the sitemap as the library
    // grows and break SEO coverage for prompt detail pages.
    const libraryPrompts: {
      id: string;
      category_id: string | null;
      updated_at: string | null;
      created_at: string | null;
    }[] = [];
    const PAGE = 1000;
    for (let offset = 0; offset < 50000; offset += PAGE) {
      const { data, error } = await supabase
        .from("public_library_prompts")
        .select("id, category_id, updated_at, created_at")
        .eq("is_active", true)
        .range(offset, offset + PAGE - 1);
      if (error || !data || data.length === 0) break;
      libraryPrompts.push(...data);
      if (data.length < PAGE) break;
    }

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    const blogEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    // Build a reverse map: category_id (lowercase) → slug
    const categoryIdToSlug = Object.fromEntries(
      Object.entries(CATEGORY_SLUG_MAP).map(([slug, data]) => [data.id.toLowerCase(), slug]),
    );

    const promptEntries: MetadataRoute.Sitemap = libraryPrompts
      .filter((p) => p.category_id && categoryIdToSlug[p.category_id.toLowerCase()])
      .map((p) => {
        const lastMod = p.updated_at || p.created_at;
        return {
          url: `${baseUrl}/prompts/${categoryIdToSlug[p.category_id!.toLowerCase()]}/${p.id}`,
          ...(lastMod ? { lastModified: new Date(lastMod) } : {}),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        };
      });

    return [...staticPages, ...promptsPages, ...blogEntries, ...promptEntries];
  } catch {
    return [...staticPages, ...promptsPages];
  }
}
