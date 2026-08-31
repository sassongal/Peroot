import { logger } from "@/lib/logger";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/**
 * The ONE IndexNow submission implementation (Bing/Yandex + partners) —
 * protocol payload lives only here so key/endpoint changes happen once.
 * Awaited variant for callers that report status (admin route); returns
 * configured:false when the key is unset.
 */
export async function submitToIndexNowAwait(
  urls: string[],
): Promise<{ configured: boolean; ok: boolean; status: number; submitted: number }> {
  if (!INDEXNOW_KEY) return { configured: false, ok: false, status: 0, submitted: 0 };
  if (urls.length === 0) return { configured: true, ok: true, status: 200, submitted: 0 };
  const list = urls.slice(0, 10000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: new URL(SITE_URL).hostname,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: list,
    }),
  });
  return { configured: true, ok: res.ok, status: res.status, submitted: list.length };
}

/**
 * Fire-and-forget wrapper — called on every content publish so fresh pages
 * get crawled within minutes. Never throws; indexing pings must not fail a
 * publish.
 */
export function submitToIndexNow(urls: string[]): void {
  void submitToIndexNowAwait(urls)
    .then((r) => {
      if (r.configured && !r.ok) logger.warn(`[IndexNow] submission returned ${r.status}`);
    })
    .catch((e) => logger.warn("[IndexNow] submission failed:", e));
}
