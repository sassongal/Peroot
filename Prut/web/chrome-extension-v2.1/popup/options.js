/**
 * Peroot Extension — Options page logic.
 *
 * External script (no inline) so the page complies with MV3 CSP
 * `script-src 'self'`. Mirrors what was previously inline in options.html.
 */
(() => {
  const store = chrome.storage.sync || chrome.storage.local;

  function applyTheme(val) {
    if (val === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", val);
    }
  }

  function setActive(groupId, selector, attr, value) {
    document.querySelectorAll(`#${groupId} ${selector}`).forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute(attr) === value);
    });
  }

  function showSaved() {
    const banner = document.getElementById("save-banner");
    if (!banner) return;
    banner.classList.add("show");
    setTimeout(() => banner.classList.remove("show"), 1800);
  }

  // Apply theme immediately on load (sync storage — follows the user across devices).
  store.get(["peroot_theme_pref"], (syncPrefs) => {
    const theme = syncPrefs.peroot_theme_pref || "dark";
    applyTheme(theme);
    setActive("theme-chips", "[data-theme-val]", "data-theme-val", theme);
  });

  chrome.storage.local.get(
    ["peroot_last_mode", "peroot_last_tone", "peroot_output_language", "peroot_inline_btn"],
    (localPrefs) => {
      setActive(
        "mode-chips",
        "[data-mode-val]",
        "data-mode-val",
        localPrefs.peroot_last_mode || "STANDARD",
      );
      setActive(
        "tone-chips",
        "[data-tone-val]",
        "data-tone-val",
        localPrefs.peroot_last_tone || "Professional",
      );
      setActive(
        "lang-chips",
        "[data-lang-val]",
        "data-lang-val",
        localPrefs.peroot_output_language || "hebrew",
      );
      const toggle = document.getElementById("inline-btn-toggle");
      if (toggle) toggle.checked = localPrefs.peroot_inline_btn !== false;
    },
  );

  // Version badge
  try {
    const badge = document.getElementById("version-badge");
    if (badge) badge.textContent = "v" + chrome.runtime.getManifest().version;
  } catch {}

  // Theme chips
  document.querySelectorAll("[data-theme-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.themeVal;
      setActive("theme-chips", "[data-theme-val]", "data-theme-val", val);
      store.set({ peroot_theme_pref: val });
      applyTheme(val);
      showSaved();
    });
  });

  // Mode chips
  document.querySelectorAll("[data-mode-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.modeVal;
      setActive("mode-chips", "[data-mode-val]", "data-mode-val", val);
      chrome.storage.local.set({ peroot_last_mode: val });
      showSaved();
    });
  });

  // Tone chips
  document.querySelectorAll("[data-tone-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.toneVal;
      setActive("tone-chips", "[data-tone-val]", "data-tone-val", val);
      chrome.storage.local.set({ peroot_last_tone: val });
      showSaved();
    });
  });

  // Language chips
  document.querySelectorAll("[data-lang-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.langVal;
      setActive("lang-chips", "[data-lang-val]", "data-lang-val", val);
      chrome.storage.local.set({ peroot_output_language: val });
      showSaved();
    });
  });

  // Inline button toggle
  document.getElementById("inline-btn-toggle")?.addEventListener("change", (e) => {
    chrome.storage.local.set({ peroot_inline_btn: e.target.checked });
    showSaved();
  });

  // Refresh config from server
  document.getElementById("peroot-refresh-config")?.addEventListener("click", () => {
    const status = document.getElementById("peroot-refresh-config-status");
    if (status) status.textContent = "מרענן…";
    chrome.runtime.sendMessage({ type: "REFRESH_CONFIG" }, (resp) => {
      if (chrome.runtime.lastError || !resp?.ok) {
        if (status) status.textContent = "שגיאה — נסה שוב";
      } else {
        if (status) status.textContent = "✓ עודכן מהשרת";
        showSaved();
      }
    });
  });
})();
