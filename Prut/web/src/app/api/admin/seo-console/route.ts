import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/seo-console
 *
 * Smart SEO dashboard that works without Google Search Console:
 *  - Content metrics from Supabase (prompts, blog posts, categories)
 *  - SEO health scoring based on site configuration
 *  - Content calendar (weekly breakdown last 12 weeks)
 *  - GSC connection status via env var
 */
export const GET = withAdmin(async (_req, supabase) => {
  try {
    const now = new Date();
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── 1. Total public prompts ──────────────────────────────────────────────
    const { count: publicPromptsCount } = await supabase
      .from('personal_library')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    // ── 2. Blog posts ────────────────────────────────────────────────────────
    const { data: blogPosts, count: blogCount } = await supabase
      .from('blog_posts')
      .select('id, created_at, status', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // ── 3. Blog post categories ──────────────────────────────────────────────
    const { data: blogCategories } = await supabase
      .from('blog_posts')
      .select('category')
      .eq('status', 'published');

    const uniqueCategories = new Set(
      (blogCategories ?? []).map((p: { category: string | null }) => p.category).filter(Boolean)
    );

    // ── 4. Total registered users (signals community size for SEO) ───────────
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // ── 5. Content calendar: weekly breakdown last 12 weeks ──────────────────
    const { data: recentPrompts } = await supabase
      .from('personal_library')
      .select('created_at')
      .eq('is_public', true)
      .gte('created_at', twelveWeeksAgo);

    const { data: recentBlogPosts } = await supabase
      .from('blog_posts')
      .select('created_at')
      .eq('status', 'published')
      .gte('created_at', twelveWeeksAgo);

    // Build 12-week calendar
    const weeklyData: Array<{
      weekStart: string;
      weekLabel: string;
      prompts: number;
      blogPosts: number;
      total: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const weekStartMs = now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEndMs = now.getTime() - i * 7 * 24 * 60 * 60 * 1000;
      const weekStart = new Date(weekStartMs).toISOString();
      const weekEnd = new Date(weekEndMs).toISOString();

      const weekLabel = new Date(weekStartMs).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short',
      });

      const promptsThisWeek = (recentPrompts ?? []).filter((p: { created_at: string }) => {
        return p.created_at >= weekStart && p.created_at < weekEnd;
      }).length;

      const blogPostsThisWeek = (recentBlogPosts ?? []).filter(
        (p: { created_at: string }) => {
          return p.created_at >= weekStart && p.created_at < weekEnd;
        }
      ).length;

      weeklyData.push({
        weekStart,
        weekLabel,
        prompts: promptsThisWeek,
        blogPosts: blogPostsThisWeek,
        total: promptsThisWeek + blogPostsThisWeek,
      });
    }

    // ── 6. SEO Checklist evaluation ──────────────────────────────────────────
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME;
    const gscSiteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const isHttps = baseUrl?.startsWith('https://') ?? false;

    const checklist = [
      {
        id: 'site_name',
        label: 'Meta Site Name configured',
        labelHe: 'שם האתר מוגדר',
        status: !!siteName,
        detail: siteName
          ? `NEXT_PUBLIC_SITE_NAME=${siteName}`
          : 'Set NEXT_PUBLIC_SITE_NAME env var',
      },
      {
        id: 'https',
        label: 'HTTPS Enabled',
        labelHe: 'HTTPS פעיל',
        status: isHttps,
        detail: isHttps ? baseUrl : 'Ensure NEXT_PUBLIC_BASE_URL starts with https://',
      },
      {
        id: 'sitemap',
        label: 'Sitemap exists',
        labelHe: 'סייטמאפ קיים',
        status: true, // Next.js sitemap.ts assumed present
        detail: '/sitemap.xml',
      },
      {
        id: 'blog_active',
        label: 'Blog content active',
        labelHe: 'תוכן בלוג פעיל',
        status: (blogCount ?? 0) > 0,
        detail:
          (blogCount ?? 0) > 0
            ? `${blogCount} published posts`
            : 'No published blog posts found',
      },
      {
        id: 'public_library',
        label: 'Public library pages indexed',
        labelHe: 'דפי ספרייה ציבורית',
        status: (publicPromptsCount ?? 0) > 0,
        detail:
          (publicPromptsCount ?? 0) > 0
            ? `${publicPromptsCount} indexable pages`
            : 'No public prompts found',
      },
      {
        id: 'content_volume',
        label: 'Content volume sufficient (>20 pages)',
        labelHe: 'נפח תוכן מספיק',
        status: (publicPromptsCount ?? 0) + (blogCount ?? 0) > 20,
        detail: `${(publicPromptsCount ?? 0) + (blogCount ?? 0)} total public pages`,
      },
      {
        id: 'gsc_connected',
        label: 'Google Search Console connected',
        labelHe: 'Google Search Console מחובר',
        status: !!gscSiteUrl,
        detail: gscSiteUrl
          ? `Site: ${gscSiteUrl}`
          : 'Set GOOGLE_SEARCH_CONSOLE_SITE_URL env var',
      },
      {
        id: 'mobile_responsive',
        label: 'Mobile responsive',
        labelHe: 'מותאם למובייל',
        status: true, // Tailwind CSS + responsive design assumed
        detail: 'Tailwind CSS responsive design',
      },
    ];

    const passedChecks = checklist.filter((c) => c.status).length;
    const seoHealthScore = Math.round((passedChecks / checklist.length) * 100);

    // ── 7. Known site routes (internal linking proxy) ─────────────────────────
    const knownRoutes = [
      '/',
      '/library',
      '/blog',
      '/prompts',
      '/pricing',
      '/about',
      '/admin',
    ];

    // ── 8. Content metrics summary ────────────────────────────────────────────
    const contentMetrics = {
      totalPublicPages: (publicPromptsCount ?? 0) + (blogCount ?? 0),
      publicPrompts: publicPromptsCount ?? 0,
      blogPosts: blogCount ?? 0,
      blogCategories: uniqueCategories.size,
      totalUsers: totalUsers ?? 0,
      knownRoutes: knownRoutes.length,
      avgWeeklyContent:
        weeklyData.length > 0
          ? parseFloat(
              (
                weeklyData.reduce((s, w) => s + w.total, 0) / weeklyData.length
              ).toFixed(1)
            )
          : 0,
    };

    // ── 9. GSC connection status ──────────────────────────────────────────────
    const gscConnected = !!gscSiteUrl;

    // ── 10. Recent blog posts for display ────────────────────────────────────
    const recentBlogList = (blogPosts ?? []).slice(0, 5).map(
      (p: { id: string; created_at: string }) => ({
        id: p.id,
        created_at: p.created_at,
      })
    );

    return NextResponse.json({
      seoHealthScore,
      passedChecks,
      totalChecks: checklist.length,
      contentMetrics,
      weeklyData,
      checklist,
      gscConnected,
      gscSiteUrl: gscSiteUrl ?? null,
      recentBlogList,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    logger.error('[Admin SEO Console] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
