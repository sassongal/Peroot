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
        // ── Generative-model crawlers (allowed on purpose) ──────────────────
        // Deliberately opted IN so Peroot's content can be learned into and
        // grounded by ChatGPT + Gemini — the goal is maximum presence in LLM
        // answers, which outweighs the training opt-out for a discovery platform.
        "GPTBot", // OpenAI (training + ChatGPT grounding)
        "Google-Extended", // Gemini app / Vertex grounding + training
      ].map((bot) => ({ userAgent: bot, allow: "/" })),
      // ── Training-only crawlers (block) ────────────────────────────────────
      // Low-value / high-nuisance scrapers we still keep out. Unlike GPTBot &
      // Google-Extended above, these don't meaningfully drive LLM-answer presence.
      ...[
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
