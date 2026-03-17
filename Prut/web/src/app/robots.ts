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
      // Block AI training crawlers (keep search crawlers allowed via wildcard)
      ...[
        "CCBot",
        "Bytespider",
        "cohere-ai",
        "GPTBot",
        "ChatGPT-User",
        "Google-Extended",
        "ClaudeBot",
        "anthropic-ai",
        "Meta-ExternalAgent",
        "FacebookBot",
        "Amazonbot",
        "PerplexityBot",
        "YouBot",
      ].map((bot) => ({
        userAgent: bot,
        disallow: ["/"],
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
