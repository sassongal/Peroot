/**
 * Peroot Extension — popup (v3)
 *
 * Screens: loading, login, main (שדרוג | ספרייה | היסטוריה). Preferences
 * come from lib/prefs.js (synced), language logic from lib/language.js,
 * stream parsing from lib/prompt-text.js, requests from lib/api.js.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const Prefs = self.PerootPrefs;
  const Lang = self.PerootLanguage;
  const Text = self.PerootPromptText;
  const Api = self.PerootApi;

  // ─── Theme, before first paint ───
  function applyTheme(theme) {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.setAttribute("data-theme", resolved);
  }
  Prefs.get("theme").then(applyTheme);
  Prefs.onChange((patch) => {
    if (patch.theme) applyTheme(patch.theme);
    if (patch.outputLanguage) setLanguageUI(patch.outputLanguage);
  });

  // ─── State ───
  const state = {
    me: null,
    prefs: { ...Prefs.DEFAULTS },
    targetModel: "general",
    modelProfiles: [],
    detectedSlug: null,
    host: "",
    lastRaw: "",
    lastEnhanced: "",
    lastInput: "",
    enhancing: false,
    abort: null,
    library: [],
    libraryFilter: "all",
    libraryLoaded: false,
    favorites: null,
    historyLoaded: false,
  };

  const el = {
    loading: $("loading-screen"),
    login: $("login-screen"),
    main: $("main-screen"),
    input: $("prompt-input"),
    count: $("char-count"),
    enhanceBtn: $("enhance-btn"),
    enhanceLabel: $("enhance-label"),
    enhanceSpinner: $("enhance-spinner"),
    result: $("result"),
    resultText: $("result-text"),
    resultMeta: $("result-meta"),
    error: $("error"),
    errorText: $("error-text"),
    tier: $("tier-chip"),
    credits: $("credits-readout"),
    site: $("site-badge"),
  };

  function show(screen) {
    for (const s of [el.loading, el.login, el.main]) s.classList.add("hidden");
    screen.classList.remove("hidden");
  }

  function isPro() {
    const t = state.me?.plan_tier;
    return t === "pro" || t === "premium" || t === "admin";
  }

  // ─── Boot ───
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      el.version = $("ext-version");
      el.version.textContent = `v${chrome.runtime.getManifest().version}`;
    } catch {
      /* ignore */
    }
    state.prefs = await Prefs.getAll();
    applyPrefsToUI();
    const auth = await checkAuth();
    if (auth.authenticated) await enterMain();
    else showLogin(auth.reason);
  });

  async function enterMain() {
    show(el.main);
    setTimeout(() => el.input.focus(), 60);
    await Promise.all([loadMe(), detectSite(), prefillSelection()]);
    loadWhatsNew();
    if (!state.prefs.onboarded) $("onboarding").classList.remove("hidden");
  }

  function showLogin(reason) {
    show(el.login);
    setLoginBusy(false);
    setHint(reason === "token_expired" ? "פג תוקף ההתחברות. התחברו שוב." : "", "");
  }

  // ─── Login ───
  function setHint(text, kind) {
    const h = $("login-hint");
    h.textContent = text;
    h.style.color = kind === "error" ? "var(--err-text)" : kind === "info" ? "var(--gold-text)" : "";
  }
  function setLoginBusy(busy, msg) {
    for (const id of ["google-login-btn", "email-login-btn", "email-input", "password-input"]) {
      $(id).disabled = busy;
    }
    if (msg) setHint(msg, "info");
  }
  $("google-login-btn").addEventListener("click", async () => {
    setLoginBusy(true, "פותח את ההתחברות עם Google...");
    try {
      await loginWithGoogle();
      await enterMain();
    } catch (err) {
      const m = String(err?.message || "");
      setHint(/cancel|closed/i.test(m) ? "ההתחברות בוטלה." : "ההתחברות נכשלה. נסו שוב.", "error");
      setLoginBusy(false);
    }
  });
  $("email-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email-input").value.trim();
    const password = $("password-input").value;
    if (!email || !password) return;
    setLoginBusy(true, "מתחבר...");
    try {
      await loginWithEmail(email, password);
      await enterMain();
    } catch (err) {
      const m = String(err?.message || "");
      setHint(
        m.includes("Invalid login")
          ? "אימייל או סיסמה שגויים."
          : m.includes("Email not confirmed")
            ? "האימייל עוד לא אומת. בדקו את תיבת הדואר."
            : "ההתחברות נכשלה. נסו שוב.",
        "error",
      );
      setLoginBusy(false);
    }
  });
  $("retry-btn").addEventListener("click", async () => {
    show(el.loading);
    const refreshed = await refreshAccessToken();
    if (!refreshed) await forceAuthSync();
    const auth = await checkAuth();
    if (auth.authenticated) await enterMain();
    else showLogin(auth.reason);
  });
  $("logout-btn").addEventListener("click", async () => {
    await clearAuth();
    chrome.runtime.sendMessage({ type: "REFRESH_BADGE" }, () => void chrome.runtime.lastError);
    state.me = null;
    state.libraryLoaded = false;
    state.historyLoaded = false;
    showLogin("no_token");
  });
  $("settings-btn").addEventListener("click", () => chrome.runtime.openOptionsPage());

  // ─── Account ───
  async function loadMe() {
    const res = await Api.me();
    if (res.status === 401) return showLogin("token_expired");
    if (!res.ok || !res.data) return;
    state.me = res.data;
    const tier = res.data.plan_tier || "free";
    el.tier.textContent = tier === "admin" ? "Admin" : tier === "free" ? "חינם" : "Pro";
    el.tier.className = `chip ${tier === "admin" ? "chip-admin" : tier === "free" ? "chip-muted" : "chip-pro"}`;
    el.tier.classList.remove("hidden");
    const n = Number(res.data.credits_balance ?? 0);
    if (tier === "admin") {
      el.credits.textContent = "∞";
      el.credits.className = "readout";
    } else {
      el.credits.textContent = tier === "pro" ? `${n} / חודש` : `${n} היום`;
      el.credits.className = `readout ${n <= 0 ? "empty" : n <= 1 ? "low" : ""}`;
    }
    el.credits.classList.remove("hidden");
    updateModeLocks();
    // The profile's preferred language follows the person into the extension.
    const adopted = await Prefs.adoptProfileLanguage(res.data.preferred_output_language);
    if (adopted) {
      state.prefs.outputLanguage = adopted;
      setLanguageUI(adopted);
    }
    chrome.runtime.sendMessage({ type: "REFRESH_BADGE" }, () => void chrome.runtime.lastError);
  }

  // ─── Site detection and target model ───
  const SITE_LABELS = {
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    grok: "Grok",
    copilot: "Copilot",
    poe: "Poe",
    deepseek: "DeepSeek",
    perplexity: "Perplexity",
    mistral: "Mistral",
  };
  function siteFromHost(host, path) {
    if (/chat\.openai\.com|chatgpt\.com/.test(host)) return "chatgpt";
    if (/claude\.ai/.test(host)) return "claude";
    if (/gemini\.google\.com/.test(host)) return "gemini";
    if (/grok\.com/.test(host) || (/x\.com/.test(host) && /\/i\/grok/.test(path))) return "grok";
    if (/copilot\.microsoft\.com/.test(host)) return "copilot";
    if (/poe\.com/.test(host)) return "poe";
    if (/chat\.deepseek\.com/.test(host)) return "deepseek";
    if (/perplexity\.ai/.test(host)) return "perplexity";
    if (/chat\.mistral\.ai/.test(host)) return "mistral";
    return "general";
  }
  /**
   * Map a hostname to the telemetry `site` enum (chatgpt|claude|gemini) or
   * undefined. The ingest schema rejects anything else, and a non-chat
   * hostname is browsing history that must never leave the browser.
   */
  function siteEnumFromHost(host) {
    if (!host) return undefined;
    if (/chat\.openai\.com|chatgpt\.com/.test(host)) return "chatgpt";
    if (/claude\.ai/.test(host)) return "claude";
    if (/gemini\.google\.com/.test(host)) return "gemini";
    return undefined;
  }
  async function detectSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url ? new URL(tab.url) : null;
      state.host = url?.hostname?.toLowerCase().replace(/^www\./, "") || "";
      const site = url ? siteFromHost(url.hostname, url.pathname) : "general";
      state.targetModel = site;
      if (site !== "general") {
        el.site.textContent = SITE_LABELS[site] || site;
        el.site.classList.remove("hidden");
      }
    } catch {
      /* no tab access */
    }
    // Model profiles from the server config (admin-managed), plus per-host override.
    const cfg = await new Promise((r) =>
      chrome.storage.local.get("peroot.extension_config", (d) => r(d?.["peroot.extension_config"] || null)),
    );
    const select = $("peroot-target-model-select");
    state.modelProfiles = Array.isArray(cfg?.model_profiles) ? cfg.model_profiles : [];
    for (const p of state.modelProfiles) {
      const opt = document.createElement("option");
      opt.value = p.slug;
      opt.textContent = p.display_name_he || p.displayNameHe || p.displayName || p.slug;
      select.appendChild(opt);
    }
    if (!state.host) {
      select.disabled = true;
      return;
    }
    const registry = cfg?.selectors || null;
    if (registry) {
      for (const k of Object.keys(registry)) {
        const hosts = (registry[k]?.hosts || []).map((h) => String(h).toLowerCase().replace(/^www\./, ""));
        if (hosts.includes(state.host)) state.detectedSlug = registry[k]?.profile_slug || null;
      }
    }
    const overrideKey = `peroot.target_model_override.${state.host}`;
    const override = await new Promise((r) => chrome.storage.local.get(overrideKey, (d) => r(d?.[overrideKey] || "")));
    select.value = override || "";
    if (state.detectedSlug) {
      const p = state.modelProfiles.find((x) => x.slug === state.detectedSlug);
      $("peroot-target-model-detected").textContent = p
        ? `זוהה: ${p.display_name_he || p.displayNameHe || p.displayName || p.slug}`
        : "";
    }
    select.addEventListener("change", () => {
      if (!select.value) chrome.storage.local.remove(overrideKey);
      else if (/^[a-z0-9_-]{1,64}$/.test(select.value)) chrome.storage.local.set({ [overrideKey]: select.value });
    });
  }
  function currentProfileSlug() {
    return $("peroot-target-model-select").value || state.detectedSlug || null;
  }

  // ─── Selected text on the page ───
  async function prefillSelection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString()?.trim() || "",
      });
      const text = results?.[0]?.result;
      if (text && text.length > 3 && !el.input.value) {
        el.input.value = text;
        onInput();
      }
    } catch {
      /* pages we cannot script */
    }
  }

  // ─── Preferences → UI ───
  function applyPrefsToUI() {
    setMode(state.prefs.mode, false);
    setActive("#tone-chips .chip-btn", "tone", state.prefs.tone);
    setActive("#image-platforms .chip-btn", "iplatform", state.prefs.imagePlatform);
    setActive("#video-platforms .chip-btn", "vplatform", state.prefs.videoPlatform);
    setLanguageUI(state.prefs.outputLanguage);
  }
  function setActive(selector, dataKey, value) {
    document.querySelectorAll(selector).forEach((b) => {
      const on = b.dataset[dataKey] === value;
      b.classList.toggle("active", on);
      if (b.getAttribute("role") === "radio") b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }
  function setLanguageUI(lang) {
    document.querySelectorAll("#lang-segmented .seg").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
  }
  function setMode(mode, persist = true) {
    if (mode !== "STANDARD" && state.me && !isPro()) {
      showError("המצבים המתקדמים פתוחים למנויי Pro.");
      return;
    }
    state.prefs.mode = mode;
    setActive("#mode-selector .mode", "mode", mode);
    $("image-platforms").classList.toggle("hidden", mode !== "IMAGE_GENERATION");
    $("video-platforms").classList.toggle("hidden", mode !== "VIDEO_GENERATION");
    if (persist) Prefs.set({ mode });
  }
  function updateModeLocks() {
    document.querySelectorAll("#mode-selector .mode").forEach((b) => {
      b.classList.toggle("locked", b.dataset.mode !== "STANDARD" && !isPro());
    });
    if (state.prefs.mode !== "STANDARD" && !isPro()) setMode("STANDARD");
  }
  document.querySelectorAll("#mode-selector .mode").forEach((b) => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  });
  document.querySelectorAll("#tone-chips .chip-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.prefs.tone = b.dataset.tone;
      setActive("#tone-chips .chip-btn", "tone", b.dataset.tone);
      Prefs.set({ tone: b.dataset.tone });
    });
  });
  document.querySelectorAll("#image-platforms .chip-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.prefs.imagePlatform = b.dataset.iplatform;
      setActive("#image-platforms .chip-btn", "iplatform", b.dataset.iplatform);
      Prefs.set({ imagePlatform: b.dataset.iplatform });
    });
  });
  document.querySelectorAll("#video-platforms .chip-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.prefs.videoPlatform = b.dataset.vplatform;
      setActive("#video-platforms .chip-btn", "vplatform", b.dataset.vplatform);
      Prefs.set({ videoPlatform: b.dataset.vplatform });
    });
  });
  document.querySelectorAll("#lang-segmented .seg").forEach((b) => {
    b.addEventListener("click", () => {
      state.prefs.outputLanguage = b.dataset.lang;
      setLanguageUI(b.dataset.lang);
      // A choice made here wins over the profile until the profile changes again.
      Prefs.set({ outputLanguage: b.dataset.lang, languageFromProfile: false });
    });
  });

  // ─── Tabs ───
  const tabs = Array.from(document.querySelectorAll(".tab"));
  function activateTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = true));
    $(`tab-${tab.dataset.tab}`).hidden = false;
    if (tab.dataset.tab === "library" && !state.libraryLoaded) loadLibrary();
    if (tab.dataset.tab === "history" && !state.historyLoaded) loadHistory();
  }
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(tab);
      let next = -1;
      if (e.key === "ArrowRight") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i + 1) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next >= 0) {
        e.preventDefault();
        activateTab(tabs[next]);
        tabs[next].focus();
      }
    });
  });

  // ─── Input and readiness meter ───
  // Four-language cue lexicon: is there a role, a task, an audience or goal,
  // a format or constraint? Small on purpose; it is a nudge, not a score.
  const CUES = {
    role: /\b(you are|act as|as an?|expert|specialist)\b|אתה |את |אתם |מומחה|יועץ|בתפקיד|أنت |خبير|بصفتك|ты |вы |эксперт|в роли/i,
    task: /\b(write|create|build|draft|generate|analy[sz]e|summari[sz]e|explain|plan|design)\b|כתוב|כתבי|תכתוב|צור|בנה|נסח|הכן|ערוך|סכם|נתח|הסבר|תכנן|اكتب|أنشئ|صمم|لخص|حلل|اشرح|напиши|создай|составь|подготовь|объясни|проанализируй/i,
    context: /\b(for|audience|goal|so that|target|customers?|students?)\b|עבור|לקהל|קהל|מטרה|כדי ש|לקוחות|תלמידים|لجمهور|الهدف|للعملاء|للطلاب|для|аудитор|цель|клиент|учеников/i,
    format: /\b(format|table|list|bullets?|json|markdown|words|paragraphs?|tone|style|don'?t|avoid|without)\b|פורמט|טבלה|רשימה|נקודות|מילים|פסקאות|טון|סגנון|בלי|אל ת|ללא|بصيغة|جدول|قائمة|نقاط|كلمات|نبرة|بدون|формат|таблиц|список|слов|абзац|тон|стиль|без|не /i,
  };
  function readiness(text) {
    const t = String(text || "").trim();
    const words = t ? t.split(/\s+/).length : 0;
    if (words < 2) return null;
    let score = Math.min(30, words * 2);
    const missing = [];
    for (const [k, re] of Object.entries(CUES)) {
      if (re.test(t)) score += 17;
      else missing.push(k);
    }
    score = Math.min(100, score);
    const tipFor = { role: "מי המודל צריך להיות?", task: "מה בדיוק לעשות?", context: "למי ולמה?", format: "באיזה פורמט ובאיזה אורך?" };
    const label = score < 35 ? "רזה" : score < 65 ? "סביר" : score < 85 ? "טוב" : "מפורט";
    return { score, label, tip: missing.length ? `חסר: ${tipFor[missing[0]]}` : "יש הכול. השדרוג ידייק ויארגן." };
  }
  let meterTimer = null;
  function onInput() {
    const len = el.input.value.length;
    el.count.textContent = String(len);
    el.count.className = `counter readout ${len > 3500 ? "danger" : len > 2500 ? "warn" : ""}`;
    clearTimeout(meterTimer);
    meterTimer = setTimeout(() => {
      const r = readiness(el.input.value);
      const box = $("readiness");
      if (!r) return box.classList.add("hidden");
      box.classList.remove("hidden");
      $("readiness-fill").style.width = `${r.score}%`;
      $("readiness-fill").style.background = r.score < 35 ? "var(--err)" : r.score < 65 ? "var(--gold)" : "var(--ok)";
      $("readiness-label").textContent = r.label;
      $("readiness-tip").textContent = r.tip;
    }, 250);
  }
  el.input.addEventListener("input", onInput);
  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doEnhance();
    }
    if (e.key === "Escape" && state.enhancing) state.abort?.abort();
  });
  el.enhanceBtn.addEventListener("click", () => (state.enhancing ? state.abort?.abort() : doEnhance()));

  // ─── Enhance ───
  function buildBody(text, extra = {}) {
    const mode = state.prefs.mode;
    const lang = Lang.resolveOutputLanguage(state.prefs.outputLanguage, text);
    const slug = currentProfileSlug();
    return {
      prompt: text,
      tone: state.prefs.tone,
      category: "כללי",
      capability_mode: mode,
      target_model: ["chatgpt", "claude", "gemini"].includes(state.targetModel) ? state.targetModel : "general",
      ...(slug && { model_profile_slug: slug }),
      ...(lang && { output_language: lang }),
      ...(mode === "IMAGE_GENERATION" && { mode_params: { image_platform: state.prefs.imagePlatform } }),
      ...(mode === "VIDEO_GENERATION" && { mode_params: { video_platform: state.prefs.videoPlatform } }),
      ...extra,
    };
  }
  function setBusy(on, label) {
    state.enhancing = on;
    el.enhanceLabel.textContent = label || (on ? "עצירה" : "שדרוג");
    el.enhanceSpinner.classList.toggle("hidden", !on);
    el.enhanceBtn.classList.toggle("btn-secondary", on);
    el.enhanceBtn.classList.toggle("btn-primary", !on);
  }
  function isJsonMode() {
    return state.prefs.mode === "IMAGE_GENERATION" && ["stable-diffusion", "nanobanana"].includes(state.prefs.imagePlatform);
  }
  async function runStream(body, onFinishLabel) {
    hideError();
    $("feedback-row").classList.add("hidden");
    $("refine").classList.add("hidden");
    el.result.classList.remove("hidden");
    el.resultText.textContent = "";
    el.resultText.classList.add("streaming");
    el.resultMeta.textContent = "0.0s";
    const started = Date.now();
    const timer = setInterval(() => (el.resultMeta.textContent = `${((Date.now() - started) / 1000).toFixed(1)}s`), 100);
    state.abort = new AbortController();
    setBusy(true);
    const res = await Api.streamEnhance(body, {
      signal: state.abort.signal,
      onChunk: (full) => {
        el.resultText.textContent = Text.cleanForDisplay(full, { json: isJsonMode() });
        el.resultText.scrollTop = el.resultText.scrollHeight;
      },
    });
    clearInterval(timer);
    el.resultText.classList.remove("streaming");
    setBusy(false);
    if (!res.ok) {
      if (res.aborted) {
        el.resultMeta.textContent = "נעצר";
        return null;
      }
      el.result.classList.add("hidden");
      if (res.status === 401) return showLogin("token_expired");
      showError(res.error);
      return null;
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const cached = res.headers?.get?.("X-Peroot-Cache");
    el.resultMeta.textContent = cached === "score-gate" ? "כבר חזק, בלי AI" : cached === "hit" ? `${seconds}s · מטמון` : `${seconds}s`;
    state.lastRaw = res.text;
    state.lastEnhanced = Text.cleanForDisplay(res.text, { json: isJsonMode() });
    el.resultText.textContent = state.lastEnhanced;
    el.resultText.dir = Lang.textDirection(state.lastEnhanced);
    showQuestions(Text.parseGeniusQuestions(res.text));
    resetFeedback();
    try {
      await navigator.clipboard.writeText(state.lastEnhanced);
      flash($("copy-btn"), "הועתק");
    } catch {
      /* clipboard denied */
    }
    state.historyLoaded = false;
    loadMe();
    if (onFinishLabel) {
      // The ingest schema takes site as an enum key and rejects null values
      // (.optional() means absent, not null) — the raw hostname 400'd every
      // popup beacon. And a non-chat hostname is the user's browsing history:
      // never send it (review 2026-09-04).
      const payload = {};
      const tm = currentProfileSlug();
      if (tm) payload.target_model = tm;
      const siteKey = siteEnumFromHost(state.host);
      if (siteKey) payload.site = siteKey;
      Api.telemetry(onFinishLabel, payload);
    }
    return res;
  }
  async function doEnhance() {
    const text = el.input.value.trim();
    if (!text || state.enhancing) return;
    state.lastInput = text;
    await runStream(buildBody(text), "popup_enhance");
  }
  async function refine(question, answer, key) {
    if (state.enhancing || !state.lastEnhanced) return;
    await runStream(
      buildBody(state.lastInput || el.input.value, {
        previousResult: state.lastEnhanced,
        refinementInstruction: `שאלה: ${question}\nתשובה: ${answer}`,
        answers: { [key || question.slice(0, 50)]: answer },
      }),
    );
  }
  function showQuestions(questions) {
    const box = $("refine");
    const list = $("refine-questions");
    list.innerHTML = "";
    const top = [...(questions || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 3);
    if (!top.length) return box.classList.add("hidden");
    for (const q of top) {
      const item = document.createElement("div");
      item.className = "refine-q";
      const t = document.createElement("span");
      t.className = "refine-q-text";
      t.textContent = q.question;
      item.appendChild(t);
      const ex = document.createElement("div");
      ex.className = "refine-examples";
      for (const example of (q.examples || []).slice(0, 3)) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "refine-chip";
        b.textContent = example;
        b.addEventListener("click", () => refine(q.question, example, String(q.id || "")));
        ex.appendChild(b);
      }
      item.appendChild(ex);
      list.appendChild(item);
    }
    box.classList.remove("hidden");
  }

  // ─── Result actions ───
  function flash(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.classList.add("success");
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove("success");
    }, 1200);
  }
  $("copy-btn").addEventListener("click", async () => {
    if (!state.lastEnhanced) return;
    await navigator.clipboard.writeText(state.lastEnhanced);
    flash($("copy-btn"), "הועתק");
  });
  $("insert-btn").addEventListener("click", async () => {
    if (!state.lastEnhanced) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.runtime.sendMessage({ type: "INJECT_AND_INSERT", tabId: tab.id, text: state.lastEnhanced }, (r) => {
      void chrome.runtime.lastError;
      flash($("insert-btn"), r?.ok ? "הוכנס" : "לא ניתן כאן");
    });
  });
  $("reuse-btn").addEventListener("click", () => {
    if (!state.lastEnhanced) return;
    el.input.value = state.lastEnhanced;
    onInput();
    el.result.classList.add("hidden");
    el.input.focus();
  });
  $("save-btn").addEventListener("click", async () => {
    if (!state.lastEnhanced) return;
    const res = await Api.saveToLibrary({
      title: Text.parseTitle(state.lastRaw) || state.lastInput.slice(0, 60) || "פרומפט משודרג",
      prompt: state.lastEnhanced,
      category: "כללי",
      source: "extension",
    });
    flash($("save-btn"), res.ok ? "נשמר" : "לא נשמר");
    if (res.ok) state.libraryLoaded = false;
  });
  function resetFeedback() {
    const row = $("feedback-row");
    row.classList.remove("hidden");
    for (const id of ["feedback-up", "feedback-down"]) {
      $(id).disabled = false;
      $(id).classList.remove("voted");
    }
  }
  async function sendFeedback(rating, btn) {
    $("feedback-up").disabled = true;
    $("feedback-down").disabled = true;
    btn.classList.add("voted");
    Api.feedback({
      rating,
      input_text: state.lastInput.slice(0, 10000),
      enhanced_text: state.lastEnhanced.slice(0, 50000),
      capability_mode: state.prefs.mode,
    });
  }
  $("feedback-up").addEventListener("click", (e) => sendFeedback(1, e.currentTarget));
  $("feedback-down").addEventListener("click", (e) => sendFeedback(-1, e.currentTarget));

  function showError(msg) {
    el.error.classList.remove("hidden");
    el.errorText.textContent = msg;
  }
  function hideError() {
    el.error.classList.add("hidden");
  }

  // ─── Library ───
  async function loadLibrary() {
    const [lib, fav] = await Promise.all([Api.library(), Api.favorites()]);
    $("library-loading").classList.add("hidden");
    if (lib.status === 401) return showLogin("token_expired");
    const items = lib.data?.items || (Array.isArray(lib.data) ? lib.data : []);
    const favorites = fav.data?.favorites || fav.data?.items || (Array.isArray(fav.data) ? fav.data : []);
    state.library = items;
    state.favorites = favorites;
    state.libraryLoaded = lib.ok;
    renderLibrary();
  }
  function renderLibrary() {
    const q = $("library-search").value.trim().toLowerCase();
    const source = state.libraryFilter === "favorites" ? state.favorites || [] : state.library;
    const items = q
      ? source.filter((p) => `${p.title || ""} ${p.prompt || ""}`.toLowerCase().includes(q))
      : source;
    const list = $("library-list");
    const empty = $("library-empty");
    list.innerHTML = "";
    if (!items.length) {
      empty.classList.remove("hidden");
      list.classList.add("hidden");
      $("library-empty").querySelector(".empty-title").textContent =
        state.libraryFilter === "favorites" ? "אין מועדפים" : q ? "אין תוצאות" : "הספרייה ריקה";
      return;
    }
    empty.classList.add("hidden");
    list.classList.remove("hidden");
    for (const item of items.slice(0, 60)) list.appendChild(card(item, item.personal_category || item.category || ""));
  }
  $("library-search").addEventListener("input", renderLibrary);
  document.querySelectorAll("#library-filter .seg").forEach((b) => {
    b.addEventListener("click", () => {
      state.libraryFilter = b.dataset.filter;
      document.querySelectorAll("#library-filter .seg").forEach((x) => x.classList.toggle("active", x === b));
      renderLibrary();
    });
  });

  // ─── History ───
  async function loadHistory() {
    const res = await Api.history();
    $("history-loading").classList.add("hidden");
    if (res.status === 401) return showLogin("token_expired");
    const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
    state.historyLoaded = res.ok;
    const list = $("history-list");
    list.innerHTML = "";
    if (!items.length) return $("history-empty").classList.remove("hidden");
    $("history-empty").classList.add("hidden");
    list.classList.remove("hidden");
    for (const item of items.slice(0, 30)) {
      list.appendChild(
        card(
          { title: item.title || (item.prompt || "").slice(0, 50), prompt: item.enhanced_prompt || item.prompt || "" },
          timeAgo(new Date(item.created_at).getTime()),
        ),
      );
    }
  }
  function timeAgo(ts) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "עכשיו";
    if (mins < 60) return `לפני ${mins} דק'`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `לפני ${h} שע'`;
    const d = Math.floor(h / 24);
    return d === 1 ? "אתמול" : `לפני ${d} ימים`;
  }
  function card(item, meta) {
    const c = document.createElement("div");
    c.className = "card";
    const head = document.createElement("div");
    head.className = "card-head";
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = item.title || "ללא כותרת";
    const m = document.createElement("span");
    m.className = "card-meta";
    m.textContent = meta || "";
    head.append(title, m);
    const text = document.createElement("div");
    text.className = "card-text";
    text.textContent = item.prompt || "";
    text.dir = Lang.textDirection(item.prompt || "");
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const use = document.createElement("button");
    use.type = "button";
    use.className = "btn btn-sm";
    use.textContent = "הכנסה לשדה";
    use.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.runtime.sendMessage({ type: "INJECT_AND_INSERT", tabId: tab.id, text: item.prompt }, (r) => {
          void chrome.runtime.lastError;
          flash(use, r?.ok ? "הוכנס" : "לא ניתן כאן");
        });
      }
    });
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-sm";
    edit.textContent = "לשדרוג";
    edit.addEventListener("click", () => {
      el.input.value = item.prompt || "";
      onInput();
      activateTab(tabs[0]);
      el.input.focus();
    });
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn btn-sm";
    copy.textContent = "העתקה";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.prompt || "");
      flash(copy, "הועתק");
    });
    actions.append(use, edit, copy);
    c.append(head, text, actions);
    return c;
  }

  // ─── What's new ───
  async function loadWhatsNew() {
    const res = await Api.announcements();
    const items = (res.data || []).filter((a) => !a.lang || a.lang === "he");
    const pick = items.find((a) => a.audience === "all" || a.audience === "users" || (a.audience === "pro" && isPro()));
    if (!pick) return;
    const link = $("whats-new");
    $("whats-new-text").textContent = pick.title;
    if (pick.href) link.href = pick.href.startsWith("http") ? pick.href : `${Api.SITE_URL}${pick.href}`;
    link.classList.remove("hidden");
  }

  // ─── Onboarding ───
  $("onboarding-done").addEventListener("click", () => {
    $("onboarding").classList.add("hidden");
    Prefs.set({ onboarded: true });
    el.input.focus();
  });
})();
