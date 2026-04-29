/**
 * Peroot Extension — Config Store (M3)
 *
 * Thin wrapper around `chrome.storage.local` for the extension config blob
 * (selectors + feature flags + model_profiles list). Read/written from
 * background/service-worker.js and read-only from content scripts.
 *
 * Storage key: `peroot.extension_config`
 * Shape mirrors the GET /api/extension-config response.
 */
(function (root) {
  const STORAGE_KEY = "peroot.extension_config";
  const SITE_URL = "https://www.peroot.space";

  async function getConfig() {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (data) => {
        resolve(data?.[STORAGE_KEY] || null);
      });
    });
  }

  async function setConfig(cfg) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    return new Promise((resolve) => {
      chrome.storage.local.set(
        { [STORAGE_KEY]: cfg, "peroot.extension_config_fetched_at": Date.now() },
        resolve,
      );
    });
  }

  async function refreshConfig() {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 10000) : null;
    try {
      const res = await fetch(`${SITE_URL}/api/extension-config`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: ctrl?.signal,
      });
      if (!res.ok) return { ok: false, status: res.status };
      const cfg = await res.json();
      await setConfig(cfg);
      return { ok: true, cfg };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const api = { getConfig, setConfig, refreshConfig, STORAGE_KEY };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootConfigStore = api;
  }
})(typeof self !== "undefined" ? self : this);
