import { logger } from "@/lib/logger";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/**
 * Fire-and-forget IndexNow submission (Bing/Yandex + partners). Called on
 * every content publish so fresh pages get crawled within minutes instead
 * of whenever the next full crawl happens. No-op when the key is unset;
 * never throws — indexing pings must not fail a publish.
 */
export function submitToIndexNow(urls: string[]): void {
  if (!INDEXNOW_KEY || urls.length === 0) return;
  void fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: new URL(SITE_URL).hostname,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000),
    }),
  })
    .then((r) => {
      if (!r.ok) logger.warn(`[IndexNow] submission returned ${r.status}`);
    })
    .catch((e) => logger.warn("[IndexNow] submission failed:", e));
}
