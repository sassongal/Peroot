/**
 * Peroot Extension - Content Script (injected on demand)
 * Handles: right-click enhance panel, text insertion from popup.
 * Auth: reads token from chrome.storage (synced by auth-sync.js on peroot.space).
 *
 * This script is injected programmatically by the service worker when needed.
 * It must be idempotent - safe to inject multiple times.
 */

// Guard against double-injection
if (!window.__peerootContentLoaded) {
  window.__peerootContentLoaded = true;

  let currentPanel = null;
  let lastEnhanced = "";
  let lastSelectionElement = null;
  let isDragging = false;

  // ─── API Proxy (routes through service worker to avoid CORS) ───
  function apiFetch(path, options = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "API_FETCH",
        path,
        method: options.method || "GET",
        body: options.body || null,
        stream: options.stream || false,
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, status: 0, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { ok: false, status: 0 });
        }
      });
    });
  }

  // ─── Target Model Detection ───
  // Read the current tab host and map it to /api/enhance's target_model.
  // This tunes the server's output for the platform the user is on —
  // e.g. ChatGPT likes numbered lists, Claude likes XML delimiters.
  function detectTargetModel() {
    const host = location.hostname;
    const path = location.pathname;
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
  const TARGET_MODEL = detectTargetModel();

  // ─── Language Detection ───
  // When preference is "auto", detect the dominant script of the input text.
  // Latin >60% of alphabetic chars → English output; otherwise let server default (Hebrew).
  function resolveOutputLanguage(pref, inputText) {
    if (pref === 'english') return 'english';
    if (pref !== 'auto') return null;
    const hebrew = (inputText.match(/[\u05D0-\u05EA]/g) || []).length;
    const latin  = (inputText.match(/[a-zA-Z]/g) || []).length;
    const total  = hebrew + latin;
    return total > 0 && latin / total > 0.6 ? 'english' : null;
  }

  // ─── Stored Preferences ───
  // Loaded once per script init. Refreshed on each handleEnhance call.
  let storedTone = "Professional";
  let storedLang = "hebrew";
  function loadPrefs(cb) {
    chrome.storage.local.get(
      ['peroot_last_tone', 'peroot_output_language'],
      (prefs) => {
        storedTone = prefs.peroot_last_tone || "Professional";
        storedLang = prefs.peroot_output_language || "hebrew";
        if (cb) cb();
      }
    );
  }
  loadPrefs();

  // ─── Action Definitions ───
  // buildBody receives the actual text so resolveOutputLanguage can do
  // per-call auto-detection when the preference is set to "auto".
  const ACTIONS = {
    enhance: {
      label: "\u05E9\u05D3\u05E8\u05D2",
      buildBody: (text) => {
        const lang = resolveOutputLanguage(storedLang, text);
        return {
          prompt: text, tone: storedTone, category: "כללי",
          target_model: TARGET_MODEL,
          ...(lang === 'english' && { output_language: 'english' }),
        };
      },
    },
    shorten: {
      label: "\u05E7\u05E6\u05E8",
      buildBody: (text) => ({
        prompt: text, tone: storedTone, category: "כללי",
        target_model: TARGET_MODEL,
        refinementInstruction: "Make this significantly shorter and more concise. Keep the core message but remove all unnecessary words. Output ONLY the shortened text.",
        previousResult: text,
      }),
    },
    lengthen: {
      label: "\u05D4\u05D0\u05E8\u05DA",
      buildBody: (text) => ({
        prompt: text, tone: storedTone, category: "כללי",
        target_model: TARGET_MODEL,
        refinementInstruction: "Expand and elaborate on this text. Add more detail, examples, and depth while maintaining the original tone. Output ONLY the expanded text.",
        previousResult: text,
      }),
    },
    fix: {
      label: "\u05EA\u05E7\u05DF",
      buildBody: (text) => ({
        prompt: text, tone: storedTone, category: "כללי",
        target_model: TARGET_MODEL,
        refinementInstruction: "Fix all grammar, spelling, and punctuation errors. Improve sentence structure where needed. Output ONLY the corrected text.",
        previousResult: text,
      }),
    },
    translate: {
      label: "\u05EA\u05E8\u05D2\u05DD",
      buildBody: (text) => ({
        prompt: text, tone: storedTone, category: "כללי",
        target_model: TARGET_MODEL,
        refinementInstruction: "Translate this text to English. If already in English, translate to Hebrew. Output ONLY the translation.",
        previousResult: text,
      }),
    },
    summarize: {
      label: "\u05E1\u05DB\u05DD",
      buildBody: (text) => {
        const lang = resolveOutputLanguage(storedLang, text);
        return {
          prompt: text, tone: storedTone, category: "כללי",
          target_model: TARGET_MODEL,
          refinementInstruction: "Summarize this text into 3-5 key bullet points. Be concise and capture only the essential information. Output ONLY the summary.",
          previousResult: text,
          ...(lang === 'english' && { output_language: 'english' }),
        };
      },
    },
    bullets: {
      label: "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA",
      buildBody: (text) => ({
        prompt: text, tone: storedTone, category: "כללי",
        target_model: TARGET_MODEL,
        refinementInstruction: "Reformat this text as a clean bulleted list. Break it into logical bullet points. Output ONLY the bulleted list.",
        previousResult: text,
      }),
    },
  };

  // ─── Messages ───
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ENHANCE_SELECTION") {
      handleEnhance(message.text, message.action || "enhance");
    }
    if (message.type === "INSERT_TEXT") {
      insertIntoActive(message.text);
    }
    if (message.type === "ENHANCE_KEYBOARD_SHORTCUT") {
      const sel = window.getSelection()?.toString()?.trim();
      if (sel) {
        handleEnhance(sel, "enhance");
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && currentPanel) closePanel();
  });

  // ─── Enhance Flow ───
  function handleEnhance(text, action) {
    lastSelectionElement = document.activeElement;

    const sel = window.getSelection();
    let x = window.innerWidth / 2 - 190;
    let y = 80;

    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      x = Math.min(r.left, window.innerWidth - 400);
      y = r.bottom + 12;
      if (y + 400 > window.innerHeight) y = Math.max(12, r.top - 410);
    }

    const actionDef = ACTIONS[action] || ACTIONS.enhance;
    showPanel(Math.max(12, x), Math.max(12, y), actionDef.label);
    doEnhance(text, action);
  }

  // ─── Panel ───
  function showPanel(x, y, actionLabel) {
    removePanel();

    const p = document.createElement("div");
    p.id = "peroot-panel";
    p.style.cssText = `left:${x}px;top:${y}px`;
    p.innerHTML = `
      <div id="peroot-panel-header">
        <div class="peroot-hl">
          <span class="peroot-dot"></span>
          <span class="peroot-brand">Peroot</span>
          <span class="peroot-status" id="peroot-status">${actionLabel || "\u05DE\u05E9\u05D3\u05E8\u05D2"}...</span>
        </div>
        <button id="peroot-close">&times;</button>
      </div>
      <div id="peroot-body" class="peroot-loading">
        <span class="peroot-spinner"></span>
      </div>
      <div id="peroot-actions" style="display:none">
        <button class="peroot-btn-primary" id="peroot-copy">\u05D4\u05E2\u05EA\u05E7</button>
        <button class="peroot-btn-secondary" id="peroot-replace">\u05D4\u05D7\u05DC\u05E3</button>
      </div>`;

    document.body.appendChild(p);
    currentPanel = p;

    p.querySelector("#peroot-close").onclick = closePanel;

    p.querySelector("#peroot-copy").onclick = async () => {
      await navigator.clipboard.writeText(lastEnhanced);
      flashBtn(p.querySelector("#peroot-copy"), "\u05D4\u05D5\u05E2\u05EA\u05E7!");
    };

    p.querySelector("#peroot-replace").onclick = () => {
      if (replaceSelection(lastEnhanced)) {
        flashBtn(p.querySelector("#peroot-replace"), "\u05D4\u05D5\u05D7\u05DC\u05E3!");
        setTimeout(closePanel, 500);
      } else {
        navigator.clipboard.writeText(lastEnhanced);
        flashBtn(p.querySelector("#peroot-replace"), "\u05D4\u05D5\u05E2\u05EA\u05E7!");
      }
    };

    setTimeout(() => document.addEventListener("mousedown", onOutside), 150);
    initDrag(p);
  }

  function closePanel() {
    if (!currentPanel) return;
    currentPanel.style.animation = "peroot-out 0.12s ease-in forwards";
    setTimeout(removePanel, 120);
  }

  function removePanel() {
    if (currentPanel) { currentPanel.remove(); currentPanel = null; }
    document.removeEventListener("mousedown", onOutside);
  }

  function onOutside(e) {
    if (isDragging) return;
    if (currentPanel && !currentPanel.contains(e.target)) closePanel();
  }

  function flashBtn(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = orig; }, 1200);
  }

  // ─── API Call ───
  async function doEnhance(text, action) {
    const body = currentPanel?.querySelector("#peroot-body");
    const actions = currentPanel?.querySelector("#peroot-actions");
    const status = currentPanel?.querySelector("#peroot-status");
    if (!body) return;

    // Load prefs inside the async function so the storage read always
    // completes before buildBody() reads storedTone/storedLang.
    await new Promise(resolve => loadPrefs(resolve));

    const actionDef = ACTIONS[action] || ACTIONS.enhance;

    try {
      const res = await apiFetch('/api/enhance', {
        method: 'POST',
        body: actionDef.buildBody(text),
        stream: true,
      });

      if (!res.ok) {
        body.classList.remove("peroot-loading");
        body.classList.add("peroot-error");
        if (status) status.textContent = "\u05E9\u05D2\u05D9\u05D0\u05D4";
        body.textContent = res.status === 401
          ? "\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9"
          : res.status === 403
          ? (res.data?.error || "\u05D0\u05D9\u05DF \u05E7\u05E8\u05D3\u05D9\u05D8\u05D9\u05DD")
          : res.status === 429
          ? "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05D1\u05E7\u05E9\u05D5\u05EA"
          : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D3\u05E8\u05D5\u05D2";
        return;
      }

      // Service worker proxy returns full text for stream responses
      const fullText = res.text || '';

      body.classList.remove("peroot-loading");
      body.textContent = "";
      // Strip: [GENIUS_QUESTIONS] trailer, [PROMPT_TITLE] block, AND the
      // <internal_quality_check> self-review XML block. The last one
      // used to leak into the visible output — that's been a long-
      // standing bug in the context-menu flow, finally closed here.
      lastEnhanced = fullText
        .split("[GENIUS_QUESTIONS]")[0]
        .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/g, '')
        .replace(/<internal_quality_check[\s\S]*?<\/internal_quality_check>/g, '')
        .trim();
      body.textContent = lastEnhanced;
      body.scrollTop = body.scrollHeight;

      if (status) status.textContent = "\u05D4\u05D5\u05E9\u05DC\u05DD";
      if (actions) actions.style.display = "flex";

      // Hide replace if not editable
      if (!isEditable(lastSelectionElement)) {
        const rb = currentPanel?.querySelector("#peroot-replace");
        if (rb) rb.style.display = "none";
      }
    } catch {
      body.classList.remove("peroot-loading");
      body.classList.add("peroot-error");
      body.textContent = "\u05E9\u05D2\u05D9\u05D0\u05EA \u05E8\u05E9\u05EA";
      if (status) status.textContent = "\u05E9\u05D2\u05D9\u05D0\u05D4";
    }
  }

  // ─── Sync to Website ───
  // Note: The /api/enhance endpoint already creates history entries server-side.
  // This function is kept only for non-enhance actions (shorten, lengthen, fix, translate)
  // which call the enhance API with refinementInstruction and also get history saved server-side.
  // Therefore, this function is intentionally removed to avoid duplicate history entries.

  // ─── Editable ───
  function isEditable(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "submit"].includes(el.type))) return true;
    return el.isContentEditable;
  }

  function replaceSelection(text) {
    const el = lastSelectionElement;
    if (!el) return false;

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
      const s = el.selectionStart, e = el.selectionEnd;
      setter.call(el, s !== e
        ? el.value.substring(0, s) + text + el.value.substring(e)
        : text
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  function insertIntoActive(text) {
    const el = document.activeElement;
    if (!el) { navigator.clipboard.writeText(text); return; }

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
      const s = el.selectionStart;
      setter.call(el, el.value.substring(0, s) + text + el.value.substring(el.selectionEnd));
      el.selectionStart = el.selectionEnd = s + text.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (el.isContentEditable) {
      document.execCommand("insertText", false, text);
      return;
    }

    navigator.clipboard.writeText(text);
  }

  // ─── Drag ───
  function initDrag(panel) {
    const hdr = panel.querySelector("#peroot-panel-header");
    hdr.addEventListener("mousedown", (e) => {
      if (e.target.id === "peroot-close") return;
      isDragging = true;
      const sx = e.clientX, sy = e.clientY;
      const ox = panel.offsetLeft, oy = panel.offsetTop;
      const move = (e) => {
        panel.style.left = `${ox + e.clientX - sx}px`;
        panel.style.top = `${oy + e.clientY - sy}px`;
      };
      const up = () => {
        setTimeout(() => isDragging = false, 50);
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      e.preventDefault();
    });
  }

  // ─── Inline Enhance Toolbar ───
  // Shows a compact floating toolbar when user focuses a text input with content.
  // Collapsed: shows ⚡ pill. Expanded on hover: reveals action buttons.
  let inlineBtn = null;
  let inlineTarget = null;
  let inlineHideTimer = null;

  // Inject CSS for hover-expand (inline styles can't express :hover transitions)
  (function injectInlineToolbarCSS() {
    if (document.getElementById("peroot-inline-css")) return;
    const s = document.createElement("style");
    s.id = "peroot-inline-css";
    s.textContent = `
      #peroot-inline-toolbar {
        all: initial;
        position: fixed;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        background: #111113;
        border: 1px solid rgba(251,191,36,0.25);
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.55);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s, transform 0.15s;
        pointer-events: auto;
        direction: rtl;
        overflow: hidden;
      }
      #peroot-inline-toolbar .pit-trigger {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        color: #fbbf24;
        white-space: nowrap;
        flex-shrink: 0;
      }
      #peroot-inline-toolbar .pit-actions {
        display: flex;
        align-items: center;
        max-width: 0;
        overflow: hidden;
        transition: max-width 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.18s;
        opacity: 0;
        border-right: 1px solid rgba(251,191,36,0.12);
      }
      #peroot-inline-toolbar:hover .pit-actions {
        max-width: 260px;
        opacity: 1;
      }
      #peroot-inline-toolbar .pit-action-btn {
        all: unset;
        padding: 5px 9px;
        color: #a1a1aa;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.12s, background 0.12s;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 600;
      }
      #peroot-inline-toolbar .pit-action-btn:hover {
        color: #fbbf24;
        background: rgba(251,191,36,0.08);
      }
      #peroot-inline-toolbar .pit-action-btn.pit-primary {
        color: #fbbf24;
      }
      #peroot-inline-toolbar .pit-action-btn.pit-primary:hover {
        color: #fff;
        background: rgba(251,191,36,0.12);
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  })();

  const INLINE_ACTIONS = [
    { key: "enhance",   label: "⚡ שדרג",   primary: true },
    { key: "fix",       label: "✓ תקן" },
    { key: "shorten",   label: "↕ קצר" },
    { key: "lengthen",  label: "↔ הארך" },
    { key: "translate", label: "↯ תרגם" },
    { key: "summarize", label: "≡ סכם" },
    { key: "bullets",   label: "• נקודות" },
  ];

  function createInlineBtn() {
    if (inlineBtn) return inlineBtn;
    const toolbar = document.createElement("div");
    toolbar.id = "peroot-inline-toolbar";

    // Trigger pill (always visible, clicking fires enhance)
    const trigger = document.createElement("div");
    trigger.className = "pit-trigger";
    trigger.innerHTML = `⚡ <span>שדרג</span>`;
    trigger.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!inlineTarget) return;
      const text = getFieldValue(inlineTarget);
      if (text) handleEnhance(text, "enhance");
    });
    toolbar.appendChild(trigger);

    // Action buttons (revealed on hover)
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "pit-actions";
    INLINE_ACTIONS.forEach(({ key, label, primary }) => {
      const btn = document.createElement("button");
      btn.className = "pit-action-btn" + (primary ? " pit-primary" : "");
      btn.textContent = label;
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!inlineTarget) return;
        const text = getFieldValue(inlineTarget);
        if (text) handleEnhance(text, key);
      });
      actionsWrap.appendChild(btn);
    });
    toolbar.appendChild(actionsWrap);

    toolbar.addEventListener("mouseenter", () => clearTimeout(inlineHideTimer));
    toolbar.addEventListener("mouseleave", () => scheduleHideInline());
    document.body.appendChild(toolbar);
    inlineBtn = toolbar;
    return toolbar;
  }

  function getFieldValue(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value.trim();
    if (el.isContentEditable) return el.textContent.trim();
    return "";
  }

  function showInlineBtn(el) {
    clearTimeout(inlineHideTimer);
    const text = getFieldValue(el);
    if (!text || text.length < 10) { hideInlineBtn(); return; }

    inlineTarget = el;
    const btn = createInlineBtn();
    const rect = el.getBoundingClientRect();

    // Position at top-left of field
    let top = rect.top - 32;
    let left = rect.left;
    if (top < 4) top = rect.bottom + 4;
    // Keep collapsed width (≈80px) in-bounds; expanded overflow is fine (RTL direction handles it)
    if (left + 80 > window.innerWidth) left = window.innerWidth - 84;

    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
    requestAnimationFrame(() => {
      btn.style.opacity = "1";
      btn.style.transform = "translateY(0)";
      btn.style.display = "flex";
    });
  }

  function hideInlineBtn() {
    if (!inlineBtn) return;
    inlineBtn.style.opacity = "0";
    inlineBtn.style.transform = "translateY(4px)";
    inlineTarget = null;
  }

  function scheduleHideInline() {
    clearTimeout(inlineHideTimer);
    inlineHideTimer = setTimeout(hideInlineBtn, 300);
  }

  // Skip inline button on peroot.space itself and if user disabled it
  if (!window.location.hostname.includes("peroot.space")) {
    chrome.storage.local.get(['peroot_inline_btn'], (prefs) => {
      // Default: enabled (true). Only skip if explicitly set to false.
      if (prefs.peroot_inline_btn === false) return;

      document.addEventListener("focusin", (e) => {
        const el = e.target;
        if (
          el.tagName === "TEXTAREA" ||
          (el.tagName === "INPUT" && ["text", "search", "url", "email", ""].includes(el.type)) ||
          el.isContentEditable
        ) {
          // Check after short delay to let value populate
          setTimeout(() => showInlineBtn(el), 200);
        }
      }, true);

      document.addEventListener("focusout", () => {
        scheduleHideInline();
      }, true);

      // Update button visibility on input
      document.addEventListener("input", (e) => {
        if (e.target === inlineTarget) {
          showInlineBtn(e.target);
        }
      }, true);
    });
  }
}
