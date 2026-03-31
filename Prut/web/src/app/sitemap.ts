import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_SLUG_MAP } from '@/lib/category-slugs';

/**
 * Comprehensive sitemap — includes all indexable content pages.
 *
 * Static pages + ALL prompt categories + ALL published blog posts.
 * Hebrew slug aliases are excluded (they 308-redirect to English canonicals).
 */

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
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  // ALL prompt categories (not just top 6)
  const promptsPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/prompts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...Object.keys(CATEGORY_SLUG_MAP).map((slug) => ({
      url: `${baseUrl}/prompts/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  // ALL published blog posts (no limit)
  try {
    const supabase = await createClient();
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

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
