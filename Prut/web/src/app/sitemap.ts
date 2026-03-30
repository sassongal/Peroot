import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

/**
 * Focused sitemap for crawl-budget optimization.
 *
 * Google has zero authority on this domain — concentrate the sitemap
 * on ~20-30 high-value pages so crawlers prioritize indexing them.
 * Low-value pages (legal, extension placeholder, Hebrew slug aliases,
 * llms.txt, feed.xml) are excluded until the core pages are indexed.
 */

// Top prompt categories by search volume / content richness
const TOP_PROMPT_CATEGORIES = [
  'marketing', 'seo', 'creative', 'dev', 'social', 'education',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.peroot.space';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/teachers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/examples`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
  ];

  // Prompts index + top categories only
  const promptsPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/prompts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...TOP_PROMPT_CATEGORIES.map((slug) => ({
      url: `${baseUrl}/prompts/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  // Dynamic blog posts from DB (English slugs only — no Hebrew aliases)
  try {
    const supabase = await createClient();
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(15); // Top 15 most recent posts

    const blogEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...promptsPages, ...blogEntries];
  } catch {
    return [...staticPages, ...promptsPages];
  }
}
