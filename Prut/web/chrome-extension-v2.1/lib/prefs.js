/**
 * Peroot Extension — Preferences (one module for every surface).
 *
 * Preferences follow the person across their Chrome profiles
 * (chrome.storage.sync); tokens and caches stay on the machine
 * (chrome.storage.local). Keys are the same ones the previous version used,
 * so an upgrade keeps what people chose.
 *
 *   mode            STANDARD | DEEP_RESEARCH | IMAGE_GENERATION | VIDEO_GENERATION | AGENT_BUILDER
 *   tone            Professional | Casual | Creative | Persuasive | Academic
 *   outputLanguage  hebrew | english | arabic | russian | auto
 *   imagePlatform / videoPlatform
 *   theme           system | dark | light
 *   inlineToolbar   boolean (the floating "שדרג" on any text field)
 *   languageFromProfile  boolean: adopt profile.preferred_output_language
 *
 * Dual export: `self.PerootPrefs`, CommonJS for vitest.
 */
(function (root) {
  const KEYS = {
    mode: "peroot_last_mode",
    tone: "peroot_last_tone",
    outputLanguage: "peroot_output_language",
    imagePlatform: "peroot_last_image_platform",
    videoPlatform: "peroot_last_video_platform",
    theme: "peroot_theme_pref",
    inlineToolbar: "peroot_inline_btn",
    languageFromProfile: "peroot_language_from_profile",
    onboarded: "peroot_onboarded",
    whatsNewSeen: "peroot_whats_new_seen",
  };

  const DEFAULTS = {
    mode: "STANDARD",
    tone: "Professional",
    outputLanguage: "hebrew",
    imagePlatform: "general",
    videoPlatform: "general",
    theme: "system",
    inlineToolbar: true,
    languageFromProfile: true,
    onboarded: false,
    whatsNewSeen: "",
  };

  const MODES = ["STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "VIDEO_GENERATION", "AGENT_BUILDER"];
  const TONES = ["Professional", "Casual", "Creative", "Persuasive", "Academic"];
  const LANGS = ["hebrew", "english", "arabic", "russian", "auto"];
  const THEMES = ["system", "dark", "light"];

  function area() {
    if (typeof chrome === "undefined" || !chrome.storage) return null;
    return chrome.storage.sync || chrome.storage.local;
  }
  function local() {
    if (typeof chrome === "undefined" || !chrome.storage) return null;
    return chrome.storage.local;
  }

  function sanitize(name, value) {
    switch (name) {
      case "mode":
        return MODES.includes(value) ? value : DEFAULTS.mode;
      case "tone":
        return TONES.includes(value) ? value : DEFAULTS.tone;
      case "outputLanguage":
        return LANGS.includes(value) ? value : DEFAULTS.outputLanguage;
      case "theme":
        return THEMES.includes(value) ? value : DEFAULTS.theme;
      case "inlineToolbar":
      case "languageFromProfile":
      case "onboarded":
        return value !== false && value !== "false" ? true : false;
      case "imagePlatform":
      case "videoPlatform":
        return typeof value === "string" && /^[a-z0-9-]{1,32}$/.test(value) ? value : "general";
      case "whatsNewSeen":
        return typeof value === "string" ? value : "";
      default:
        return value;
    }
  }

  function storageGet(store, keys) {
    return new Promise((resolve) => {
      if (!store) return resolve({});
      try {
        store.get(keys, (data) => resolve(data || {}));
      } catch {
        resolve({});
      }
    });
  }
  function storageSet(store, obj) {
    return new Promise((resolve) => {
      if (!store) return resolve();
      try {
        store.set(obj, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  /**
   * Read every preference. Sync first, local as a fallback for values the
   * previous version wrote there, so nothing is lost on upgrade.
   */
  async function getAll() {
    const names = Object.keys(KEYS);
    const storageKeys = names.map((n) => KEYS[n]);
    const [synced, loc] = await Promise.all([
      storageGet(area(), storageKeys),
      storageGet(local(), storageKeys),
    ]);
    const out = {};
    for (const n of names) {
      const k = KEYS[n];
      const raw = synced[k] !== undefined ? synced[k] : loc[k];
      out[n] = raw === undefined ? DEFAULTS[n] : sanitize(n, raw);
    }
    // Onboarding is per machine, not per account.
    out.onboarded = loc[KEYS.onboarded] === true;
    return out;
  }

  async function get(name) {
    const all = await getAll();
    return all[name];
  }

  async function set(patch) {
    const syncObj = {};
    const localObj = {};
    for (const [n, v] of Object.entries(patch)) {
      if (!(n in KEYS)) continue;
      const clean = sanitize(n, v);
      if (n === "onboarded") localObj[KEYS[n]] = clean;
      else {
        syncObj[KEYS[n]] = clean;
        // Mirror to local so content scripts that still read local keep working.
        localObj[KEYS[n]] = clean;
      }
    }
    await Promise.all([storageSet(area(), syncObj), storageSet(local(), localObj)]);
  }

  /**
   * Adopt the profile's preferred output language once per change, unless
   * the person chose a language in the extension after that.
   */
  async function adoptProfileLanguage(preferred) {
    if (!preferred || !["hebrew", "english", "arabic", "russian"].includes(preferred)) return null;
    const all = await getAll();
    if (!all.languageFromProfile) return null;
    if (all.outputLanguage === preferred) return null;
    await set({ outputLanguage: preferred });
    return preferred;
  }

  /** Subscribe to preference changes from any surface. */
  function onChange(handler) {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return () => {};
    const byKey = Object.fromEntries(Object.entries(KEYS).map(([n, k]) => [k, n]));
    const listener = (changes, areaName) => {
      const patch = {};
      for (const [k, c] of Object.entries(changes)) {
        const n = byKey[k];
        if (n) patch[n] = sanitize(n, c.newValue);
      }
      if (Object.keys(patch).length) handler(patch, areaName);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  const api = { KEYS, DEFAULTS, MODES, TONES, LANGS, THEMES, sanitize, getAll, get, set, adoptProfileLanguage, onChange };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PerootPrefs = api;
})(typeof self !== "undefined" ? self : this);
