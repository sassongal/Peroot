/**
 * Peroot Extension — API client for extension pages (popup, options).
 *
 * One place that knows the site URL, the auth header, the 401 refresh dance
 * and the shapes the routes return. Content scripts cannot fetch the site
 * directly (CORS), they go through the service worker instead; this module
 * is for pages that run in the extension origin. Depends on lib/auth.js
 * (getAuthHeaders, refreshAccessToken) being loaded first.
 */
(function (root) {
  const SITE_URL = "https://www.peroot.space";

  function withTimeout(ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, clear: () => clearTimeout(timer) };
  }

  /** Bearer-authenticated fetch; on 401 refresh the token once and retry. */
  async function authed(path, options = {}, timeoutMs = 20000) {
    const t = withTimeout(timeoutMs);
    try {
      const headers = await root.getAuthHeaders({
        "Content-Type": "application/json",
        ...(options.headers || {}),
      });
      let res = await fetch(`${SITE_URL}${path}`, { ...options, headers, signal: t.signal });
      if (res.status === 401 && typeof root.refreshAccessToken === "function") {
        const fresh = await root.refreshAccessToken();
        if (fresh) {
          res = await fetch(`${SITE_URL}${path}`, {
            ...options,
            headers: { ...headers, Authorization: `Bearer ${fresh}` },
            signal: t.signal,
          });
        }
      }
      return res;
    } finally {
      t.clear();
    }
  }

  async function json(path, options, timeoutMs) {
    const res = await authed(path, options, timeoutMs);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  }

  /** Hebrew message for a failed response, the same words the web app uses. */
  function errorMessage(status, data) {
    if (status === 401) return "פג תוקף ההתחברות. התחברו שוב.";
    if (status === 403) return data?.error || "נגמרו הקרדיטים להיום.";
    if (status === 429) return "יותר מדי בקשות. נסו שוב בעוד כמה דקות.";
    if (status === 0) return "אין חיבור לשרת. בדקו את החיבור לאינטרנט.";
    return data?.error || "השדרוג נכשל. נסו שוב.";
  }

  /**
   * POST /api/enhance and read the text stream. `onChunk(fullTextSoFar)` is
   * called as text arrives. Resolves with the raw full text (trailer
   * included) and the response headers.
   */
  async function streamEnhance(body, { onChunk, signal } = {}) {
    const headers = await root.getAuthHeaders({ "Content-Type": "application/json" });
    const t = withTimeout(90000);
    // The caller's abort (the stop button) and the 90s timeout both cancel.
    const combined =
      signal && typeof AbortSignal.any === "function" ? AbortSignal.any([signal, t.signal]) : signal || t.signal;
    try {
      let res = await fetch(`${SITE_URL}/api/enhance`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: combined,
      });
      if (res.status === 401 && typeof root.refreshAccessToken === "function") {
        const fresh = await root.refreshAccessToken();
        if (fresh) {
          res = await fetch(`${SITE_URL}/api/enhance`, {
            method: "POST",
            headers: { ...headers, Authorization: `Bearer ${fresh}` },
            body: JSON.stringify(body),
            signal: combined,
          });
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { ok: false, status: res.status, error: errorMessage(res.status, data), headers: res.headers };
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        if (onChunk) onChunk(full);
      }
      full += decoder.decode();
      return { ok: true, status: res.status, text: full, headers: res.headers };
    } catch (err) {
      const aborted = err?.name === "AbortError";
      return {
        ok: false,
        status: 0,
        error: aborted ? "הבקשה נמשכה יותר מדי. נסו שוב." : errorMessage(0),
        aborted,
      };
    } finally {
      t.clear();
    }
  }

  const api = {
    SITE_URL,
    authed,
    json,
    errorMessage,
    streamEnhance,
    me: () => json("/api/me"),
    quota: () => json("/api/me/quota"),
    library: () => json("/api/personal-library"),
    favorites: () => json("/api/favorites"),
    history: () => json("/api/history"),
    announcements: async () => {
      try {
        const res = await fetch(`${SITE_URL}/api/announcements`, { cache: "default" });
        const data = await res.json().catch(() => []);
        return { ok: res.ok, status: res.status, data: Array.isArray(data) ? data : [] };
      } catch {
        return { ok: false, status: 0, data: [] };
      }
    },
    saveToLibrary: (item) => json("/api/personal-library", { method: "POST", body: JSON.stringify(item) }),
    feedback: (payload) => json("/api/feedback", { method: "POST", body: JSON.stringify(payload) }),
    telemetry(event, extra) {
      try {
        const body = {
          event,
          ext_version: chrome.runtime?.getManifest?.().version || "unknown",
          ts: Date.now(),
          ...extra,
        };
        authed("/api/extension-telemetry", { method: "POST", body: JSON.stringify(body) }, 8000).catch(
          () => {},
        );
      } catch {
        /* best effort */
      }
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PerootApi = api;
})(typeof self !== "undefined" ? self : this);
