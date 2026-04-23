import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";

/**
 * Comprehensive sitemap — includes all indexable content pages.
 *
 * Static pages + ALL prompt categories + ALL published blog posts.
 * Hebrew slug aliases are excluded (they 308-redirect to English canonicals).
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

  // Guide slugs for sitemap (image + video platforms)
  const guideSlugs = [
    "midjourney",
    "gpt-image",
    "flux",
    "stable-diffusion",
    "imagen",
    "gemini-image",
    "image-prompts",
    "runway",
    "kling",
    "sora",
    "veo",
    "minimax",
    "video-prompts",
  ];

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guide`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guide/prompt-engineering`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...guideSlugs.map((slug) => ({
      url: `${baseUrl}/guides/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/teachers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/examples`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    {
      url: `${baseUrl}/templates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/extension`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  // ALL prompt categories (not just top 6)
  const promptsPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/prompts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...Object.keys(CATEGORY_SLUG_MAP).map((slug) => ({
      url: `${baseUrl}/prompts/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // ALL published blog posts + ALL individual library prompt pages
  try {
    const supabase = await createClient();

    // Paginate through public_library_prompts — Supabase caps a single select
    // at 1000 rows, which would silently truncate the sitemap as the library
    // grows and break SEO coverage for prompt detail pages.
    const libraryPrompts: { id: string; category_id: string | null }[] = [];
    const PAGE = 1000;
    for (let offset = 0; offset < 50000; offset += PAGE) {
      const { data, error } = await supabase
        .from("public_library_prompts")
        .select("id, category_id")
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
      .map((p) => ({
        url: `${baseUrl}/prompts/${categoryIdToSlug[p.category_id!.toLowerCase()]}/${p.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));

    return [...staticPages, ...promptsPages, ...blogEntries, ...promptEntries];
  } catch {
    return [...staticPages, ...promptsPages];
  }
}
