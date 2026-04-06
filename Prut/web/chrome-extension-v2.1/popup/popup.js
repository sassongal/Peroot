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
const googleLoginBtn = $("google-login-btn");
const emailLoginForm = $("email-login-form");
const emailInput = $("email-input");
const passwordInput = $("password-input");
const emailLoginBtn = $("email-login-btn");
const loginHint = $("login-hint");
const logoutBtn = $("logout-btn");
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
const scoreBar = $("score-bar");
const scoreFill = $("score-fill");
const scoreLabel = $("score-label");
const scoreTip = $("score-tip");

let lastEnhanced = "";
let isEnhancing = false;
let selectedTone = "Professional";
let scoreTimeout = null;

function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}
let selectedMode = "STANDARD";
let userTier = "free";
let timerInterval = null;
let libraryLoaded = false;
let favoritesLoaded = false;
let historyTabLoaded = false;
let enhanceRetried = false;

// ═══ PROMPT QUALITY SCORE ═══
function scorePrompt(text) {
  if (!text || text.trim().length < 3) return { score: 0, tips: [], label: '', color: '' };

  const words = text.trim().split(/\s+/);
  const wc = words.length;
  let total = 0;
  const tips = [];

  // 1. Length (12 pts)
  if (wc <= 3) { total += 0; tips.push('\u05D4\u05D5\u05E1\u05E3 \u05E2\u05D5\u05D3 \u05E4\u05E8\u05D8\u05D9\u05DD'); }
  else if (wc <= 6) total += 2;
  else if (wc <= 12) total += 4;
  else if (wc <= 25) total += 7;
  else if (wc <= 50) total += 10;
  else total += 12;

  // 2. Role (12 pts)
  if (/\u05D0\u05EA\u05D4\s+\S+|you\s+are|act\s+as|as\s+a\s+\w+/i.test(text)) total += 12;
  else if (/\u05DE\u05D5\u05DE\u05D7\u05D4|\u05DE\u05E0\u05D4\u05DC|\u05D9\u05D5\u05E2\u05E5|\u05DB\u05D5\u05EA\u05D1|expert|specialist|coach/i.test(text)) total += 6;
  else tips.push('\u05D4\u05D2\u05D3\u05E8 \u05EA\u05E4\u05E7\u05D9\u05D3 (\u05D0\u05EA\u05D4 \u05DE\u05D5\u05DE\u05D7\u05D4...)');

  // 3. Task (10 pts)
  if (/\u05DB\u05EA\u05D5\u05D1|\u05E6\u05D5\u05E8|\u05D1\u05E0\u05D4|\u05E0\u05E1\u05D7|\u05D4\u05DB\u05DF|\u05E2\u05E8\u05D5\u05DA|\u05E1\u05DB\u05DD|\u05EA\u05E8\u05D2\u05DD|\u05E0\u05EA\u05D7|write|create|build|draft|generate|analyze/i.test(text)) {
    total += /\u05DB\u05EA\u05D5\u05D1\s+\S+|\u05E6\u05D5\u05E8\s+\S+|write\s+a|create\s+a/i.test(text) ? 10 : 5;
  } else tips.push('\u05D4\u05D2\u05D3\u05E8 \u05DE\u05E9\u05D9\u05DE\u05D4 (\u05DB\u05EA\u05D5\u05D1, \u05E6\u05D5\u05E8, \u05E0\u05EA\u05D7...)');

  // 4. Context (12 pts)
  let ctx = 0;
  if (/\u05E7\u05D4\u05DC|\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA|audience|target|\u05E2\u05D1\u05D5\u05E8\s+\S+/i.test(text)) ctx += 4;
  if (/\u05DE\u05D8\u05E8\u05D4|\u05D9\u05E2\u05D3|goal|\u05DB\u05D3\u05D9\s+\u05DC|\u05E2\u05DC\s+\u05DE\u05E0\u05EA/i.test(text)) ctx += 4;
  if (/\u05E8\u05E7\u05E2|\u05D4\u05E7\u05E9\u05E8|context|background|\u05D1\u05D2\u05DC\u05DC|\u05DE\u05DB\u05D9\u05D5\u05D5\u05DF/i.test(text)) ctx += 4;
  total += ctx;
  if (ctx === 0) tips.push('\u05E1\u05E4\u05E7 \u05D4\u05E7\u05E9\u05E8 (\u05DC\u05DE\u05D9? \u05DC\u05DE\u05D4?)');

  // 5. Specificity (10 pts)
  let spec = 0;
  if (/\d+/.test(text)) spec += 3;
  if (/["""\u05F4]|\u05DC\u05DE\u05E9\u05DC|for\s+example/i.test(text)) spec += 4;
  if (/[A-Z][a-z]{2,}/.test(text)) spec += 3;
  total += Math.min(10, spec);

  // 6. Format (10 pts)
  let fmt = 0;
  if (/\u05E4\u05D5\u05E8\u05DE\u05D8|\u05D8\u05D1\u05DC\u05D4|\u05E8\u05E9\u05D9\u05DE\u05D4|bullet|json|markdown/i.test(text)) fmt += 5;
  if (/\u05D0\u05D5\u05E8\u05DA|\u05DE\u05D9\u05DC\u05D9\u05DD|\u05E9\u05D5\u05E8\u05D5\u05EA|words|short|long|\u05E7\u05E6\u05E8|\u05D0\u05E8\u05D5\u05DA/i.test(text)) fmt += 3;
  if (/\u05DB\u05D5\u05EA\u05E8\u05EA|\u05E1\u05E2\u05D9\u05E4\u05D9\u05DD|header|section/i.test(text)) fmt += 2;
  total += Math.min(10, fmt);

  // 7. Constraints (10 pts)
  let con = 0;
  if (/\u05D0\u05DC\s+\u05EA|\u05D0\u05E1\u05D5\u05E8|\u05DC\u05DC\u05D0|don't|avoid|without/i.test(text)) con += 4;
  if (/\u05D8\u05D5\u05DF|\u05E1\u05D2\u05E0\u05D5\u05DF|tone|style|\u05DE\u05E7\u05E6\u05D5\u05E2\u05D9|\u05D9\u05D3\u05D9\u05D3\u05D5\u05EA\u05D9/i.test(text)) con += 3;
  if (/\u05D1\u05E2\u05D1\u05E8\u05D9\u05EA|\u05D1\u05D0\u05E0\u05D2\u05DC\u05D9\u05EA|in\s+hebrew|in\s+english/i.test(text)) con += 3;
  total += Math.min(10, con);

  // 8. Structure (8 pts)
  let str = 0;
  if (/\n/.test(text)) str += 3;
  if (/^\s*[\d\u2022\-\*]\s*/m.test(text)) str += 3;
  if (/---|===|\*\*/m.test(text)) str += 2;
  total += Math.min(8, str);

  // 9. Channel (8 pts)
  if (/\u05DE\u05D9\u05D9\u05DC|email|\u05DC\u05D9\u05E0\u05E7\u05D3\u05D0\u05D9\u05DF|linkedin|\u05E4\u05D9\u05D9\u05E1\u05D1\u05D5\u05E7|\u05D0\u05D9\u05E0\u05E1\u05D8\u05D2\u05E8\u05DD|\u05D1\u05DC\u05D5\u05D2|blog|\u05D0\u05EA\u05E8|website/i.test(text)) total += 8;

  // 10. Examples (8 pts)
  if (/\u05D3\u05D5\u05D2\u05DE\u05D4 \u05DC\u05E4\u05DC\u05D8|output\s+example|expected/i.test(text)) total += 8;
  else if (/\u05D3\u05D5\u05D2\u05DE\u05D4|example|sample/i.test(text)) total += 4;

  // Max is 100
  const score = Math.min(100, total);

  // Label
  let label, color;
  if (score <= 20) { label = '\u05D7\u05DC\u05E9'; color = '#ef4444'; }
  else if (score <= 40) { label = '\u05D1\u05E1\u05D9\u05E1\u05D9'; color = '#f97316'; }
  else if (score <= 60) { label = '\u05E1\u05D1\u05D9\u05E8'; color = '#eab308'; }
  else if (score <= 80) { label = '\u05D8\u05D5\u05D1'; color = '#22c55e'; }
  else { label = '\u05DE\u05E6\u05D5\u05D9\u05DF'; color = '#10b981'; }

  return { score, tips: tips.slice(0, 2), label, color };
}

function updateScoreBar(text) {
  if (scoreTimeout) clearTimeout(scoreTimeout);
  scoreTimeout = setTimeout(() => {
    const result = scorePrompt(text);
    if (result.score > 0) {
      scoreBar.classList.remove("hidden");
      scoreFill.style.width = result.score + "%";
      scoreFill.style.backgroundColor = result.color;
      scoreLabel.textContent = result.label;
      scoreLabel.style.color = result.color;
      scoreTip.textContent = result.tips[0] || '';
    } else {
      scoreBar.classList.add("hidden");
    }
  }, 300);
}

// ═══ INIT ═══
document.addEventListener("DOMContentLoaded", async () => {
  const auth = await checkAuth();

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
  setLoginLoading(false);
  if (reason === "token_expired") {
    setLoginHint("פג תוקף ההתחברות. התחבר שוב כדי להמשיך.", "#fbbf24");
  } else {
    setLoginHint("", "");
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

// ═══ LOGIN — Google OAuth ═══
googleLoginBtn.addEventListener("click", async () => {
  setLoginLoading(true, "מתחבר עם Google...");
  try {
    await loginWithGoogle();
    onLoginSuccess();
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("canceled") || msg.includes("cancelled") || msg.includes("closed")) {
      setLoginHint("ההתחברות בוטלה. נסה שוב.", "#fca5a5");
    } else {
      setLoginHint("שגיאה בהתחברות. נסה שוב.", "#fca5a5");
    }
    setLoginLoading(false);
  }
});

// ═══ LOGIN — Email/Password ═══
emailLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return;

  setLoginLoading(true, "מתחבר...");
  try {
    await loginWithEmail(email, password);
    onLoginSuccess();
  } catch (err) {
    const msg = err.message || "שגיאה בהתחברות";
    // Translate common Supabase error messages to Hebrew
    if (msg.includes("Invalid login")) {
      setLoginHint("אימייל או סיסמה שגויים.", "#fca5a5");
    } else if (msg.includes("Email not confirmed")) {
      setLoginHint("האימייל לא אומת. בדוק את תיבת הדואר.", "#fca5a5");
    } else {
      setLoginHint(msg, "#fca5a5");
    }
    setLoginLoading(false);
  }
});

function onLoginSuccess() {
  show(mainScreen);
  setTimeout(() => promptInput.focus(), 80);
  fetchCredits();
  detectSelectedText();
}

function setLoginLoading(loading, msg) {
  googleLoginBtn.disabled = loading;
  emailLoginBtn.disabled = loading;
  if (emailInput) emailInput.disabled = loading;
  if (passwordInput) passwordInput.disabled = loading;
  if (msg) setLoginHint(msg, "#fbbf24");
}

function setLoginHint(text, color) {
  if (loginHint) {
    loginHint.textContent = text;
    loginHint.style.color = color || "";
  }
}

// ═══ LOGOUT ═══
logoutBtn.addEventListener("click", async () => {
  await clearAuth();
  // Reset UI state
  libraryLoaded = false;
  favoritesLoaded = false;
  historyTabLoaded = false;
  showLoginScreen("no_token");
});

// ═══ RETRY AUTH ═══
$("retry-btn").addEventListener("click", async () => {
  show(loadingScreen);
  // Try refreshing token or syncing from peroot.space tab
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    await forceAuthSync();
  }
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
  updateScoreBar(promptInput.value);
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
  scoreBar.classList.add("hidden");
  setLoading(true);

  const startTime = Date.now();
  resultTimer.textContent = "0.0s";
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    resultTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
  }, 100);

  resultSection.classList.remove("hidden");
  resultText.textContent = "";
  resultText.classList.add("streaming");

  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });

    const res = await fetchWithTimeout(`${API_BASE}/api/enhance`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: text,
        tone: selectedTone,
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
        if (!enhanceRetried) {
          showError("פג תוקף ההתחברות. מנסה להתחבר מחדש...");
          // Try to refresh token via Supabase REST API
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            hideError();
            // Retry the enhance with the new token (once only)
            enhanceRetried = true;
            isEnhancing = false;
            clearInterval(timerInterval);
            setLoading(false);
            doEnhance();
            return;
          }
        }
        enhanceRetried = false;
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
    enhanceRetried = false; // Reset retry flag on success

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
  updateScoreBar(lastEnhanced);
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
    document.querySelector('.tab[data-tab="enhance"]')?.click();
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
          updateScoreBar(selectedText);
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

  // Hover preview showing full prompt text
  const preview = document.createElement("div");
  preview.className = "prompt-card-preview";
  preview.textContent = item.prompt || "";

  const actions = document.createElement("div");
  actions.className = "prompt-card-actions";

  const useBtn = document.createElement("button");
  useBtn.className = "btn-sm prompt-card-btn-use";
  useBtn.textContent = "השתמש";
  useBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    // Insert directly into active tab's chat input
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.runtime.sendMessage(
        { type: "INJECT_AND_INSERT", tabId: tab.id, text: item.prompt },
        () => flash(useBtn, "הוכנס!")
      );
    }
    // Also fill popup textarea as fallback
    promptInput.value = item.prompt;
    updateCharCount();
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
  card.appendChild(preview);
  card.appendChild(actions);

  // Click card to expand/use
  card.addEventListener("click", () => {
    promptInput.value = item.prompt;
    charCount.textContent = item.prompt.length;
    document.querySelector('.tab[data-tab="enhance"]')?.click();
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

// ═══ TONE CHIPS ═══
document.querySelectorAll('.tone-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedTone = chip.dataset.tone;
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
