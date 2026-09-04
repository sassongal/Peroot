/**
 * Peroot Extension — options page (v3). Every control writes through
 * lib/prefs.js, so the popup and the content scripts see the change at once.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const Prefs = self.PerootPrefs;
  const Api = self.PerootApi;

  function applyTheme(theme) {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.setAttribute("data-theme", resolved);
  }
  function setActive(selector, attr, value) {
    document.querySelectorAll(selector).forEach((b) => b.classList.toggle("active", b.dataset[attr] === value));
  }
  let savedTimer = null;
  function saved(message) {
    const b = $("save-banner");
    if (message) {
      b.dataset.defaultText ??= b.textContent;
      b.textContent = message;
    } else if (b.dataset.defaultText) {
      b.textContent = b.dataset.defaultText;
    }
    b.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => b.classList.remove("show"), 1600);
  }
  function setSwitch(id, on) {
    $(id).setAttribute("aria-checked", on ? "true" : "false");
  }

  async function init() {
    const prefs = await Prefs.getAll();
    applyTheme(prefs.theme);
    setActive("#theme-chips .seg", "themeVal", prefs.theme);
    setActive("#lang-chips .seg", "lang", prefs.outputLanguage);
    setActive("#mode-chips .chip-btn", "mode", prefs.mode);
    setActive("#tone-chips .chip-btn", "tone", prefs.tone);
    setSwitch("inline-toggle", prefs.inlineToolbar);
    setSwitch("profile-lang-toggle", prefs.languageFromProfile);
    try {
      $("version-badge").textContent = `v${chrome.runtime.getManifest().version}`;
    } catch {
      /* ignore */
    }
    loadAccount();
    loadNews();
  }

  // Mirrors the popup's Pro gate: free accounts stay on STANDARD. The server
  // enforces this anyway (403 pro_required), but without the client gate the
  // 403 surfaced as "נגמרו הקרדיטים" — a billing message for a tier limit.
  let accountTier = null;
  async function loadAccount() {
    const auth = await checkAuth();
    if (!auth.authenticated) return;
    const res = await Api.me();
    if (!res.ok || !res.data) return;
    const me = res.data;
    accountTier = me.plan_tier || "free";
    const name = me.display_name || me.email || "";
    $("account-name").textContent = name;
    $("account-avatar").textContent = (name || "?").trim()[0]?.toUpperCase() || "?";
    const tier = me.plan_tier === "admin" ? "מנהל" : me.plan_tier === "pro" ? "Pro" : "חינם";
    $("account-meta").textContent = `${me.email || ""} · ${tier}`;
    $("logout-btn").classList.remove("hidden");
  }
  $("logout-btn").addEventListener("click", async () => {
    await clearAuth();
    chrome.runtime.sendMessage({ type: "REFRESH_BADGE" }, () => void chrome.runtime.lastError);
    $("account-name").textContent = "לא מחוברים";
    $("account-meta").textContent = "פתחו את התוסף מסרגל הכלים כדי להתחבר";
    $("account-avatar").textContent = "?";
    $("logout-btn").classList.add("hidden");
    saved();
  });

  async function loadNews() {
    const res = await Api.announcements();
    const list = $("news-list");
    list.innerHTML = "";
    const items = (res.data || []).filter((a) => !a.lang || a.lang === "he").slice(0, 4);
    if (!items.length) {
      list.innerHTML = '<div class="row"><div class="row-desc">אין עדכונים כרגע</div></div>';
      return;
    }
    for (const a of items) {
      const row = document.createElement("div");
      row.className = "row";
      const news = document.createElement("div");
      news.className = "news";
      const t = document.createElement("div");
      t.className = "news-title";
      t.textContent = a.title;
      const b = document.createElement("div");
      b.className = "news-body";
      b.textContent = a.body || "";
      news.append(t, b);
      row.appendChild(news);
      if (a.href) {
        const link = document.createElement("a");
        link.className = "btn btn-sm";
        link.href = a.href.startsWith("http") ? a.href : `${Api.SITE_URL}${a.href}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = a.href_label || "פרטים";
        row.appendChild(link);
      }
      list.appendChild(row);
    }
  }

  document.querySelectorAll("#theme-chips .seg").forEach((b) => {
    b.addEventListener("click", async () => {
      await Prefs.set({ theme: b.dataset.themeVal });
      setActive("#theme-chips .seg", "themeVal", b.dataset.themeVal);
      applyTheme(b.dataset.themeVal);
      saved();
    });
  });
  document.querySelectorAll("#lang-chips .seg").forEach((b) => {
    b.addEventListener("click", async () => {
      await Prefs.set({ outputLanguage: b.dataset.lang, languageFromProfile: false });
      setActive("#lang-chips .seg", "lang", b.dataset.lang);
      setSwitch("profile-lang-toggle", false);
      saved();
    });
  });
  document.querySelectorAll("#mode-chips .chip-btn").forEach((b) => {
    b.addEventListener("click", async () => {
      if (b.dataset.mode !== "STANDARD" && accountTier && accountTier === "free") {
        saved("המצבים המתקדמים פתוחים למנויי Pro");
        return;
      }
      await Prefs.set({ mode: b.dataset.mode });
      setActive("#mode-chips .chip-btn", "mode", b.dataset.mode);
      saved();
    });
  });
  document.querySelectorAll("#tone-chips .chip-btn").forEach((b) => {
    b.addEventListener("click", async () => {
      await Prefs.set({ tone: b.dataset.tone });
      setActive("#tone-chips .chip-btn", "tone", b.dataset.tone);
      saved();
    });
  });
  $("inline-toggle").addEventListener("click", async (e) => {
    const on = e.currentTarget.getAttribute("aria-checked") !== "true";
    setSwitch("inline-toggle", on);
    await Prefs.set({ inlineToolbar: on });
    saved();
  });
  $("profile-lang-toggle").addEventListener("click", async (e) => {
    const on = e.currentTarget.getAttribute("aria-checked") !== "true";
    setSwitch("profile-lang-toggle", on);
    await Prefs.set({ languageFromProfile: on });
    saved();
  });
  $("refresh-config").addEventListener("click", () => {
    const status = $("refresh-status");
    status.textContent = "מרענן...";
    chrome.runtime.sendMessage({ type: "REFRESH_CONFIG" }, (resp) => {
      status.textContent = chrome.runtime.lastError || !resp?.ok ? "לא הצליח, נסו שוב" : "עודכן מהשרת";
      if (resp?.ok) saved();
    });
  });

  document.addEventListener("DOMContentLoaded", init);
})();
