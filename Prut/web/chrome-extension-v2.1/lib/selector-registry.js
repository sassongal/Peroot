/**
 * Peroot Extension — Selector Registry (M3)
 *
 * Pure utilities for host-to-site matching and selector chain resolution.
 * No DOM access in `matchHost`; `resolveSelector` takes the `doc` as an arg
 * for testability.
 *
 * Dual export: attaches to `window.PerootSelectorRegistry` for content scripts,
 * exports CommonJS for vitest, and exports ESM named bindings for direct import.
 */
function normalizeHost(h) {
  if (!h) return "";
  return String(h).toLowerCase().replace(/^www\./, "");
}

function matchHost(hostname, registry) {
  const norm = normalizeHost(hostname);
  if (!norm || !registry || typeof registry !== "object") return null;
  for (const siteKey of Object.keys(registry)) {
    const site = registry[siteKey];
    const hosts = Array.isArray(site && site.hosts) ? site.hosts : [];
    for (const h of hosts) {
      if (normalizeHost(h) === norm) {
        return { siteKey, site };
      }
    }
  }
  return null;
}

function resolveSelector(chain, doc) {
  if (!Array.isArray(chain) || !doc) return { el: null, index: -1 };
  for (let i = 0; i < chain.length; i++) {
    try {
      const el = doc.querySelector(chain[i]);
      if (el) return { el, index: i };
    } catch {
      // Invalid selector — try next
    }
  }
  return { el: null, index: -1 };
}

const __api = { matchHost, resolveSelector, normalizeHost };

if (typeof module !== "undefined" && module.exports) {
  module.exports = __api;
}
if (typeof self !== "undefined") {
  self.PerootSelectorRegistry = __api;
}
