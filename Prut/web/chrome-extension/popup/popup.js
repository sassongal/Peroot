/**
 * Peroot Extension - Popup
 * Uses auth.js (loaded before this script) for authentication.
 */

const API_BASE = "https://peroot.space";
const MAX_HISTORY = 8;

// ─── Quick Action Definitions ───
const ACTIONS = {
  enhance: {
    label: "שדרג",
    buildPrompt: (text, tone) => ({ prompt: text, tone, category: "General" }),
  },
  shorten: {
    label: "קצר",
    buildPrompt: (text) => ({
      prompt: text,
      tone: "Professional",
      category: "General",
      refinementInstruction: "Make this significantly shorter and more concise. Keep the core message but remove all unnecessary words. Output ONLY the shortened text.",
      previousResult: text,
    }),
  },
  lengthen: {
    label: "הארך",
    buildPrompt: (text) => ({
      prompt: text,
      tone: "Professional",
      category: "General",
      refinementInstruction: "Expand and elaborate on this text. Add more detail, examples, and depth while maintaining the original tone and intent. Output ONLY the expanded text.",
      previousResult: text,
    }),
  },
  fix: {
    label: "תקן",
    buildPrompt: (text) => ({
      prompt: text,
      tone: "Professional",
      category: "General",
      refinementInstruction: "Fix all grammar, spelling, and punctuation errors. Improve sentence structure where needed. Output ONLY the corrected text with no explanations.",
      previousResult: text,
    }),
  },
  translate: {
    label: "תרגם",
    buildPrompt: (text) => ({
      prompt: text,
      tone: "Professional",
      category: "General",
      refinementInstruction: "Translate this text to English. If already in English, translate to Hebrew. Output ONLY the translation.",
      previousResult: text,
    }),
  },
};

// ─── DOM ───
const $ = (id) => document.getElementById(id);
const loginScreen = $("login-screen");
const mainScreen = $("main-screen");
const loadingScreen = $("loading-screen");
const loginBtn = $("login-btn");
const promptInput = $("prompt-input");
const charCount = $("char-count");
const toneSelect = $("tone-select");
const resultSection = $("result-section");
const resultLabel = $("result-label");
const resultTimer = $("result-timer");
const resultText = $("result-text");
const copyBtn = $("copy-btn");
const insertBtn = $("insert-btn");
const reuseBtn = $("reuse-btn");
const openBtn = $("open-btn");
const errorSection = $("error-section");
const errorText = $("error-text");
const userInfo = $("user-info");
const historySection = $("history-section");
const historyList = $("history-list");
const clearHistoryBtn = $("clear-history");

let lastEnhanced = "";
let isEnhancing = false;
let currentAction = "enhance";
let timerInterval = null;

// ═══ INIT ═══
document.addEventListener("DOMContentLoaded", async () => {
  // Restore saved tone
  const stored = await chrome.storage.local.get(["tone"]);
  if (stored.tone) toneSelect.value = stored.tone;

  // Auth check
  const auth = await checkAuth();

  if (auth.authenticated) {
    show(mainScreen);
    if (auth.email) {
      userInfo.textContent = auth.email.split("@")[0];
      userInfo.classList.remove("hidden");
    }
    loadHistory();
    setTimeout(() => promptInput.focus(), 80);
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
    // Not critical
  }
}

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
    doAction("enhance");
  }
});

// ═══ QUICK ACTIONS ═══
document.querySelectorAll(".qa-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action) doAction(action);
  });
});

// ═══ ENHANCE / ACTION ═══
async function doAction(action) {
  const text = promptInput.value.trim();
  if (!text || isEnhancing) return;

  currentAction = action;
  isEnhancing = true;
  hideError();
  resultSection.classList.add("hidden");

  // Disable all action buttons
  document.querySelectorAll(".qa-btn").forEach((b) => (b.disabled = true));

  // Highlight active action
  document.querySelectorAll(".qa-btn").forEach((b) => b.classList.remove("qa-active"));
  const activeBtn = document.querySelector(`.qa-btn[data-action="${action}"]`);
  if (activeBtn) activeBtn.classList.add("qa-active");

  // Start timer
  const startTime = Date.now();
  resultTimer.textContent = "0.0s";
  timerInterval = setInterval(() => {
    resultTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
  }, 100);

  // Show result section immediately with streaming state
  resultSection.classList.remove("hidden");
  resultText.textContent = "";
  resultText.classList.add("streaming");
  resultLabel.textContent = ACTIONS[action]?.label || "תוצאה";

  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
    const body = ACTIONS[action].buildPrompt(text, toneSelect.value);

    const res = await fetch(`${API_BASE}/api/enhance`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      resultSection.classList.add("hidden");
      if (res.status === 403) {
        showError(err.error || "אין מספיק קרדיטים");
      } else if (res.status === 429) {
        showError("יותר מדי בקשות. נסה שוב בעוד כמה דקות.");
      } else if (res.status === 401) {
        showError("נדרשת התחברות מחדש.");
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

    saveToHistory(text, lastEnhanced, action);
    fetchUserInfo();
  } catch {
    resultSection.classList.add("hidden");
    showError("שגיאת רשת. בדוק את החיבור.");
  } finally {
    isEnhancing = false;
    clearInterval(timerInterval);
    document.querySelectorAll(".qa-btn").forEach((b) => (b.disabled = false));
  }
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

reuseBtn.addEventListener("click", () => {
  if (!lastEnhanced) return;
  promptInput.value = lastEnhanced;
  charCount.textContent = lastEnhanced.length;
  resultSection.classList.add("hidden");
  promptInput.focus();
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

async function saveToHistory(original, enhanced, action) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({
    original: original.substring(0, 200),
    enhanced: enhanced.substring(0, 500),
    action: action || "enhance",
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
