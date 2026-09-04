/**
 * Best-effort usage signal from the catalogue detail page.
 *
 * `/api/prompt-usage` records who copied or enhanced a library prompt,
 * guests included (rate-limited by IP). The page must never wait on, or
 * surface, this call. `keepalive` lets the request finish while the CTA navigates away.
 */

type UsageEvent = "copy" | "enhance";

export const USAGE_SOURCE = "catalog_detail";

export function sendUsageSignal(promptKey: string, eventType: UsageEvent, promptLength: number) {
  if (typeof fetch !== "function") return;
  try {
    void fetch("/api/prompt-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_key: promptKey,
        event_type: eventType,
        source: USAGE_SOURCE,
        prompt_length: promptLength,
      }),
      keepalive: true,
    }).catch(() => {
      /* analytics only, never block the user */
    });
  } catch {
    /* fetch threw synchronously (unsupported option, closed window): ignore */
  }
}
