/**
 * Peroot Extension - Popup
 * Uses auth.js (loaded before this script) for authentication.
 */

const API_BASE = "https://peroot.space";
const MAX_HISTORY = 5;

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
const resultText = $("result-text");
const copyBtn = $("copy-btn");
const insertBtn = $("insert-btn");
const openBtn = $("open-btn");
const errorSection = $("error-section");
const errorText = $("error-text");
const userInfo = $("user-info");
const historySection = $("history-section");
const historyList = $("history-list");
const clearHistoryBtn = $("clear-history");

let lastEnhanced = "";
let isEnhancing = false;

// ═══ INIT ═══
document.addEventListener("DOMContentLoaded", async () => {
  // Restore saved tone
  const stored = await chrome.storage.local.get(["tone"]);
  if (stored.tone) toneSelect.value = stored.tone;

  // Auth check (cookie-based, instant, no server call)
  const auth = await checkAuth();

  if (auth.authenticated) {
    show(mainScreen);
    if (auth.email) {
      userInfo.textContent = auth.email.split("@")[0];
      userInfo.classList.remove("hidden");
    }
    loadHistory();
    setTimeout(() => promptInput.focus(), 80);

    // Fetch credits in background (optional, may fail if not deployed)
    fetchUserInfo();
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

async function fetchUserInfo() {
  try {
    const res = await authFetch("/api/me");
    if (res.ok) {
      const user = await res.json();
      if (user.credits_balance != null) {
        const tier = user.plan_tier === "pro" ? "PRO" : "";
        userInfo.textContent = `${tier} ${user.credits_balance} קרדיטים`.trim();
        userInfo.classList.remove("hidden");
      }
    }
  } catch {
    // Not deployed yet - fine
  }
}

// ═══ LOGIN ═══
loginBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/login` });
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

// ═══ ENHANCE ═══
enhanceBtn.addEventListener("click", doEnhance);

async function doEnhance() {
  const text = promptInput.value.trim();
  if (!text || isEnhancing) return;

  isEnhancing = true;
  hideError();
  resultSection.classList.add("hidden");
  setLoading(true);

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
      if (res.status === 403) {
        showError(err.error || "אין מספיק קרדיטים");
      } else if (res.status === 429) {
        showError("יותר מדי בקשות. נסה שוב בעוד כמה דקות.");
      } else if (res.status === 401) {
        showError("נדרשת התחברות. לחץ על התחבר ל-Peroot.");
        show(loginScreen);
      } else {
        showError(err.error || "שגיאה בשדרוג");
      }
      return;
    }

    // Stream response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    resultSection.classList.remove("hidden");
    resultText.textContent = "";
    resultText.classList.add("streaming");

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
    fetchUserInfo(); // refresh credits
  } catch {
    showError("שגיאת רשת. בדוק את החיבור.");
  } finally {
    isEnhancing = false;
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

// ═══ ACTIONS ═══
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

openBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: API_BASE });
});

function flash(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.classList.add("success");
  setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove("success");
  }, 1200);
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
