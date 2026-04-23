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
let lastOriginalForFeedback = "";
let isEnhancing = false;
let selectedTone = "Professional";
let scoreTimeout = null;
let detectedTargetModel = "general";

/**
 * Resolve the effective output language.
 * "english" → force English. "auto" → detect from input text (Latin >60% → English).
 * "hebrew" or anything else → null (server default, Hebrew).
 */
function resolveOutputLanguage(pref, inputText) {
  if (pref === 'english') return 'english';
  if (pref !== 'auto') return null;
  const hebrew = (inputText.match(/[\u05D0-\u05EA]/g) || []).length;
  const latin  = (inputText.match(/[a-zA-Z]/g) || []).length;
  const total  = hebrew + latin;
  return total > 0 && latin / total > 0.6 ? 'english' : null;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Detect which AI chat platform the user is currently on and return the
 * matching `target_model` value expected by /api/enhance. The server uses
 * this to tune output for the target platform — e.g., ChatGPT likes
 * numbered lists, Claude likes XML-style delimiters, Gemini likes
 * markdown headers. Defaults to 'general' on unknown hosts.
 */
async function detectTargetModel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || "";
    const host = url ? new URL(url).hostname : "";
    const path = url ? new URL(url).pathname : "";
    if (/chat\.openai\.com|chatgpt\.com/.test(host)) return "chatgpt";
    if (/claude\.ai/.test(host)) return "claude";
    if (/gemini\.google\.com/.test(host)) return "gemini";
    if (/grok\.com/.test(host) || (/x\.com/.test(host) && /\/i\/grok/.test(path))) return "grok";
    if (/copilot\.microsoft\.com/.test(host)) return "copilot";
    if (/poe\.com/.test(host)) return "poe";
    if (/chat\.deepseek\.com/.test(host)) return "deepseek";
    if (/perplexity\.ai/.test(host)) return "perplexity";
    if (/chat\.mistral\.ai/.test(host)) return "mistral";
  } catch {
    // Permission denied or invalid URL — silently fall through.
  }
  return "general";
}

/**
 * Extract a complete JSON object from a text stream using brace-matched
 * parsing. Used when the enhanced output is expected to be JSON (image
 * platforms like Stable Diffusion / Nano Banana). Replaces the naive
 * `split("[GENIUS_QUESTIONS]")[0]` approach which could cut mid-JSON if
 * the model accidentally emits that marker inside a string value.
 *
 * Returns the text unchanged if no opening brace is found.
 */
function extractJSONFromStream(raw) {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  if (firstBrace === -1) return trimmed;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(firstBrace, i + 1);
    }
  }
  // Unterminated — return what we have so far so the UI still shows progress
  return trimmed.slice(firstBrace);
}
let selectedMode = "STANDARD";
let selectedImagePlatform = "general";
let selectedVideoPlatform = "general";
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

  // ═════════ ANTI-GAMING SIGNALS (synced with web EnhancedScorer) ═════════

  // 11. Buzzword inflation penalty (-5 if >= 3 vague superlatives with no
  //     concrete spec to back them up). Mirrors the web scorer's clarity
  //     dimension rule added after users started submitting prompts like
  //     "world-class premium comprehensive professional content".
  const buzzwords = /\u05DE\u05E7\u05E6\u05D5\u05E2\u05D9|\u05DE\u05E7\u05D9\u05E3|\u05D0\u05D9\u05DB\u05D5\u05EA\u05D9|\u05DE\u05E6\u05D5\u05D9\u05DF|\u05D9\u05D5\u05E6\u05D0 \u05D3\u05D5\u05E4\u05DF|\u05D1\u05E8\u05DE\u05D4 \u05D4\u05D2\u05D1\u05D5\u05D4\u05D4|world-class|premium|expert|best-in-class|cutting-edge|state-of-the-art|top-tier|high-quality|excellent|outstanding|superior|advanced|comprehensive|professional|innovative|revolutionary|unique/gi;
  const buzzMatches = text.match(buzzwords) || [];
  const hasConcreteSpec = /\d+\s*(\u05DE\u05D9\u05DC\u05D9\u05DD|\u05E9\u05D5\u05E8\u05D5\u05EA|\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA|words|lines|items|points|bullets|sentences)/i.test(text);
  if (buzzMatches.length >= 3 && !hasConcreteSpec) {
    total -= 5;
    tips.push('\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05DE\u05D9\u05DC\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA — \u05D4\u05D7\u05DC\u05E3 \u05D1\u05DE\u05E1\u05E4\u05E8\u05D9\u05DD \u05E7\u05D5\u05E0\u05E7\u05E8\u05D8\u05D9\u05D9\u05DD');
  }

  // 12. Contradiction detection (-3 per pair). Brevity vs high word count,
  //     no-table vs in-table, no-list vs list-of, concise vs long.
  const contradictionPairs = [
    [/(\u05E7\u05E6\u05E8|short|brief|concise)/i, /\b([5-9]\d{2,}|[1-9]\d{3,})\b/],
    [/(\u05D1\u05DC\u05D9|\u05DC\u05DC\u05D0|without|no)\s*\u05D8\u05D1\u05DC\u05D4|no\s+table/i, /(\u05D1\u05D8\u05D1\u05DC\u05D4|in\s+a?\s*table|table\s+format)/i],
    [/(\u05E7\u05E6\u05E8|concise|brief)/i, /(\u05D0\u05E8\u05D5\u05DA|\u05DE\u05E4\u05D5\u05E8\u05D8 \u05DE\u05D0\u05D5\u05D3|long|extensive|comprehensive)/i],
  ];
  let contradictions = 0;
  for (const [a, b] of contradictionPairs) {
    if (a.test(text) && b.test(text)) contradictions++;
  }
  if (contradictions > 0) {
    total -= contradictions * 3;
    tips.push('\u05E1\u05EA\u05D9\u05E8\u05D4 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA (\u05DC\u05DE\u05E9\u05DC "\u05E7\u05E6\u05E8" + \u05DE\u05E1\u05E4\u05E8 \u05DE\u05D9\u05DC\u05D9\u05DD \u05D2\u05D1\u05D5\u05D4)');
  }

  // 13. Specificity-per-task: if specificity already gave 3 pts for a
  //     number but the number is free-floating (not tied to a quantity
  //     keyword), downgrade the credit. Same logic as the web scorer.
  const hasFreeFloatingNumber = /\d+/.test(text) && !hasConcreteSpec;
  if (hasFreeFloatingNumber && spec >= 3) {
    total -= 2; // Trim the specificity bonus from 3 → 1 for loose numbers
  }

  // ═════════ DIMENSIONS SYNCED FROM WEB enhanced-scorer.ts ═════════
  // These 3 dimensions existed only in the web scorer. Porting them
  // here closes the parity gap so extension scores match the web app.

  // 14. Groundedness (up to 8 pts) — anti-hallucination instructions.
  let grounded = 0;
  if (/\u05E6\u05D8\u05D8|\u05DE\u05E7\u05D5\u05E8|cite|source|reference|based\s+on/i.test(text)) grounded += 3;
  if (/\u05D0\u05DD \u05DC\u05D0 \u05D1\u05D8\u05D5\u05D7|\u05D0\u05DC \u05EA\u05DE\u05E6\u05D9\u05D0|don'?t\s+fabricate|if\s+unsure|i\s+don'?t\s+know|\u05D4\u05E1\u05EA\u05DE\u05DA \u05E2\u05DC/i.test(text)) grounded += 3;
  if (/\u05E2\u05D5\u05D1\u05D3\u05D5\u05EA|fact|ground|\u05D0\u05DE\u05EA|verify/i.test(text)) grounded += 2;
  total += Math.min(8, grounded);
  if (grounded === 0 && wc > 15) {
    tips.push('\u05D4\u05D5\u05E1\u05E3 \u05D4\u05D5\u05E8\u05D0\u05D5\u05EA \u05E0\u05D2\u05D3 \u05D4\u05D6\u05D9\u05D5\u05EA ("\u05D0\u05DD \u05D0\u05D9\u05E0\u05DA \u05D1\u05D8\u05D5\u05D7 - \u05E6\u05D9\u05D9\u05DF")');
  }

  // 15. Measurability (up to 6 pts) — numeric success criteria + bounds.
  let measure = 0;
  if (/\d+\s*(\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD|\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA|\u05E9\u05D5\u05E8\u05D5\u05EA|\u05E4\u05E1\u05E7\u05D0\u05D5\u05EA|bullets|items|sentences|paragraphs|points)/i.test(text)) measure += 3;
  if (/\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD|\u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8|up\s+to|at\s+most|\u05EA\u05E7\u05E8\u05D4|ceiling|limit/i.test(text)) measure += 2;
  if (/\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD|\u05DC\u05E4\u05D7\u05D5\u05EA|at\s+least|minimum/i.test(text)) measure += 1;
  total += Math.min(6, measure);

  // 16. Framework (up to 8 pts) — CO-STAR / RISEN / Hebrew structure.
  const costarMatches = (text.match(/context|objective|style|tone|audience|response\s+format/gi) || []).length;
  const risenMatches = (text.match(/role|instructions|steps|expectations|narrowing|end\s+goal/gi) || []).length;
  const hebrewFramework = /\u05EA\u05E4\u05E7\u05D9\u05D3|\u05DE\u05E9\u05D9\u05DE\u05D4|\u05E9\u05DC\u05D1\u05D9\u05DD|\u05D4\u05D2\u05D1\u05DC\u05D5\u05EA|\u05D8\u05D5\u05DF|\u05E4\u05D5\u05E8\u05DE\u05D8 \u05E4\u05DC\u05D8|\u05E7\u05D4\u05DC \u05D9\u05E2\u05D3|\u05DE\u05D8\u05E8\u05D4/i.test(text);
  let framework = 0;
  if (costarMatches >= 4) framework = 8;
  else if (risenMatches >= 3) framework = 7;
  else if (costarMatches >= 2 || risenMatches >= 2) framework = 4;
  else if (hebrewFramework) framework = 3;
  total += framework;

  // Hedge penalty (synced with web clarity dimension)
  const hedgeCount = (text.match(/\u05D0\u05D5\u05DC\u05D9|\u05E0\u05E1\u05D4 \u05DC|\u05D9\u05D9\u05EA\u05DB\u05DF|\u05D0\u05E4\u05E9\u05E8|maybe|perhaps|try\s+to|somewhat|kind\s+of|sort\s+of/gi) || []).length;
  if (hedgeCount > 0) {
    total -= Math.min(6, hedgeCount * 2);
    if (hedgeCount >= 2) tips.push('\u05D4\u05D5\u05E8\u05D0\u05D5\u05EA \u05DE\u05D4\u05D5\u05E1\u05E1\u05D5\u05EA ("\u05D0\u05D5\u05DC\u05D9", "\u05E0\u05E1\u05D4") \u05DE\u05D7\u05DC\u05D9\u05E9\u05D5\u05EA \u05D0\u05EA \u05D4\u05EA\u05D5\u05E6\u05D0\u05D4');
  }

  // Max is 100 (extra dimensions push the raw total higher; cap to 100)
  const score = Math.max(0, Math.min(100, total));

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

/**
 * Restore the user's last-used enhancement settings from chrome.storage.
 * Keeps the popup feeling like a continuation of the previous session
 * instead of resetting to STANDARD/Professional every time.
 */
function updateLangToggle(langPref) {
  const btn = $('lang-toggle-btn');
  if (!btn) return;
  const labels = { hebrew: 'HE', english: 'EN', auto: 'AUTO' };
  btn.textContent = labels[langPref] || 'HE';
  btn.classList.toggle('lang-en', langPref === 'english');
}

async function restoreLastUsedSettings() {
  try {
    const { peroot_last_mode, peroot_last_tone, peroot_last_image_platform, peroot_last_video_platform, peroot_output_language } =
      await chrome.storage.local.get([
        "peroot_last_mode",
        "peroot_last_tone",
        "peroot_last_image_platform",
        "peroot_last_video_platform",
        "peroot_output_language",
      ]);

    updateLangToggle(peroot_output_language || 'hebrew');

    // Only restore Pro-gated modes if the user is actually Pro — otherwise
    // fall back to STANDARD. This avoids a locked-mode selected state.
    if (peroot_last_mode) {
      const isStandard = peroot_last_mode === "STANDARD";
      if (isStandard || isProOrAdmin()) {
        selectedMode = peroot_last_mode;
        document.querySelectorAll(".mode-btn").forEach(b => {
          b.classList.toggle("active", b.dataset.mode === peroot_last_mode);
        });
        togglePlatformSelectors();
      }
    }
    if (peroot_last_tone) {
      selectedTone = peroot_last_tone;
      document.querySelectorAll(".tone-chip").forEach(c => {
        c.classList.toggle("active", c.dataset.tone === peroot_last_tone);
      });
    }
    if (peroot_last_image_platform) {
      selectedImagePlatform = peroot_last_image_platform;
      document.querySelectorAll(".platform-chip[data-iplatform]").forEach(c => {
        c.classList.toggle("active", c.dataset.iplatform === peroot_last_image_platform);
      });
    }
    if (peroot_last_video_platform) {
      selectedVideoPlatform = peroot_last_video_platform;
      document.querySelectorAll(".platform-chip[data-vplatform]").forEach(c => {
        c.classList.toggle("active", c.dataset.vplatform === peroot_last_video_platform);
      });
    }
  } catch {
    /* storage unavailable — proceed with defaults */
  }
}

/**
 * Persist the user's current enhancement settings. Called on every
 * successful enhance so the next popup open continues where they left off.
 */
function persistLastUsedSettings() {
  try {
    chrome.storage.local.set({
      peroot_last_mode: selectedMode,
      peroot_last_tone: selectedTone,
      peroot_last_image_platform: selectedImagePlatform,
      peroot_last_video_platform: selectedVideoPlatform,
    });
  } catch {
    /* non-critical */
  }
}

/**
 * Apply the user's theme preference (from the options page) BEFORE paint
 * so there is no flash of the wrong theme. Reads from chrome.storage.sync
 * (with local fallback for compatibility).
 */
async function applyThemePreference() {
  try {
    const store = chrome.storage.sync || chrome.storage.local;
    const { peroot_theme_pref } = await new Promise((resolve) =>
      store.get(["peroot_theme_pref"], resolve)
    );
    if (peroot_theme_pref === "light" || peroot_theme_pref === "dark") {
      document.documentElement.setAttribute("data-peroot-theme", peroot_theme_pref);
    }
  } catch { /* ignore */ }
}
// Fire-and-forget at module load for earliest possible theme application.
applyThemePreference();

document.addEventListener("DOMContentLoaded", async () => {
  await applyThemePreference();
  const auth = await checkAuth();

  if (auth.authenticated) {
    show(mainScreen);
    setTimeout(() => promptInput.focus(), 80);
    fetchCredits();
    detectSelectedText();
    // Restore after auth check so isProOrAdmin() has the tier loaded.
    // fetchCredits sets userTier async, so we queue the restore a tick later.
    setTimeout(restoreLastUsedSettings, 300);
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
      const tierLabels = { free: "FREE", pro: "PRO", premium: "PRO", admin: "ADMIN" };
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
const tabButtons = Array.from(document.querySelectorAll(".tab"));

function activateTab(tab) {
  if (!tab) return;
  tabButtons.forEach((t) => {
    const isActive = t === tab;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
    t.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll(".tab-content").forEach((c) => {
    c.classList.remove("active");
    c.hidden = true;
  });
  const target = tab.dataset.tab;
  const panel = $(`tab-${target}`);
  if (panel) {
    panel.classList.add("active");
    panel.hidden = false;
  }

  // Lazy-load data
  if (target === "library" && !libraryLoaded) loadLibrary();
  if (target === "favorites" && !favoritesLoaded) loadFavorites();
  if (target === "history" && !historyTabLoaded) loadHistoryTab();
}

tabButtons.forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (e) => {
    const idx = tabButtons.indexOf(tab);
    let nextIdx = -1;
    // Respect RTL: ArrowLeft = forward in LTR tab order
    if (e.key === "ArrowRight") nextIdx = (idx - 1 + tabButtons.length) % tabButtons.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx + 1) % tabButtons.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = tabButtons.length - 1;
    if (nextIdx !== -1) {
      e.preventDefault();
      const nextTab = tabButtons[nextIdx];
      activateTab(nextTab);
      nextTab.focus();
    }
  });
});

// ═══ SETTINGS TOGGLE ═══
$("settings-toggle").addEventListener("click", () => {
  const panel = $("settings-panel");
  const isOpen = panel.classList.toggle("open");
  $("settings-toggle").setAttribute("aria-expanded", isOpen ? "true" : "false");
});

// ═══ VERSION + MODEL BADGE WIRING ═══
try {
  const versionEl = $("ext-version");
  if (versionEl) {
    const v = chrome.runtime.getManifest().version;
    versionEl.textContent = `v${v}`;
  }
} catch { /* ignore */ }

function updateTargetModelBadge(model) {
  const el = $("target-model-badge");
  if (!el) return;
  if (!model || model === "general") {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  const labels = {
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
  el.textContent = `✦ ${labels[model] || model}`;
  el.classList.remove("hidden");
}

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
  // Eagerly detect target model so the user sees which LLM UI we're tuned
  // for before they even hit Enhance.
  detectTargetModel().then((m) => {
    detectedTargetModel = m;
    updateTargetModelBadge(m);
    // Show mode suggestion after credits/tier are loaded (300ms after restoreLastUsedSettings)
    setTimeout(() => maybeShowModeSuggestion(m), 400);
  }).catch(() => {});
  // First-run onboarding — show once after the first successful login.
  maybeShowFirstRunOnboarding();
}

/**
 * Show a one-time onboarding toast with keyboard shortcut + options hints.
 * Skipped after the first dismissal (stored in chrome.storage.local).
 */
async function maybeShowFirstRunOnboarding() {
  try {
    const { peroot_onboarded } = await chrome.storage.local.get("peroot_onboarded");
    if (peroot_onboarded) return;

    const toast = document.createElement("div");
    toast.className = "peroot-onboard-toast";
    toast.setAttribute("role", "dialog");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
      <div class="peroot-onboard-inner">
        <div class="peroot-onboard-title">✦ ברוך הבא ל-Peroot</div>
        <ul class="peroot-onboard-list">
          <li><kbd>Alt+Shift+E</kbd> — שדרג טקסט מסומן בכל אתר</li>
          <li><kbd>Alt+P</kbd> — פתח את התוסף בכל רגע</li>
          <li>גש ל <a href="#" id="peroot-onboard-options">הגדרות</a> כדי לקבוע ברירות מחדל וערכת צבעים</li>
        </ul>
        <button class="peroot-onboard-dismiss" type="button">הבנתי</button>
      </div>
    `;
    document.body.appendChild(toast);

    const dismiss = () => {
      toast.classList.add("peroot-onboard-leave");
      setTimeout(() => toast.remove(), 250);
      chrome.storage.local.set({ peroot_onboarded: true });
    };
    toast.querySelector(".peroot-onboard-dismiss").addEventListener("click", dismiss);
    toast.querySelector("#peroot-onboard-options").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
      dismiss();
    });
  } catch { /* ignore — non-critical */ }
}

/**
 * Show a dismissable mode suggestion banner when the active platform suggests
 * a better mode than the current one. Only shown for Pro users (mode is gated).
 * Auto-dismisses after 6 seconds.
 */
function maybeShowModeSuggestion(targetModel) {
  const existing = document.getElementById('mode-suggestion-banner');
  if (existing) existing.remove();

  // Map platform → suggested mode and label
  const suggestions = {
    perplexity: { mode: 'DEEP_RESEARCH', label: 'מזהה Perplexity — נסה מצב מחקר מעמיק' },
  };

  const suggestion = suggestions[targetModel];
  if (!suggestion) return;
  // Only suggest if the user is on the default STANDARD mode and is Pro
  if (selectedMode !== 'STANDARD') return;
  if (!isProOrAdmin()) return;

  const banner = document.createElement('div');
  banner.id = 'mode-suggestion-banner';
  banner.className = 'mode-suggestion-banner';
  banner.innerHTML = `
    <span>${suggestion.label}</span>
    <button id="mode-suggestion-apply" title="החל מצב">✦</button>
    <button id="mode-suggestion-dismiss" title="סגור">✕</button>
  `;

  const modeSelector = document.getElementById('mode-selector');
  modeSelector?.after(banner);

  const dismiss = () => banner.remove();

  banner.querySelector('#mode-suggestion-apply').addEventListener('click', () => {
    // Activate the suggested mode button
    const modeBtn = document.querySelector(`.mode-btn[data-mode="${suggestion.mode}"]`);
    if (modeBtn && !modeBtn.classList.contains('locked')) {
      modeBtn.click();
    }
    dismiss();
  });
  banner.querySelector('#mode-suggestion-dismiss').addEventListener('click', dismiss);

  // Auto-dismiss after 6 seconds
  setTimeout(dismiss, 6000);
}

/**
 * Parse [GENIUS_QUESTIONS] from a raw enhance response stream.
 * Returns parsed JSON array or [] on failure.
 */
function parseGeniusQuestions(raw) {
  const marker = "[GENIUS_QUESTIONS]";
  const idx = raw.indexOf(marker);
  if (idx === -1) return [];
  const jsonStr = raw.slice(idx + marker.length).trim();
  if (!jsonStr || jsonStr === "[]") return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Render top GENIUS_QUESTIONS as clickable chips below the result.
 * Each question shows example answers — clicking one fires a refinement.
 */
function showRefinementQuestions(questions) {
  const section = $('refinement-section');
  const container = $('refinement-questions');
  if (!section || !container) return;

  container.innerHTML = '';

  if (!questions || questions.length === 0) {
    section.classList.add('hidden');
    return;
  }

  const top = [...questions]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 3);

  top.forEach((q) => {
    const item = document.createElement('div');
    item.className = 'refinement-question';

    const qRow = document.createElement('div');
    qRow.className = 'refinement-q-row';

    const qText = document.createElement('span');
    qText.className = 'refinement-q-text';
    qText.textContent = q.question || '';
    qRow.appendChild(qText);

    if (q.impactEstimate) {
      const badge = document.createElement('span');
      badge.className = 'refinement-impact';
      badge.textContent = q.impactEstimate;
      qRow.appendChild(badge);
    }

    item.appendChild(qRow);

    const examples = (q.examples || []).slice(0, 3);
    if (examples.length > 0) {
      const chips = document.createElement('div');
      chips.className = 'refinement-examples';
      examples.forEach((example) => {
        const chip = document.createElement('button');
        chip.className = 'refinement-chip';
        chip.textContent = example;
        chip.addEventListener('click', () => refinePrompt(q.question, example, String(q.id || q.question.slice(0, 40))));
        chips.appendChild(chip);
      });
      item.appendChild(chips);
    }

    container.appendChild(item);
  });

  section.classList.remove('hidden');
}

/**
 * Fire a refinement enhance call using GENIUS_QUESTIONS answer.
 * Sends previousResult + refinementInstruction to trigger generateRefinement().
 */
async function refinePrompt(question, answer, questionKey) {
  if (isEnhancing || !lastEnhanced) return;

  $('refinement-section')?.classList.add('hidden');
  $('feedback-row')?.classList.add('hidden');
  hideError();
  resultText.classList.add("streaming");
  setLoading(true);
  isEnhancing = true;

  // Reset timer for the refinement call
  if (timerInterval) clearInterval(timerInterval);
  const refineStart = Date.now();
  resultTimer.textContent = "0.0s";
  timerInterval = setInterval(() => {
    resultTimer.textContent = ((Date.now() - refineStart) / 1000).toFixed(1) + "s";
  }, 100);

  try {
    const stored = await new Promise(r =>
      chrome.storage.local.get(['peroot_last_tone', 'peroot_last_mode', 'peroot_output_language'], r)
    );
    const tone = stored.peroot_last_tone || selectedTone;
    const mode = stored.peroot_last_mode || selectedMode;
    const outputLang = resolveOutputLanguage(stored.peroot_output_language || 'hebrew', promptInput.value || lastOriginalForFeedback);

    const refinementInstruction = `שאלה: ${question}\nתשובה: ${answer}`;
    const answers = { [questionKey || question.slice(0, 50)]: answer };

    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
    const res = await fetchWithTimeout(`${API_BASE}/api/enhance`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: promptInput.value || lastOriginalForFeedback,
        tone,
        category: "כללי",
        capability_mode: mode,
        target_model: detectedTargetModel,
        previousResult: lastEnhanced,
        refinementInstruction,
        answers,
        ...(outputLang === 'english' && { output_language: 'english' }),
      }),
    }, 90000);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) showError(err.error || "אין מספיק קרדיטים");
      else if (res.status === 401) showError("פג תוקף ההתחברות. נסה שוב.");
      else showError(err.error || "שגיאה בשדרוג");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    const cleanDisplay = (raw) => raw
      .split("[GENIUS_QUESTIONS]")[0]
      .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/g, "")
      .replace(/<internal_quality_check[\s\S]*?<\/internal_quality_check>/g, "")
      .trim();

    resultSection.classList.remove("hidden");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      resultText.textContent = cleanDisplay(fullText);
      resultText.scrollTop = resultText.scrollHeight;
    }

    resultText.classList.remove("streaming");
    lastEnhanced = cleanDisplay(fullText);

    // Show feedback row for new result
    const feedbackRow = $('feedback-row');
    if (feedbackRow) {
      feedbackRow.classList.remove('hidden');
      const upBtn = $('feedback-up-btn');
      const downBtn = $('feedback-down-btn');
      if (upBtn) { upBtn.disabled = false; upBtn.classList.remove('voted-up', 'voted-down'); }
      if (downBtn) { downBtn.disabled = false; downBtn.classList.remove('voted-up', 'voted-down'); }
    }

    // Parse new questions from refined result
    showRefinementQuestions(parseGeniusQuestions(fullText));

    try { await navigator.clipboard.writeText(lastEnhanced); } catch {}
    fetchCredits();
  } catch (err) {
    if (err?.name === "AbortError") showError("הבקשה נתקעה יותר מדי זמן. נסה שוב.");
    else showError(err?.message ? `שגיאה: ${err.message}` : "שגיאת רשת. בדוק את החיבור.");
  } finally {
    clearInterval(timerInterval);
    isEnhancing = false;
    setLoading(false);
  }
}

/**
 * Submit thumbs up/down feedback for the last enhancement.
 * One-shot: disables both buttons after first vote.
 */
async function submitFeedback(rating) {
  const upBtn = $('feedback-up-btn');
  const downBtn = $('feedback-down-btn');
  if (!upBtn || !downBtn) return;

  upBtn.disabled = true;
  downBtn.disabled = true;
  upBtn.classList.toggle('voted-up', rating > 0);
  downBtn.classList.toggle('voted-down', rating < 0);

  try {
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rating,
        input_text: lastOriginalForFeedback.substring(0, 10000),
        enhanced_text: lastEnhanced.substring(0, 50000),
        capability_mode: selectedMode,
      }),
    });
  } catch {
    // Non-critical — feedback send failure is silent
  }
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
  $('feedback-row')?.classList.add('hidden');
  $('refinement-section')?.classList.add('hidden');
  setLoading(true);

  // Phase-based loading messages
  const phases = [
    { text: '\u2726 \u05DE\u05E0\u05EA\u05D7 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8...', delay: 0 },
    { text: '\u25C8 \u05DE\u05E9\u05D3\u05E8\u05D2 \u05E2\u05DD AI...', delay: 2500 },
    { text: '\u2605 \u05DB\u05DE\u05E2\u05D8 \u05DE\u05D5\u05DB\u05DF...', delay: 5000 },
  ];
  let phaseInterval = null;
  let phaseIndex = 0;

  // Show first phase immediately
  enhanceLabel.textContent = phases[0].text;
  enhanceLabel.classList.remove("hidden");
  enhanceSpinner.classList.remove("hidden");

  // Cycle through phases
  phaseInterval = setInterval(() => {
    phaseIndex++;
    if (phaseIndex < phases.length) {
      enhanceLabel.textContent = phases[phaseIndex].text;
    }
  }, 2500);

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

    // Sync target_model from the active tab so the server tunes output
    // for the platform the user is actually sitting on.
    if (detectedTargetModel === "general") {
      detectedTargetModel = await detectTargetModel();
    }

    // Read output language preference and resolve against the actual input text
    const { peroot_output_language } = await new Promise(r =>
      chrome.storage.local.get(['peroot_output_language'], r)
    );
    const outputLang = resolveOutputLanguage(peroot_output_language || 'hebrew', text);

    const res = await fetchWithTimeout(`${API_BASE}/api/enhance`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: text,
        tone: selectedTone,
        category: "\u05DB\u05DC\u05DC\u05D9",
        capability_mode: selectedMode,
        target_model: detectedTargetModel,
        ...(outputLang === 'english' && { output_language: 'english' }),
        ...(selectedMode === "IMAGE_GENERATION" && { mode_params: { image_platform: selectedImagePlatform } }),
        ...(selectedMode === "VIDEO_GENERATION" && { mode_params: { video_platform: selectedVideoPlatform } }),
      }),
    });

    if (!res.ok) {
      clearInterval(phaseInterval);
      enhanceLabel.textContent = '\u05E9\u05D3\u05E8\u05D2';
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

    // JSON mode is expected for Stable Diffusion and Nano Banana image
    // platforms. For these we extract the first balanced JSON object
    // instead of relying on the greedy [GENIUS_QUESTIONS] split — the
    // model can emit that marker inside a string value, which used to
    // destroy valid JSON.
    const isJsonMode = selectedMode === "IMAGE_GENERATION" &&
      (selectedImagePlatform === "stable-diffusion" || selectedImagePlatform === "nanobanana");

    const cleanDisplay = (raw) => {
      if (isJsonMode) return extractJSONFromStream(raw);
      return raw
        .split("[GENIUS_QUESTIONS]")[0]
        .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/g, "")
        // CRITICAL: strip the <internal_quality_check> self-review block
        // that the engine injects for the model to verify its own output
        // against platform-specific criteria. Without this strip the
        // user sees the raw XML block leaking into the Copy action and
        // into the displayed result. ai-chat-injector.js does the same.
        .replace(/<internal_quality_check[\s\S]*?<\/internal_quality_check>/g, "")
        .trim();
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      const display = cleanDisplay(fullText);
      resultText.textContent = display;
      resultText.scrollTop = resultText.scrollHeight;
    }

    resultText.classList.remove("streaming");
    lastEnhanced = cleanDisplay(fullText);
    lastOriginalForFeedback = text;
    enhanceRetried = false; // Reset retry flag on success

    clearInterval(phaseInterval);
    enhanceLabel.textContent = '\u05E9\u05D3\u05E8\u05D2';

    // Parse and surface GENIUS_QUESTIONS for one-click iterative refinement
    showRefinementQuestions(parseGeniusQuestions(fullText));

    // Show feedback row (reset state for this new enhancement)
    const feedbackRow = $('feedback-row');
    const upBtn = $('feedback-up-btn');
    const downBtn = $('feedback-down-btn');
    if (feedbackRow) {
      feedbackRow.classList.remove('hidden');
      if (upBtn) { upBtn.disabled = false; upBtn.classList.remove('voted-up', 'voted-down'); }
      if (downBtn) { downBtn.disabled = false; downBtn.classList.remove('voted-up', 'voted-down'); }
    }

    // Score comparison flash
    const beforeScore = scorePrompt(text);
    const afterScore = scorePrompt(lastEnhanced);
    if (afterScore.score > beforeScore.score) {
      const scoreFlash = document.createElement('div');
      scoreFlash.className = 'score-flash';
      scoreFlash.innerHTML = `<span class="score-before">${beforeScore.score}%</span> \u2192 <span class="score-after">${afterScore.score}%</span>`;
      resultSection.prepend(scoreFlash);
      setTimeout(() => scoreFlash.remove(), 4000);
    }

    // Auto-copy to clipboard
    try {
      await navigator.clipboard.writeText(lastEnhanced);
      flash(copyBtn, "הועתק!");
    } catch {}

    saveToHistory(text, lastEnhanced);
    // Persist the user's current settings so next popup open continues
    // from the same mode/tone/platform instead of resetting to defaults.
    persistLastUsedSettings();
    // Note: syncToWebsite removed — /api/enhance already saves to history server-side
    fetchCredits(); // refresh credits after use
  } catch (err) {
    clearInterval(phaseInterval);
    enhanceLabel.textContent = '\u05E9\u05D3\u05E8\u05D2';
    resultSection.classList.add("hidden");
    // Surface the real failure instead of a generic "network error" —
    // AbortError (timeout), TypeError (DNS), and named server errors
    // all deserve distinct messages so users can self-diagnose.
    if (err?.name === "AbortError") {
      showError("הבקשה נתקעה יותר מדי זמן. נסה שוב.");
    } else if (err?.message?.includes("Failed to fetch")) {
      showError("אין חיבור לשרת. בדוק את החיבור לאינטרנט.");
    } else {
      showError(err?.message ? `שגיאה: ${err.message}` : "שגיאת רשת. בדוק את החיבור.");
    }
  } finally {
    clearInterval(phaseInterval);
    isEnhancing = false;
    clearInterval(timerInterval);
    setLoading(false);
  }
}

function setLoading(on) {
  enhanceBtn.disabled = on;
  if (on) {
    // During loading, show both label (phase text) and spinner
    enhanceLabel.classList.remove("hidden");
    enhanceSpinner.classList.remove("hidden");
  } else {
    // When done, show label (reset to default text), hide spinner
    enhanceLabel.textContent = '\u05E9\u05D3\u05E8\u05D2';
    enhanceLabel.classList.remove("hidden");
    enhanceSpinner.classList.add("hidden");
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

  actions.appendChild(useBtn);
  actions.appendChild(copyCardBtn);

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
function isProOrAdmin() {
  return userTier === 'pro' || userTier === 'premium' || userTier === 'admin';
}

function updateModeButtons() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const mode = btn.dataset.mode;
    const isLocked = mode !== 'STANDARD' && !isProOrAdmin();
    btn.classList.toggle('locked', isLocked);
    // Show/hide lock badge
    const lock = btn.querySelector('.mode-lock');
    if (lock) lock.style.display = isLocked ? '' : 'none';
  });
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode !== 'STANDARD' && !isProOrAdmin()) {
      showError('שדרג ל-Pro כדי לפתוח מצבים מתקדמים');
      return;
    }
    selectedMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Bounce animation
    btn.classList.add('mode-switching');
    btn.addEventListener('animationend', () => btn.classList.remove('mode-switching'), { once: true });
    // Toggle platform selectors based on mode
    togglePlatformSelectors();
  });
});

// ═══ PLATFORM SELECTORS (Image + Video) ═══
const imagePlatformSelector = $("image-platform-selector");
const videoPlatformSelector = $("video-platform-selector");

function togglePlatformSelectors() {
  if (selectedMode === "IMAGE_GENERATION") {
    imagePlatformSelector.classList.remove("hidden");
    videoPlatformSelector.classList.add("hidden");
  } else if (selectedMode === "VIDEO_GENERATION") {
    videoPlatformSelector.classList.remove("hidden");
    imagePlatformSelector.classList.add("hidden");
  } else {
    imagePlatformSelector.classList.add("hidden");
    videoPlatformSelector.classList.add("hidden");
  }
}

document.querySelectorAll('.platform-chip[data-iplatform]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.platform-chip[data-iplatform]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedImagePlatform = chip.dataset.iplatform;
  });
});

document.querySelectorAll('.platform-chip[data-vplatform]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.platform-chip[data-vplatform]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedVideoPlatform = chip.dataset.vplatform;
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

// ═══ LANGUAGE TOGGLE ═══
$('lang-toggle-btn')?.addEventListener('click', () => {
  chrome.storage.local.get(['peroot_output_language'], ({ peroot_output_language }) => {
    const cycle = { hebrew: 'english', english: 'auto', auto: 'hebrew' };
    const next = cycle[peroot_output_language || 'hebrew'] || 'english';
    chrome.storage.local.set({ peroot_output_language: next });
    updateLangToggle(next);
  });
});

// ═══ FEEDBACK ═══
$('feedback-up-btn')?.addEventListener('click', () => submitFeedback(1));
$('feedback-down-btn')?.addEventListener('click', () => submitFeedback(-1));

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
