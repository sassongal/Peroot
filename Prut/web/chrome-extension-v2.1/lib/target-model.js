/**
 * Peroot Extension — Target Model Resolver (M3)
 *
 * Picks the model_profile_slug to send on /api/enhance:
 *   1. Manual override (chrome.storage.local key `peroot.target_model_override.<host>`)
 *   2. Host-matched profile_slug from the registry
 *   3. null (server falls back to default behavior)
 */
(function (root) {
  const OVERRIDE_PREFIX = "peroot.target_model_override.";

  // Slugs are lowercase alphanumerics with - or _; bound length to keep
  // request bodies sane and prevent storage abuse if the server is compromised.
  const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;

  function isValidSlug(s) {
    return typeof s === "string" && SLUG_PATTERN.test(s);
  }

  function normalizeHost(h) {
    if (!h) return "";
    return String(h)
      .toLowerCase()
      .replace(/^www\./, "");
  }

  function resolveTargetModel({ hostname, registry, override }) {
    if (isValidSlug(override)) {
      return override;
    }
    const norm = normalizeHost(hostname);
    if (!registry || typeof registry !== "object") return null;
    for (const siteKey of Object.keys(registry)) {
      const site = registry[siteKey];
      const hosts = Array.isArray(site?.hosts) ? site.hosts : [];
      if (hosts.some((h) => normalizeHost(h) === norm)) {
        return isValidSlug(site?.profile_slug) ? site.profile_slug : null;
      }
    }
    return null;
  }

  async function getOverride(hostname) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    const key = OVERRIDE_PREFIX + normalizeHost(hostname);
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (data) => resolve(data?.[key] || null));
    });
  }

  async function setOverride(hostname, slug) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const norm = normalizeHost(hostname);
    if (!norm) return;
    const key = OVERRIDE_PREFIX + norm;
    return new Promise((resolve) => {
      if (!slug) chrome.storage.local.remove(key, resolve);
      else if (isValidSlug(slug)) chrome.storage.local.set({ [key]: slug }, resolve);
      else resolve();
    });
  }

  const api = { resolveTargetModel, getOverride, setOverride, isValidSlug, OVERRIDE_PREFIX };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootTargetModel = api;
  }
})(typeof self !== "undefined" ? self : this);
