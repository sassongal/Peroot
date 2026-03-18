import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export const revalidate = 3600; // ISR: regenerate every hour

export async function GET() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("title, slug, excerpt, published_at, category")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (posts || [])
    .map((post) => {
      const pubDate = post.published_at
        ? new Date(post.published_at).toUTCString()
        : new Date().toUTCString();
      const description = escapeXml(post.excerpt || "");
      const title = escapeXml(post.title);
      const category = post.category ? `<category>${escapeXml(post.category)}</category>` : "";

      return `    <item>
      <title>${title}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      ${category}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Peroot Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>מאמרים, מדריכים וטיפים על פרומפט אנג׳ינירינג ו-AI בעברית</description>
    <language>he</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
