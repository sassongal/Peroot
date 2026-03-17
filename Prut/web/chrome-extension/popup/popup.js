/**
 * Peroot Extension v2.2 - Popup
 * Tabs: Enhance | Library | Snippets | Settings
 */

const API_BASE = "https://peroot.space";
const MAX_HISTORY = 8;

// ─── SVG Icons (Lucide-style) ───
const ICONS = {
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>',
  bookOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M8 21h8"/></svg>',
  reuse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1110.34 18"/><path d="M7 6h1v4"/></svg>',
};

const DEFAULT_SNIPPETS = [
  { id: "s1", label: "מייל מקצועי", prompt: "כתוב מייל מקצועי קצר ובהיר", icon: "✉️" },
  { id: "s2", label: "פוסט לינקדאין", prompt: "כתוב פוסט מקצועי ומעורר לדיון ללינקדאין", icon: "💼" },
  { id: "s3", label: "תיאור מוצר", prompt: "כתוב תיאור מוצר משכנע ומכירתי", icon: "🛒" },
  { id: "s4", label: "סיכום פגישה", prompt: "סכם את הפגישה עם נקודות עיקריות ומשימות", icon: "📋" },
  { id: "s5", label: "בדיקת קוד", prompt: "בצע Code Review מקצועי לקוד הבא", icon: "💻" },
  { id: "s6", label: "תגובה ללקוח", prompt: "כתוב תגובה מקצועית ואמפתית ללקוח", icon: "💬" },
  { id: "s7", label: "פוסט אינסטגרם", prompt: "כתוב כיתוב קצר ומעניין לפוסט אינסטגרם", icon: "📸" },
  { id: "s8", label: "הצעת מחיר", prompt: "כתוב הצעת מחיר מקצועית ומשכנעת", icon: "💰" },
];

// ─── DOM ───
const $ = (id) => document.getElementById(id);
const loginScreen = $("login-screen");
const mainScreen = $("main-screen");
const loadingScreen = $("loading-screen");
const loginBtn = $("login-btn");
const loginHint = $("login-hint");
const promptInput = $("prompt-input");
const charCount = $("char-count");
const toneSelect = $("tone-select");
const enhanceBtn = $("enhance-btn");
const enhanceLabel = $("enhance-label");
const enhanceSpinner = $("enhance-spinner");
const resultSection = $("result-section");
const resultTimer = $("result-timer");
const resultText = $("result-text");
const copyBtn = $("copy-btn");
const insertBtn = $("insert-btn");
const reuseBtn = $("reuse-btn");
const errorSection = $("error-section");
const errorText = $("error-text");
const tierBadge = $("tier-badge");
const creditsBadge = $("credits-badge");
const creditsCount = $("credits-count");
const historySection = $("history-section");
const historyList = $("history-list");
const clearHistoryBtn = $("clear-history");
const headerGreeting = $("header-greeting");

let lastEnhanced = "";
let isEnhancing = false;
let timerInterval = null;
let snippetsRendered = false;

// Library state
let libraryCache = { personal: null, favorites: null, public: null };
let currentLibrarySource = "personal";

// ═══ INIT ═══
document.addEventListener("DOMContentLoaded", async () => {
  injectTabIcons();
  injectActionIcons();

  const stored = await chrome.storage.local.get(["defaultTone", "tone", "autoEnhance", "language"]);
  const defaultTone = stored.defaultTone || stored.tone || "Professional";
  toneSelect.value = defaultTone;

  // Settings defaults
  const defaultToneSelect = $("default-tone-select");
  if (defaultToneSelect) defaultToneSelect.value = defaultTone;
  const autoEnhanceToggle = $("auto-enhance-toggle");
  if (autoEnhanceToggle) autoEnhanceToggle.checked = !!stored.autoEnhance;
  const languageSelect = $("language-select");
  if (languageSelect) languageSelect.value = stored.language || "he";

  const auth = await checkAuth();

  if (auth.authenticated) {
    show(mainScreen);
    loadHistory();
    setTimeout(() => promptInput.focus(), 80);
    fetchCredits();
    detectSelectedText();
  } else {
    showLoginScreen(auth.reason);
  }
});

function show(screen) {
  loadingScreen.classList.add("hidden");
  loginScreen.classList.add("hidden");
  mainScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function showLoginScreen(reason) {
  show(loginScreen);
  if (reason === "token_expired") {
    if (loginHint) {
      loginHint.textContent = "פג תוקף ההתחברות. התחבר שוב כדי להמשיך.";
      loginHint.style.color = "#fbbf24";
    }
  } else {
    if (loginHint) {
      loginHint.textContent = "התחבר ל-peroot.space ואז פתח שוב את התוסף";
      loginHint.style.color = "";
    }
  }
}

// ═══ ICONS INJECTION ═══
function injectTabIcons() {
  const tabIcons = {
    enhance: ICONS.sparkles,
    library: ICONS.bookOpen,
    snippets: ICONS.zap,
    settings: ICONS.settings,
  };
  document.querySelectorAll(".tab").forEach((tab) => {
    const key = tab.dataset.tab;
    const iconEl = tab.querySelector(".tab-icon");
    if (iconEl && tabIcons[key]) iconEl.innerHTML = tabIcons[key];
  });
}

function injectActionIcons() {
  const iconMap = { copy: ICONS.copy, insert: ICONS.insert, reuse: ICONS.reuse };
  document.querySelectorAll(".btn-icon[data-icon]").forEach((el) => {
    const key = el.dataset.icon;
    if (iconMap[key]) el.innerHTML = iconMap[key];
  });
  // Credits icon
  const creditsIcon = document.querySelector(".credits-icon");
  if (creditsIcon) creditsIcon.innerHTML = ICONS.coins;
}

// ═══ TOAST ═══
function toast(msg, type = "default") {
  const container = $("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), 200);
  }, 2000);
}

// ═══ CREDITS + USER NAME ═══
async function fetchCredits() {
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization"]) return;
    const res = await fetch(`${API_BASE}/api/me`, { headers });
    if (res.ok) {
      const user = await res.json();

      // Greeting
      const displayName = user.display_name || "";
      const firstName = displayName.split(" ")[0];
      if (firstName) {
        headerGreeting.textContent = `היי, ${firstName}`;
      }

      // Tier badge
      const tier = user.plan_tier || "free";
      const tierLabels = { free: "FREE", pro: "PRO", admin: "ADMIN" };
      tierBadge.textContent = tierLabels[tier] || tier.toUpperCase();
      tierBadge.className = `tier-badge tier-${tier}`;
      tierBadge.classList.remove("hidden");

      // Credits
      if (user.credits_balance != null) {
        creditsCount.textContent = user.credits_balance;
        creditsBadge.classList.remove("hidden");

        if (tier === "admin") {
          creditsBadge.style.borderColor = "rgba(192,132,252,0.2)";
          creditsBadge.style.color = "#c084fc";
          creditsBadge.style.background = "rgba(192,132,252,0.08)";
        } else if (user.credits_balance <= 0) {
          creditsBadge.style.borderColor = "rgba(239,68,68,0.3)";
          creditsBadge.style.color = "#fca5a5";
          creditsBadge.style.background = "rgba(239,68,68,0.08)";
        } else if (user.credits_balance <= 2) {
          creditsBadge.style.borderColor = "rgba(251,191,36,0.15)";
          creditsBadge.style.color = "#fbbf24";
          creditsBadge.style.background = "rgba(251,191,36,0.08)";
        } else {
          creditsBadge.style.borderColor = "rgba(52,211,153,0.2)";
          creditsBadge.style.color = "#34d399";
          creditsBadge.style.background = "rgba(52,211,153,0.08)";
        }
      }
    } else if (res.status === 401) {
      showLoginScreen("token_expired");
    }
  } catch {
    // Not critical
  }
}

// ═══ TABS ═══
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    $(`tab-${target}`).classList.add("active");

    if (target === "library" && !libraryCache[currentLibrarySource]) loadLibrary(currentLibrarySource);
    if (target === "snippets" && !snippetsRendered) renderSnippets();
  });
});

// ═══ LOGIN ═══
loginBtn.addEventListener("click", async () => {
  await openLoginTab();
  window.close();
});

// ═══ INPUT ═══
promptInput.addEventListener("input", () => {
  updateCharCount();
});

toneSelect.addEventListener("change", () => {
  chrome.storage.local.set({ defaultTone: toneSelect.value });
});

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    doEnhance();
  }
});

enhanceBtn.addEventListener("click", doEnhance);

// ═══ ENHANCE (with CSRF fix) ═══
async function ensureAuthHeaders(extraHeaders = {}) {
  const headers = await getAuthHeaders(extraHeaders);
  if (!headers["Authorization"]) {
    // Token missing — try refresh
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
    } else {
      return null; // Signal re-login needed
    }
  }
  return headers;
}

async function doEnhance() {
  const text = promptInput.value.trim();
  if (!text || isEnhancing) return;

  isEnhancing = true;
  hideError();
  resultSection.classList.add("hidden");
  setLoading(true);

  const startTime = Date.now();
  resultTimer.textContent = "0.0s";
  timerInterval = setInterval(() => {
    resultTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
  }, 100);

  resultSection.classList.remove("hidden");
  resultText.textContent = "";
  resultText.classList.add("streaming");

  try {
    const headers = await ensureAuthHeaders({ "Content-Type": "application/json" });
    if (!headers) {
      resultSection.classList.add("hidden");
      showError("פג תוקף ההתחברות. יש להתחבר מחדש.");
      showLoginScreen("token_expired");
      return;
    }

    const res = await fetch(`${API_BASE}/api/enhance`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: text,
        tone: toneSelect.value,
        category: "General",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      resultSection.classList.add("hidden");
      if (res.status === 403) showError(err.error || "אין מספיק קרדיטים");
      else if (res.status === 429) showError("יותר מדי בקשות. נסה שוב בעוד כמה דקות.");
      else if (res.status === 401) {
        showError("פג תוקף ההתחברות. מנסה להתחבר מחדש...");
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          hideError();
          isEnhancing = false;
          clearInterval(timerInterval);
          setLoading(false);
          doEnhance();
          return;
        }
        showLoginScreen("token_expired");
      } else showError(err.error || "שגיאה בשדרוג");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      const display = fullText.split("[GENIUS_QUESTIONS]")[0].trim();
      resultText.textContent = display;
      resultText.scrollTop = resultText.scrollHeight;
    }

    resultText.classList.remove("streaming");
    lastEnhanced = fullText.split("[GENIUS_QUESTIONS]")[0].trim();

    saveToHistory(text, lastEnhanced);
    syncToWebsite(text, lastEnhanced);
    fetchCredits();
  } catch {
    resultSection.classList.add("hidden");
    showError("שגיאת רשת. בדוק את החיבור.");
  } finally {
    isEnhancing = false;
    clearInterval(timerInterval);
    setLoading(false);
  }
}

function setLoading(on) {
  enhanceBtn.disabled = on;
  enhanceLabel.classList.toggle("hidden", on);
  enhanceSpinner.classList.toggle("hidden", !on);
}

// ═══ ERROR ═══
function showError(msg) {
  errorSection.classList.remove("hidden");
  errorText.textContent = msg;
}
function hideError() {
  errorSection.classList.add("hidden");
}

// ═══ RESULT ACTIONS ═══
copyBtn.addEventListener("click", async () => {
  if (!lastEnhanced) return;
  await navigator.clipboard.writeText(lastEnhanced);
  toast("הועתק!", "success");
});

insertBtn.addEventListener("click", async () => {
  if (!lastEnhanced) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.runtime.sendMessage(
      { type: "INJECT_AND_INSERT", tabId: tab.id, text: lastEnhanced },
      () => toast("הוכנס!", "success")
    );
  }
});

reuseBtn.addEventListener("click", () => {
  if (!lastEnhanced) return;
  promptInput.value = lastEnhanced;
  updateCharCount();
  resultSection.classList.add("hidden");
  promptInput.focus();
});

// ═══ SYNC TO WEBSITE (with CSRF fix) ═══
async function syncToWebsite(original, enhanced) {
  try {
    const headers = await ensureAuthHeaders({ "Content-Type": "application/json" });
    if (!headers) return; // Can't sync without auth — non-critical
    await fetch(`${API_BASE}/api/history`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: original,
        enhanced_prompt: enhanced,
        tone: toneSelect.value,
        category: "General",
        title: `[תוסף] ${original.substring(0, 50)}${original.length > 50 ? "..." : ""}`,
        source: "extension",
      }),
    });
  } catch {
    // Non-critical
  }
}

// ═══ LIBRARY ═══
// Sub-tab switching
document.querySelectorAll(".library-sub-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".library-sub-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentLibrarySource = tab.dataset.source;
    if (libraryCache[currentLibrarySource]) {
      renderLibraryItems(libraryCache[currentLibrarySource]);
    } else {
      loadLibrary(currentLibrarySource);
    }
  });
});

// Search
const librarySearch = $("library-search");
if (librarySearch) {
  librarySearch.addEventListener("input", () => {
    const items = libraryCache[currentLibrarySource];
    if (!items) return;
    renderLibraryItems(items);
  });
}

async function loadLibrary(source) {
  const loading = $("library-loading");
  const empty = $("library-empty");
  const list = $("library-list");

  loading.classList.remove("hidden");
  empty.classList.add("hidden");
  list.classList.add("hidden");

  try {
    let endpoint;
    let needsAuth = true;
    if (source === "personal") endpoint = "/api/personal-library";
    else if (source === "favorites") endpoint = "/api/favorites";
    else { endpoint = "/api/library/prompts"; needsAuth = false; }

    let res;
    if (needsAuth) {
      res = await authFetch(endpoint);
    } else {
      res = await fetch(`${API_BASE}${endpoint}`);
    }

    loading.classList.add("hidden");

    if (!res.ok) {
      if (res.status === 401) {
        showLoginScreen("token_expired");
        return;
      }
      empty.querySelector(".empty-title").textContent = "שגיאה בטעינה";
      empty.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    // Handle both { items: [...] } and direct array
    const items = data.items || (Array.isArray(data) ? data : []);
    libraryCache[source] = items;

    renderLibraryItems(items);
  } catch {
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

function renderLibraryItems(items) {
  const loading = $("library-loading");
  const empty = $("library-empty");
  const list = $("library-list");

  loading.classList.add("hidden");

  // Apply search filter if search box has text
  const searchQuery = librarySearch ? librarySearch.value.trim().toLowerCase() : "";
  let filtered = items;
  if (searchQuery && items) {
    filtered = items.filter(
      (item) =>
        (item.title || "").toLowerCase().includes(searchQuery) ||
        (item.prompt || "").toLowerCase().includes(searchQuery)
    );
  }

  if (!filtered || filtered.length === 0) {
    list.classList.add("hidden");
    empty.querySelector(".empty-title").textContent = searchQuery ? "לא נמצאו תוצאות" : "הספרייה ריקה";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = "";
  filtered.forEach((item) => {
    list.appendChild(createPromptCard(item));
  });
  list.classList.remove("hidden");
}

// ═══ SNIPPETS ═══
async function getSnippets() {
  const { snippets } = await chrome.storage.local.get("snippets");
  if (snippets && snippets.length > 0) return snippets;
  // First load: initialize with defaults
  await chrome.storage.local.set({ snippets: DEFAULT_SNIPPETS });
  return DEFAULT_SNIPPETS;
}

async function saveSnippets(snippets) {
  await chrome.storage.local.set({ snippets });
}

async function renderSnippets() {
  const grid = $("snippets-grid");
  if (!grid) return;
  snippetsRendered = true;
  grid.innerHTML = "";

  const snippets = await getSnippets();

  snippets.forEach((snip) => {
    const card = document.createElement("div");
    card.className = "snippet-card";

    const icon = document.createElement("span");
    icon.className = "snippet-card-icon";
    icon.textContent = snip.icon;

    const label = document.createElement("span");
    label.className = "snippet-card-label";
    label.textContent = snip.label;

    const editBtn = document.createElement("button");
    editBtn.className = "snippet-card-edit";
    editBtn.innerHTML = ICONS.pencil;
    editBtn.title = "ערוך";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSnippetModal(snip);
    });

    card.appendChild(editBtn);
    card.appendChild(icon);
    card.appendChild(label);

    card.addEventListener("click", () => {
      promptInput.value = snip.prompt;
      updateCharCount();
      document.querySelector('.tab[data-tab="enhance"]').click();
      setTimeout(() => doEnhance(), 100);
    });

    grid.appendChild(card);
  });

  // Add "+" card
  const addCard = document.createElement("div");
  addCard.className = "snippet-card snippet-card-add";
  const addIcon = document.createElement("span");
  addIcon.className = "snippet-card-icon";
  addIcon.innerHTML = ICONS.plus;
  const addLabel = document.createElement("span");
  addLabel.className = "snippet-card-label";
  addLabel.textContent = "חדש";
  addLabel.style.color = "inherit";
  addCard.appendChild(addIcon);
  addCard.appendChild(addLabel);
  addCard.addEventListener("click", () => openSnippetModal(null));
  grid.appendChild(addCard);
}

// Snippet modal
let editingSnippetId = null;

function openSnippetModal(snip) {
  const modal = $("snippet-modal");
  const title = $("snippet-modal-title");
  const iconInput = $("snippet-icon-input");
  const labelInput = $("snippet-label-input");
  const promptInputModal = $("snippet-prompt-input");
  const deleteBtn = $("snippet-delete-btn");

  if (snip) {
    title.textContent = "עריכת סניפט";
    iconInput.value = snip.icon;
    labelInput.value = snip.label;
    promptInputModal.value = snip.prompt;
    editingSnippetId = snip.id;
    deleteBtn.classList.remove("hidden");
  } else {
    title.textContent = "סניפט חדש";
    iconInput.value = "";
    labelInput.value = "";
    promptInputModal.value = "";
    editingSnippetId = null;
    deleteBtn.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

function closeSnippetModal() {
  $("snippet-modal").classList.add("hidden");
  editingSnippetId = null;
}

$("snippet-modal-close").addEventListener("click", closeSnippetModal);
$("snippet-cancel-btn").addEventListener("click", closeSnippetModal);
$("snippet-modal").addEventListener("click", (e) => {
  if (e.target === $("snippet-modal")) closeSnippetModal();
});

$("snippet-save-btn").addEventListener("click", async () => {
  const iconInput = $("snippet-icon-input");
  const labelInput = $("snippet-label-input");
  const promptInputModal = $("snippet-prompt-input");

  const icon = iconInput.value.trim() || "⚡";
  const label = labelInput.value.trim();
  const prompt = promptInputModal.value.trim();

  if (!label || !prompt) {
    toast("יש למלא שם ופרומפט", "error");
    return;
  }

  const snippets = await getSnippets();

  if (editingSnippetId) {
    const idx = snippets.findIndex((s) => s.id === editingSnippetId);
    if (idx !== -1) {
      snippets[idx] = { ...snippets[idx], icon, label, prompt };
    }
  } else {
    snippets.push({ id: "s_" + Date.now(), icon, label, prompt });
  }

  await saveSnippets(snippets);
  closeSnippetModal();
  snippetsRendered = false;
  renderSnippets();
  toast("נשמר!", "success");
});

$("snippet-delete-btn").addEventListener("click", async () => {
  if (!editingSnippetId) return;
  let snippets = await getSnippets();
  snippets = snippets.filter((s) => s.id !== editingSnippetId);
  await saveSnippets(snippets);
  closeSnippetModal();
  snippetsRendered = false;
  renderSnippets();
  toast("נמחק", "success");
});

// ═══ SELECTED TEXT DETECTION ═══
function detectSelectedText() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.scripting
        .executeScript({
          target: { tabId: tabs[0].id },
          func: () => window.getSelection()?.toString()?.trim() || "",
        })
        .then(async (results) => {
          const selectedText = results?.[0]?.result;
          if (selectedText && selectedText.length > 3) {
            promptInput.value = selectedText;
            const badge = document.createElement("div");
            badge.className = "selection-badge";
            badge.textContent = "טקסט מסומן זוהה";
            document.querySelector(".enhance-input-container")?.prepend(badge);
            updateCharCount();

            // Auto-enhance if setting enabled
            const { autoEnhance } = await chrome.storage.local.get("autoEnhance");
            if (autoEnhance) {
              setTimeout(() => doEnhance(), 200);
            }
          }
        })
        .catch(() => {});
    }
  });
}

function updateCharCount() {
  const len = promptInput.value.length;
  charCount.textContent = len;
  charCount.classList.toggle("warning", len > 2500 && len <= 3500);
  charCount.classList.toggle("danger", len > 3500);
}

// ═══ PROMPT CARD ═══
function createPromptCard(item) {
  const card = document.createElement("div");
  card.className = "prompt-card";

  const header = document.createElement("div");
  header.className = "prompt-card-header";

  const title = document.createElement("span");
  title.className = "prompt-card-title";
  title.textContent = item.title || "ללא כותרת";

  const cat = document.createElement("span");
  cat.className = "prompt-card-cat";
  cat.textContent = item.personal_category || item.category || "כללי";

  header.appendChild(title);
  header.appendChild(cat);

  const text = document.createElement("div");
  text.className = "prompt-card-text";
  text.textContent = item.prompt;

  const actions = document.createElement("div");
  actions.className = "prompt-card-actions";

  const useBtn = document.createElement("button");
  useBtn.className = "btn-sm prompt-card-btn-use";
  useBtn.innerHTML = `${ICONS.sparkles}<span>השתמש</span>`;
  useBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    promptInput.value = item.prompt;
    updateCharCount();
    document.querySelector('.tab[data-tab="enhance"]').click();
    promptInput.focus();
  });

  const copyCardBtn = document.createElement("button");
  copyCardBtn.className = "btn-sm";
  copyCardBtn.innerHTML = `${ICONS.copy}<span>העתק</span>`;
  copyCardBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.prompt);
    toast("הועתק!", "success");
  });

  const insertCardBtn = document.createElement("button");
  insertCardBtn.className = "btn-sm";
  insertCardBtn.innerHTML = `${ICONS.insert}<span>הכנס</span>`;
  insertCardBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.runtime.sendMessage(
        { type: "INJECT_AND_INSERT", tabId: tab.id, text: item.prompt },
        () => toast("הוכנס!", "success")
      );
    }
  });

  actions.appendChild(useBtn);
  actions.appendChild(copyCardBtn);
  actions.appendChild(insertCardBtn);

  card.appendChild(header);
  card.appendChild(text);
  card.appendChild(actions);

  card.addEventListener("click", () => {
    promptInput.value = item.prompt;
    updateCharCount();
    document.querySelector('.tab[data-tab="enhance"]').click();
    promptInput.focus();
  });

  return card;
}

// ═══ HISTORY ═══
async function loadHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  if (!history.length) {
    historySection.classList.add("hidden");
    return;
  }
  historySection.classList.remove("hidden");
  historyList.innerHTML = "";

  history.slice(0, MAX_HISTORY).forEach((item) => {
    const el = document.createElement("div");
    el.className = "history-item";
    const textSpan = document.createElement("span");
    textSpan.className = "history-item-text";
    textSpan.textContent = item.original;
    const timeSpan = document.createElement("span");
    timeSpan.className = "history-item-time";
    timeSpan.textContent = timeAgo(item.time);
    el.appendChild(textSpan);
    el.appendChild(timeSpan);
    el.addEventListener("click", () => {
      promptInput.value = item.original;
      updateCharCount();
      promptInput.focus();
    });
    historyList.appendChild(el);
  });
}

async function saveToHistory(original, enhanced) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({
    original: original.substring(0, 200),
    enhanced: enhanced.substring(0, 500),
    time: Date.now(),
  });
  await chrome.storage.local.set({ history: history.slice(0, MAX_HISTORY) });
  loadHistory();
}

clearHistoryBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ history: [] });
  historySection.classList.add("hidden");
});

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} שע'`;
  return `${Math.floor(hours / 24)} ימ'`;
}

// ═══ SETTINGS ═══
const defaultToneSelect = $("default-tone-select");
const autoEnhanceToggle = $("auto-enhance-toggle");
const languageSelect = $("language-select");
const clearHistorySettings = $("clear-history-settings");
const clearCacheBtn = $("clear-cache-btn");

if (defaultToneSelect) {
  defaultToneSelect.addEventListener("change", () => {
    const val = defaultToneSelect.value;
    chrome.storage.local.set({ defaultTone: val });
    toneSelect.value = val;
    toast("טון ברירת מחדל עודכן", "success");
  });
}

if (autoEnhanceToggle) {
  autoEnhanceToggle.addEventListener("change", () => {
    chrome.storage.local.set({ autoEnhance: autoEnhanceToggle.checked });
    toast(autoEnhanceToggle.checked ? "שדרוג אוטומטי פעיל" : "שדרוג אוטומטי כבוי", "success");
  });
}

if (languageSelect) {
  languageSelect.addEventListener("change", () => {
    chrome.storage.local.set({ language: languageSelect.value });
    toast("שפה עודכנה", "success");
  });
}

if (clearHistorySettings) {
  clearHistorySettings.addEventListener("click", async () => {
    await chrome.storage.local.set({ history: [] });
    historySection.classList.add("hidden");
    toast("היסטוריה נוקתה", "success");
  });
}

if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", () => {
    libraryCache = { personal: null, favorites: null, public: null };
    toast("מטמון נוקה", "success");
  });
}
