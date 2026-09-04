/**
 * Peroot Extension — Telemetry Beacon (M3)
 *
 * Fire-and-forget POST to /api/extension-telemetry. All calls are best-effort
 * and must never block UX or surface errors to the user.
 *
 * Routes through service-worker's API_FETCH handler when called from a content
 * script (avoids CORS quirks); calls fetch directly when invoked from the SW.
 */
(function (root) {
  const SITE_URL = "https://www.peroot.space";
  const EXT_VERSION =
    (typeof chrome !== "undefined" && chrome.runtime?.getManifest?.()?.version) || "unknown";

  // In-memory dedupe to prevent runaway beacons if a caller fires in a loop.
  // Keyed by `${event}:${selector_kind || ''}`; one beacon per minute per key.
  const RATE_LIMIT_MS = 60_000;
  const lastFired = new Map();

  function shouldRateLimit(event, payload) {
    const key = `${event}:${payload?.selector_kind || ""}`;
    const now = Date.now();
    const prev = lastFired.get(key) || 0;
    if (now - prev < RATE_LIMIT_MS) return true;
    lastFired.set(key, now);
    return false;
  }

  // Keys the ingest zod schema accepts at the top level. Everything else is
  // silently STRIPPED by the server, so extras (selector_kind, chain_length —
  // exactly what the admin dashboard reads via meta.*) must ride inside
  // `meta` or they vanish. Review 2026-09-04: every selector_miss arrived as
  // "unknown" because of this.
  const TOP_LEVEL_KEYS = new Set([
    "site",
    "target_model",
    "latency_ms",
    "success",
    "chain_index",
    "meta",
  ]);

  function basePayload(extra) {
    const top = { ext_version: EXT_VERSION };
    const meta = {};
    for (const [k, v] of Object.entries(extra || {})) {
      if (v === undefined || v === null) continue;
      if (k === "meta" && v && typeof v === "object") Object.assign(meta, v);
      else if (TOP_LEVEL_KEYS.has(k)) top[k] = v;
      else meta[k] = v;
    }
    if (Object.keys(meta).length > 0) top.meta = meta;
    return top;
  }

  async function fireTelemetry(event, payload) {
    if (shouldRateLimit(event, payload)) return;
    const body = { event, ...basePayload(payload) };

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage && !chrome.tabs) {
      try {
        chrome.runtime.sendMessage(
          { type: "API_FETCH", path: "/api/extension-telemetry", method: "POST", body },
          () => void chrome.runtime?.lastError,
        );
      } catch {
        // Service worker may be inactive — drop event.
      }
      return;
    }

    try {
      await fetch(`${SITE_URL}/api/extension-telemetry`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // Ignore — telemetry is best-effort.
    }
  }

  const api = { fireTelemetry };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootTelemetry = api;
  }
})(typeof self !== "undefined" ? self : this);
