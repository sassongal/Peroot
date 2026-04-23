import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peroot.space";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/auth/", "/settings", "/developer"],
      },
      // Block AI training crawlers. Search crawlers (Googlebot, Bingbot, etc.)
      // remain allowed via the wildcard rule above. Google-Extended /
      // Applebot-Extended opt out of AI training without affecting search
      // indexing. OAI-SearchBot is intentionally NOT blocked — it powers
      // ChatGPT search citations and drives referral traffic.
      ...[
        "GPTBot",
        "ChatGPT-User",
        "Google-Extended",
        "Applebot-Extended",
        "ClaudeBot",
        "anthropic-ai",
        "Claude-Web",
        "cohere-ai",
        "cohere-training-data-crawler",
        "Meta-ExternalAgent",
        "Meta-ExternalFetcher",
        "FacebookBot",
        "Amazonbot",
        "Bytespider",
        "PerplexityBot",
        "Perplexity-User",
        "YouBot",
        "CCBot",
        "DuckAssistBot",
        "MistralAI-User",
        "AI2Bot",
        "Diffbot",
        "FriendlyCrawler",
        "ImagesiftBot",
        "Omgili",
        "Omgilibot",
        "PanguBot",
        "Timpibot",
        "Webzio-Extended",
        "Kangaroo Bot",
        "Scrapy",
        "iaskspider/2.0",
      ].map((bot) => ({
        userAgent: bot,
        disallow: ["/"],
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
