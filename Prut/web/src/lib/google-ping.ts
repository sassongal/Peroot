import { logger } from "@/lib/logger";

/**
 * Ping Google to re-crawl the sitemap after publishing new content.
 * Fire-and-forget — never throws.
 */
export async function pingGoogle(sitemapUrl: string): Promise<void> {
  try {
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      logger.info(`[google-ping] Successfully pinged Google for sitemap: ${sitemapUrl}`);
    } else {
      logger.warn(`[google-ping] Google ping returned status ${res.status} for: ${sitemapUrl}`);
    }
  } catch (err) {
    logger.error("[google-ping] Failed to ping Google:", err);
  }
}
