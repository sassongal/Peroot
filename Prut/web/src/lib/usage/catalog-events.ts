import { getApiPath } from "@/lib/api-path";
import type { CatalogSource } from "@/components/features/catalog/types";

export type CatalogEventType = "copy" | "enhance";

/**
 * Best-effort record of what people do with a catalogue prompt, and from
 * which page. Until 2026-09-04 the event carried no source, so nobody could
 * say whether the templates page or the category pages did the converting.
 * Guest events are accepted too (rate-limited by IP) since the source
 * attribution fix; the call still never blocks the copy or the navigation
 * it describes.
 */
export function trackCatalogEvent(
  promptId: string,
  eventType: CatalogEventType,
  source: CatalogSource,
  promptLength?: number,
): void {
  if (typeof window === "undefined") return;
  try {
    void fetch(getApiPath("/api/prompt-usage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_key: promptId,
        event_type: eventType,
        source,
        prompt_length: promptLength,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking never breaks a flow */
  }
}
