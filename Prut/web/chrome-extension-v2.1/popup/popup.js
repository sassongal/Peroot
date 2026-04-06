/**
 * Peroot Extension - Popup
 * Tabs: Enhance | Library | Favorites | History
 * Credits synced from website
 */

const API_BASE = "https://www.peroot.space";

// ─── DOM ───
const $ = (id) => document.getElementById(id);
const loginScreen = $("login-screen");
const mainScreen = $("main-screen");
const loadingScreen = $("loading-screen");
const loginBtn = $("login-btn");
const loginHint = $("login-hint");
const promptInput = $("prompt-input");
const charCount = $("char-count");
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
const saveBtn = $("save-btn");

let lastEnhanced = "";
let isEnhancing = false;
let selectedMode = "STANDARD";
let userTier = "free";
let timerInterval = null;
let libraryLoaded = false;
let favoritesLoaded = false;
let historyTabLoaded = false;

// ═══ INIT ═══
document.addEventListener("DOMContentLoaded", async () => {
  let auth = await checkAuth();

  // If not authenticated, wait 1.5s and try once more
  // (auth-sync may still be running on peroot.space tab)
  if (!auth.authenticated) {
    await new Promise(r => setTimeout(r, 1500));
    auth = await checkAuth();
  }

  if (auth.authenticated) {
    show(mainScreen);
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

/**
 * Show login screen with contextual messaging based on auth failure reason.
 */
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

// ═══ CREDITS ═══
async function fetchCredits() {
  try {
    const res = await authFetch("/api/me");
    if (res.ok) {
      const user = await res.json();

      // Tier badge
      const tier = user.plan_tier || "free";
      userTier = tier;
      updateModeButtons();
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
      // Token invalid on server — force re-login
      showLoginScreen("token_expired");
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
    if (target === "history" && !historyTabLoaded) loadHistoryTab();
  });
});

// ═══ SETTINGS TOGGLE ═══
$("settings-toggle").addEventListener("click", () => {
  $("settings-panel").classList.toggle("open");
});

// ═══ LOGIN ═══
loginBtn.addEventListener("click", async () => {
  await openLoginTab();
  window.close();
});

// ═══ RETRY AUTH ═══
$("retry-btn").addEventListener("click", async () => {
  show(loadingScreen);
  // Force sync from any open peroot.space tab
  await forceAuthSync();
  await new Promise(r => setTimeout(r, 500));
  const auth = await checkAuth();
  if (auth.authenticated) {
    show(mainScreen);
    fetchCredits();
    detectSelectedText();
  } else {
    showLoginScreen(auth.reason);
  }
});

// ═══ INPUT ═══
promptInput.addEventListener("input", () => {
  const len = promptInput.value.length;
  charCount.textContent = len;
  charCount.classList.toggle("warning", len > 2500 && len <= 3500);
  charCount.classList.toggle("danger", len > 3500);
  enhanceBtn.classList.toggle("ready", len > 0 && !isEnhancing);
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
        tone: "Professional",
        category: "\u05DB\u05DC\u05DC\u05D9",
        capability_mode: selectedMode,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      resultSection.classList.add("hidden");
      if (res.status === 403) showError(err.error || "אין מספיק קרדיטים");
      else if (res.status === 429) showError("יותר מדי בקשות. נסה שוב בעוד כמה דקות.");
      else if (res.status === 401) {
        showError("פג תוקף ההתחברות. מנסה להתחבר מחדש...");
        // Try to refresh token
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          hideError();
          // Retry the enhance with the new token
          isEnhancing = false;
          clearInterval(timerInterval);
          setLoading(false);
          doEnhance();
          return;
        }
        showLoginScreen("token_expired");
      }
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

    // Auto-copy to clipboard
    try {
      await navigator.clipboard.writeText(lastEnhanced);
      flash(copyBtn, "הועתק!");
    } catch {}

    saveToHistory(text, lastEnhanced);
    // Note: syncToWebsite removed — /api/enhance already saves to history server-side
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
    // Inject content script on-demand, then insert text
    chrome.runtime.sendMessage(
      { type: "INJECT_AND_INSERT", tabId: tab.id, text: lastEnhanced },
      () => flash(insertBtn, "הוכנס!")
    );
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
// Removed: /api/enhance already saves to history server-side.
// Keeping this section header for reference.

// ═══ LIBRARY ═══
async function loadLibrary() {
  const loading = $("library-loading");
  const empty = $("library-empty");
  const list = $("library-list");

  try {
    const res = await authFetch("/api/personal-library");
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
      if (res.status === 401) { showLoginScreen("token_expired"); return; }
      empty.querySelector(".empty-title").textContent = "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05D4";
      empty.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    const favorites = data.favorites || data.items || data || [];
    favoritesLoaded = true;

    if (!favorites.length) {
      empty.classList.remove("hidden");
      return;
    }

    list.innerHTML = "";
    favorites.forEach((item) => list.appendChild(createPromptCard(item)));
    list.classList.remove("hidden");
  } catch {
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

// ═══ HISTORY TAB ═══
async function loadHistoryTab() {
  const loading = $("tab-history-loading");
  const empty = $("tab-history-empty");
  const list = $("tab-history-list");

  try {
    const res = await authFetch("/api/history");
    loading.classList.add("hidden");

    if (!res.ok) {
      if (res.status === 401) { showLoginScreen("token_expired"); return; }
      empty.classList.remove("hidden");
      return;
    }

    const items = await res.json();
    historyTabLoaded = true;

    if (!items || !items.length) {
      empty.classList.remove("hidden");
      return;
    }

    list.innerHTML = "";
    items.slice(0, 20).forEach((item) => {
      list.appendChild(createHistoryCard(item));
    });
    list.classList.remove("hidden");
  } catch {
    loading.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

function createHistoryCard(item) {
  const card = document.createElement("div");
  card.className = "prompt-card";

  const header = document.createElement("div");
  header.className = "prompt-card-header";

  const title = document.createElement("span");
  title.className = "prompt-card-title";
  title.textContent = item.title || (item.prompt ? item.prompt.substring(0, 50) : "\u05DC\u05DC\u05D0 \u05DB\u05D5\u05EA\u05E8\u05EA");

  const time = document.createElement("span");
  time.className = "prompt-card-cat";
  time.textContent = timeAgo(new Date(item.created_at).getTime());

  header.appendChild(title);
  header.appendChild(time);

  const text = document.createElement("div");
  text.className = "prompt-card-text";
  text.textContent = item.enhanced_prompt || item.prompt || "";

  const actions = document.createElement("div");
  actions.className = "prompt-card-actions";

  const useBtn = document.createElement("button");
  useBtn.className = "btn-sm prompt-card-btn-use";
  useBtn.textContent = "\u05D4\u05E9\u05EA\u05DE\u05E9";
  useBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    promptInput.value = item.enhanced_prompt || item.prompt || "";
    updateCharCount();
    document.querySelector('.tab[data-tab="enhance"]').click();
    promptInput.focus();
  });

  const copyCardBtn = document.createElement("button");
  copyCardBtn.className = "btn-sm";
  copyCardBtn.textContent = "\u05D4\u05E2\u05EA\u05E7";
  copyCardBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.enhanced_prompt || item.prompt || "");
    flash(copyCardBtn, "\u05D4\u05D5\u05E2\u05EA\u05E7!");
  });

  actions.appendChild(useBtn);
  actions.appendChild(copyCardBtn);

  card.appendChild(header);
  card.appendChild(text);
  card.appendChild(actions);

  return card;
}

// ═══ SELECTED TEXT DETECTION ═══
function detectSelectedText() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.getSelection()?.toString()?.trim() || '',
      }).then(results => {
        const selectedText = results?.[0]?.result;
        if (selectedText && selectedText.length > 3) {
          promptInput.value = selectedText;
          // Show indicator
          const badge = document.createElement('div');
          badge.className = 'selection-badge';
          badge.textContent = '\u05D8\u05E7\u05E1\u05D8 \u05DE\u05E1\u05D5\u05DE\u05DF \u05D6\u05D5\u05D4\u05D4';
          document.querySelector('.enhance-input-container')?.prepend(badge);
          updateCharCount();
        }
      }).catch(() => {}); // Silently fail if no permission
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
      chrome.runtime.sendMessage(
        { type: "INJECT_AND_INSERT", tabId: tab.id, text: item.prompt },
        () => flash(insertCardBtn, "הוכנס!")
      );
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

// ═══ LOCAL HISTORY (for sync) ═══
async function saveToHistory(original, enhanced) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({
    original: original.substring(0, 200),
    enhanced: enhanced.substring(0, 500),
    time: Date.now(),
  });
  await chrome.storage.local.set({ history: history.slice(0, 20) });
  // Invalidate history tab cache so it reloads next time
  historyTabLoaded = false;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "\u05E2\u05DB\u05E9\u05D9\u05D5";
  if (mins < 60) return `${mins} \u05D3\u05E7'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} \u05E9\u05E2'`;
  return `${Math.floor(hours / 24)} \u05D9\u05DE'`;
}

// ═══ MODE SELECTOR ═══
function updateModeButtons() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const mode = btn.dataset.mode;
    const isLocked = mode !== 'STANDARD' && userTier !== 'pro' && userTier !== 'admin';
    btn.classList.toggle('locked', isLocked);
    // Show/hide lock badge
    const lock = btn.querySelector('.mode-lock');
    if (lock) lock.style.display = isLocked ? '' : 'none';
  });
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode !== 'STANDARD' && userTier !== 'pro' && userTier !== 'admin') {
      showError('שדרג ל-Pro כדי לפתוח מצבים מתקדמים');
      return;
    }
    selectedMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ═══ SAVE TO LIBRARY ═══
saveBtn.addEventListener("click", async () => {
  if (!lastEnhanced) return;
  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE}/api/personal-library`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: promptInput.value.substring(0, 60) || "\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05E9\u05D5\u05D3\u05E8\u05D2",
        prompt: lastEnhanced,
        category: "\u05DB\u05DC\u05DC\u05D9",
        source: "extension",
      }),
    });
    if (res.ok) {
      flash(saveBtn, "\u05E0\u05E9\u05DE\u05E8!");
      libraryLoaded = false; // force reload next time
    } else {
      flash(saveBtn, "\u05E9\u05D2\u05D9\u05D0\u05D4");
    }
  } catch {
    flash(saveBtn, "\u05E9\u05D2\u05D9\u05D0\u05D4");
  }
});
