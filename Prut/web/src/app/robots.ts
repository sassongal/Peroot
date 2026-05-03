import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peroot.space";
  return {
    rules: [
      // Default: allow all crawlers, block private routes
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/auth/", "/settings", "/developer"],
      },
      // ── Search-time AI bots (explicitly allow) ────────────────────────────
      // These power ChatGPT search, Perplexity, Claude web, DuckDuckGo AI, Mistral,
      // and similar AI answer engines that cite sources in real time.
      // Being indexed here = appearing in AI search results. Never block these.
      ...[
        "OAI-SearchBot", // ChatGPT search index crawler
        "ChatGPT-User", // ChatGPT browsing (on-demand fetch during chat)
        "PerplexityBot", // Perplexity index crawler
        "Perplexity-User", // Perplexity on-demand fetch
        "ClaudeBot", // Anthropic/Claude web crawler
        "anthropic-ai", // Anthropic crawler (alternate UA)
        "Claude-Web", // Claude browsing (on-demand fetch)
        "DuckAssistBot", // DuckDuckGo AI answers
        "MistralAI-User", // Mistral AI search
      ].map((bot) => ({ userAgent: bot, allow: "/" })),
      // ── Training-only crawlers (block) ────────────────────────────────────
      // These crawl for model training data, not search citations.
      // Blocking them opts out of training without affecting search ranking
      // or AI answer citations.
      ...[
        "GPTBot", // OpenAI training (use OAI-SearchBot for ChatGPT search)
        "Google-Extended", // Gemini/Bard training opt-out
        "Applebot-Extended", // Apple Intelligence training opt-out
        "CCBot", // Common Crawl (used by many trainers)
        "cohere-ai",
        "cohere-training-data-crawler",
        "Meta-ExternalAgent",
        "Meta-ExternalFetcher",
        "FacebookBot",
        "Amazonbot",
        "Bytespider",
        "YouBot",
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
      ].map((bot) => ({ userAgent: bot, disallow: ["/"] })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
