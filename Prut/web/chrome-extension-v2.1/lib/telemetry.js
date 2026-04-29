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

  function basePayload(extra) {
    return {
      ext_version: EXT_VERSION,
      ts: Date.now(),
      ...extra,
    };
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
