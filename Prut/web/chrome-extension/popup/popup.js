/**
 * Peroot Extension - Popup
 * Tabs: Enhance | Library | Favorites
 * Credits synced from website
 */

const API_BASE = "https://peroot.space";
const MAX_HISTORY = 8;

// ─── DOM ───
const $ = (id) => document.getElementById(id);
const loginScreen = $("login-screen");
const mainScreen = $("main-screen");
const loadingScreen = $("loading-screen");
const loginBtn = $("login-btn");
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

let lastEnhanced = "";
let isEnhancing = false;
let timerInterval = null;
let libraryLoaded = false;
let favoritesLoaded = false;

// ═══ INIT ═══
document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.local.get(["tone"]);
  if (stored.tone) toneSelect.value = stored.tone;

  const auth = await checkAuth();

  if (auth.authenticated) {
    show(mainScreen);
    loadHistory();
    setTimeout(() => promptInput.focus(), 80);
    fetchCredits();
  } else {
    show(loginScreen);
  }
});

function show(screen) {
  loadingScreen.classList.add("hidden");
  loginScreen.classList.add("hidden");
  mainScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

// ═══ CREDITS ═══
async function fetchCredits() {
  try {
    const res = await authFetch("/api/me");
    if (res.ok) {
      const user = await res.json();

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
    }
  } catch {
    // Not critical
  }
}

// ═══ TABS ═══
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    // Switch active tab
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    $(`tab-${target}`).classList.add("active");

    // Lazy-load data
    if (target === "library" && !libraryLoaded) loadLibrary();
    if (target === "favorites" && !favoritesLoaded) loadFavorites();
  });
});

// ═══ LOGIN ═══
loginBtn.addEventListener("click", async () => {
  await chrome.tabs.create({ url: `${API_BASE}/login` });
  window.close();
});

// ═══ INPUT ═══
promptInput.addEventListener("input", () => {
  const len = promptInput.value.length;
  charCount.textContent = len;
  charCount.classList.toggle("warning", len > 2500 && len <= 3500);
  charCount.classList.toggle("danger", len > 3500);
});

toneSelect.addEventListener("change", () => {
  chrome.storage.local.set({ tone: toneSelect.value });
});

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    doEnhance();
  }
});

enhanceBtn.addEventListener("click", doEnhance);

// ═══ ENHANCE ═══
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
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });

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
      else if (res.status === 401) { showError("נדרשת התחברות מחדש."); show(loginScreen); }
      else showError(err.error || "שגיאה בשדרוג");
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
    fetchCredits(); // refresh credits after use
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
  flash(copyBtn, "הועתק!");
});

insertBtn.addEventListener("click", async () => {
  if (!lastEnhanced) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "INSERT_TEXT", text: lastEnhanced });
    flash(insertBtn, "הוכנס!");
  }
});

reuseBtn.addEventListener("click", () => {
  if (!lastEnhanced) return;
  promptInput.value = lastEnhanced;
  charCount.textContent = lastEnhanced.length;
  resultSection.classList.add("hidden");
  promptInput.focus();
});

function flash(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.classList.add("success");
  setTimeout(() => { btn.textContent = orig; btn.classList.remove("success"); }, 1200);
}

// ═══ SYNC TO WEBSITE ═══
async function syncToWebsite(original, enhanced) {
  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
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
async function loadLibrary() {
  const loading = $("library-loading");
  const empty = $("library-empty");
  const list = $("library-list");

  try {
    const res = await authFetch("/api/personal-library");
    loading.classList.add("hidden");

    if (!res.ok) {
      empty.querySelector(".empty-title").textContent = "שגיאה בטעינה";
      empty.classList.remove("hidden");
      return;
    }

    const { items } = await res.json();
    libraryLoaded = true;

    if (!items || items.length === 0) {
      empty.classList.remove("hidden");
      return;
    }

    list.innerHTML = "";
    items.forEach((item) => {
      list.appendChild(createPromptCard(item));
    });
    list.classList.remove("hidden");
  } catch {
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

// ═══ FAVORITES ═══
async function loadFavorites() {
  const loading = $("favorites-loading");
  const empty = $("favorites-empty");
  const list = $("favorites-list");

  try {
    const res = await authFetch("/api/favorites");
    loading.classList.add("hidden");

    if (!res.ok) {
      empty.querySelector(".empty-title").textContent = "שגיאה בטעינה";
      empty.classList.remove("hidden");
      return;
    }

    const { items } = await res.json();
    favoritesLoaded = true;

    if (!items || items.length === 0) {
      empty.classList.remove("hidden");
      return;
    }

    list.innerHTML = "";
    items.forEach((item) => {
      list.appendChild(createPromptCard(item));
    });
    list.classList.remove("hidden");
  } catch {
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
  }
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
  useBtn.textContent = "השתמש";
  useBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Switch to enhance tab with this prompt
    promptInput.value = item.prompt;
    charCount.textContent = item.prompt.length;
    document.querySelector('.tab[data-tab="enhance"]').click();
    promptInput.focus();
  });

  const copyCardBtn = document.createElement("button");
  copyCardBtn.className = "btn-sm";
  copyCardBtn.textContent = "העתק";
  copyCardBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.prompt);
    flash(copyCardBtn, "הועתק!");
  });

  const insertCardBtn = document.createElement("button");
  insertCardBtn.className = "btn-sm";
  insertCardBtn.textContent = "הכנס";
  insertCardBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "INSERT_TEXT", text: item.prompt });
      flash(insertCardBtn, "הוכנס!");
    }
  });

  actions.appendChild(useBtn);
  actions.appendChild(copyCardBtn);
  actions.appendChild(insertCardBtn);

  card.appendChild(header);
  card.appendChild(text);
  card.appendChild(actions);

  // Click card to expand/use
  card.addEventListener("click", () => {
    promptInput.value = item.prompt;
    charCount.textContent = item.prompt.length;
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
      charCount.textContent = item.original.length;
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
  if (mins < 60) return `${mins}d`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sh`;
  return `${Math.floor(hours / 24)}y`;
}
