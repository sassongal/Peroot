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

  const API_BASE = "https://peroot.space";

  let currentPanel = null;
  let lastEnhanced = "";
  let lastSelectionElement = null;
  let isDragging = false;

  // ─── Auth: get token from storage ───
  function getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get("peroot_token", (data) => {
        resolve(data.peroot_token || null);
      });
    });
  }

  async function getAuthHeaders(extra = {}) {
    const token = await getAuthToken();
    const headers = { ...extra };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  // ─── Action Definitions ───
  const ACTIONS = {
    enhance: {
      label: "\u05E9\u05D3\u05E8\u05D2",
      buildBody: (text) => ({ prompt: text, tone: "Professional", category: "General" }),
    },
    shorten: {
      label: "\u05E7\u05E6\u05E8",
      buildBody: (text) => ({
        prompt: text, tone: "Professional", category: "General",
        refinementInstruction: "Make this significantly shorter and more concise. Keep the core message but remove all unnecessary words. Output ONLY the shortened text.",
        previousResult: text,
      }),
    },
    lengthen: {
      label: "\u05D4\u05D0\u05E8\u05DA",
      buildBody: (text) => ({
        prompt: text, tone: "Professional", category: "General",
        refinementInstruction: "Expand and elaborate on this text. Add more detail, examples, and depth while maintaining the original tone. Output ONLY the expanded text.",
        previousResult: text,
      }),
    },
    fix: {
      label: "\u05EA\u05E7\u05DF",
      buildBody: (text) => ({
        prompt: text, tone: "Professional", category: "General",
        refinementInstruction: "Fix all grammar, spelling, and punctuation errors. Improve sentence structure where needed. Output ONLY the corrected text.",
        previousResult: text,
      }),
    },
    translate: {
      label: "\u05EA\u05E8\u05D2\u05DD",
      buildBody: (text) => ({
        prompt: text, tone: "Professional", category: "General",
        refinementInstruction: "Translate this text to English. If already in English, translate to Hebrew. Output ONLY the translation.",
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

    const actionDef = ACTIONS[action] || ACTIONS.enhance;

    try {
      const headers = await getAuthHeaders({ "Content-Type": "application/json" });

      const res = await fetch(`${API_BASE}/api/enhance`, {
        method: "POST",
        headers,
        body: JSON.stringify(actionDef.buildBody(text)),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        body.classList.remove("peroot-loading");
        body.classList.add("peroot-error");
        if (status) status.textContent = "\u05E9\u05D2\u05D9\u05D0\u05D4";
        body.textContent = res.status === 401
          ? "\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D7\u05D3\u05E9"
          : res.status === 403
          ? (err.error || "\u05D0\u05D9\u05DF \u05E7\u05E8\u05D3\u05D9\u05D8\u05D9\u05DD")
          : res.status === 429
          ? "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05D1\u05E7\u05E9\u05D5\u05EA"
          : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D3\u05E8\u05D5\u05D2";
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      body.classList.remove("peroot-loading");
      body.textContent = "";
      body.classList.add("peroot-streaming");
      if (status) status.textContent = "\u05DB\u05D5\u05EA\u05D1...";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        body.textContent = fullText.split("[GENIUS_QUESTIONS]")[0].trim();
        body.scrollTop = body.scrollHeight;
      }

      body.classList.remove("peroot-streaming");
      lastEnhanced = fullText.split("[GENIUS_QUESTIONS]")[0].trim();
      if (status) status.textContent = "\u05D4\u05D5\u05E9\u05DC\u05DD";
      if (actions) actions.style.display = "flex";

      // Sync to website history
      syncToWebsite(text, lastEnhanced, action);

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
  async function syncToWebsite(text, enhanced, action) {
    try {
      const actionDef = ACTIONS[action] || ACTIONS.enhance;
      const headers = await getAuthHeaders({ "Content-Type": "application/json" });
      await fetch(`${API_BASE}/api/history`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: text,
          enhanced_prompt: enhanced,
          tone: "Professional",
          category: "General",
          title: `[${actionDef.label}] ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
          source: "extension",
        }),
      });
    } catch {
      // Non-critical
    }
  }

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
}
