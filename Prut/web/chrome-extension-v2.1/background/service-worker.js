/**
 * Peroot Extension — Service worker (v3)
 *
 * Owns: the context menu, the keyboard command, token refresh and config
 * refresh alarms, the auth bridge with peroot.space, the API proxy for
 * content scripts (one-shot and streaming), on-demand injection of the
 * selection panel, and the credits badge on the toolbar icon.
 */

try {
  importScripts("../lib/config-store.js", "../lib/telemetry.js", "../lib/prefs.js");
} catch {
  // A missing lib is a packaging error; the worker still serves auth and proxy.
}

const SITE_URL = "https://www.peroot.space";
const SUPABASE_URL = "https://ravinxlujmlvxhgbjxti.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdmlueGx1am1sdnhoZ2JqeHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDYyMzQsImV4cCI6MjA4NDU4MjIzNH0.Mq-UzPZhFe6fM5J76BcQhS8YhaDxXyBH7hzNGk1T7Kk";

const TOKEN_REFRESH_ALARM = "peroot-token-refresh";
const CONFIG_REFRESH_ALARM = "peroot-config-refresh";
const BADGE_REFRESH_ALARM = "peroot-badge-refresh";

// The selection panel and its helpers, injected on demand into any page.
const SELECTION_SCRIPTS = [
  "lib/language.js",
  "lib/prompt-text.js",
  "lib/prefs.js",
  "content/content.js",
];

async function bootstrapConfig() {
  if (typeof self.PerootConfigStore?.refreshConfig !== "function") return;
  await self.PerootConfigStore.refreshConfig();
}

// ─── Install / update ───
chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "peroot-parent", title: "Peroot", contexts: ["selection"] });
    const actions = [
      { id: "enhance", title: "שדרוג הפרומפט" },
      { id: "fix", title: "תיקון שגיאות" },
      { id: "shorten", title: "קיצור" },
      { id: "lengthen", title: "הרחבה" },
      { id: "translate", title: "תרגום עברית / אנגלית" },
      { id: "summarize", title: "סיכום לנקודות" },
      { id: "bullets", title: "המרה לנקודות" },
    ];
    for (const a of actions) {
      chrome.contextMenus.create({
        id: `peroot-${a.id}`,
        title: a.title,
        parentId: "peroot-parent",
        contexts: ["selection"],
      });
    }
  });

  chrome.alarms.create(TOKEN_REFRESH_ALARM, { periodInMinutes: 45 });
  chrome.alarms.create(CONFIG_REFRESH_ALARM, { periodInMinutes: 24 * 60 });
  chrome.alarms.create(BADGE_REFRESH_ALARM, { periodInMinutes: 30 });
  bootstrapConfig();
  refreshBadge();

  if (details?.reason === "install") {
    // First run: the options page carries the short onboarding.
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup?.addListener(() => {
  refreshBadge();
});

// ─── Context menu and keyboard command ───
async function injectSelectionPanel(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ["content/content.css"] });
  await chrome.scripting.executeScript({ target: { tabId }, files: SELECTION_SCRIPTS });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!String(info.menuItemId).startsWith("peroot-") || !info.selectionText || !tab?.id) return;
  const action = String(info.menuItemId).replace("peroot-", "");
  if (action === "parent") return;
  try {
    await injectSelectionPanel(tab.id);
  } catch {
    return; // chrome:// and store pages cannot be scripted
  }
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, { type: "ENHANCE_SELECTION", text: info.selectionText, action });
  }, 80);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "enhance-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await injectSelectionPanel(tab.id);
  } catch {
    return;
  }
  setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: "ENHANCE_KEYBOARD_SHORTCUT" }), 80);
});

// ─── Auth bridge: pick up the session when the site is open ───
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.startsWith("https://peroot.space") || tab.url.startsWith("https://www.peroot.space"))
  ) {
    chrome.scripting
      .executeScript({ target: { tabId }, files: ["content/auth-sync.js"] })
      .catch(() => {});
  }
});

// ─── Alarms ───
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CONFIG_REFRESH_ALARM) return bootstrapConfig();
  if (alarm.name === BADGE_REFRESH_ALARM) return refreshBadge();
  if (alarm.name !== TOKEN_REFRESH_ALARM) return;
  await refreshTokenIfNeeded();
});

function decodeExp(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function refreshTokenIfNeeded(force = false) {
  const { peroot_token, peroot_refresh_token } = await chrome.storage.local.get([
    "peroot_token",
    "peroot_refresh_token",
  ]);
  if (!peroot_refresh_token) return null;
  if (!force && peroot_token && decodeExp(peroot_token) > Date.now() + 10 * 60 * 1000) {
    return peroot_token;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: peroot_refresh_token }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        const updates = { peroot_token: data.access_token };
        if (data.refresh_token) updates.peroot_refresh_token = data.refresh_token;
        await chrome.storage.local.set(updates);
        return data.access_token;
      }
    } else if (res.status === 401 || res.status === 400) {
      await chrome.storage.local.remove(["peroot_token", "peroot_refresh_token"]);
      setBadge("");
    }
  } catch {
    // Network: the next alarm retries.
  }
  return null;
}

async function bearer() {
  const { peroot_token, peroot_api_key } = await chrome.storage.local.get([
    "peroot_token",
    "peroot_api_key",
  ]);
  return peroot_api_key || peroot_token || null;
}

async function siteFetch(path, init = {}, retry = true) {
  // The path arrives over runtime messaging from content scripts. Without
  // this check, "@evil.com/x" (userinfo trick) or ".evil.com/x" turns
  // `${SITE_URL}${path}` into an attacker-controlled origin that receives
  // the user's bearer token. Same-origin absolute paths only.
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return new Response(JSON.stringify({ error: "invalid path" }), { status: 400 });
  }
  const token = await bearer();
  const headers = { "Content-Type": "application/json", ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${SITE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && retry) {
    const fresh = await refreshTokenIfNeeded(true);
    if (fresh) return siteFetch(path, init, false);
  }
  return res;
}

// ─── Credits badge ───
function setBadge(text, color) {
  try {
    chrome.action.setBadgeText({ text: String(text || "") });
    if (color) chrome.action.setBadgeBackgroundColor({ color });
    chrome.action.setBadgeTextColor?.({ color: "#080808" });
  } catch {
    /* no action API in some contexts */
  }
}

async function refreshBadge() {
  const token = await bearer();
  if (!token) return setBadge("");
  try {
    const res = await siteFetch("/api/me");
    if (!res.ok) return setBadge("");
    const me = await res.json();
    if (me.plan_tier === "admin" || me.plan_tier === "pro") return setBadge("");
    const n = Number(me.credits_balance ?? 0);
    setBadge(n > 0 ? String(n) : "0", n > 0 ? "#F59E0B" : "#94a3b8");
    if (self.PerootPrefs?.adoptProfileLanguage && me.preferred_output_language) {
      await self.PerootPrefs.adoptProfileLanguage(me.preferred_output_language);
    }
  } catch {
    /* keep the last badge */
  }
}

// ─── One-shot messages ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case "STORE_AUTH_TOKEN": {
      if (message.token) chrome.storage.local.set({ peroot_token: message.token });
      else chrome.storage.local.remove("peroot_token");
      refreshBadge();
      sendResponse({ ok: true });
      return false;
    }
    case "GET_AUTH_TOKEN": {
      chrome.storage.local.get("peroot_token", (d) => sendResponse({ token: d.peroot_token || null }));
      return true;
    }
    case "FORCE_AUTH_SYNC": {
      forceAuthSync().then((token) => sendResponse({ token }));
      return true;
    }
    case "REFRESH_BADGE": {
      refreshBadge().then(() => sendResponse({ ok: true }));
      return true;
    }
    case "API_FETCH": {
      (async () => {
        try {
          const res = await siteFetch(message.path, {
            method: message.method || "GET",
            body: message.body ? JSON.stringify(message.body) : undefined,
          });
          if (message.stream) {
            const text = await res.text();
            sendResponse({ ok: res.ok, status: res.status, text });
          } else {
            const data = await res.json().catch(() => null);
            sendResponse({ ok: res.ok, status: res.status, data });
          }
        } catch (err) {
          sendResponse({ ok: false, status: 0, error: err?.message || "network" });
        }
      })();
      return true;
    }
    case "INJECT_AND_INSERT": {
      (async () => {
        try {
          await injectSelectionPanel(message.tabId);
          setTimeout(() => {
            chrome.tabs.sendMessage(message.tabId, { type: "INSERT_TEXT", text: message.text });
            sendResponse({ ok: true });
          }, 80);
        } catch {
          sendResponse({ ok: false });
        }
      })();
      return true;
    }
    case "REFRESH_CONFIG": {
      bootstrapConfig()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    case "OPEN_OPTIONS": {
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return false;
    }
    default:
      return false;
  }
});

// ─── Streaming proxy for content scripts ───
// A content script opens a port named "peroot-stream" and posts
// { path, body }. It receives { type: "chunk", text } as the response
// streams, then { type: "done", status, ok } or { type: "error", status, error }.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "peroot-stream") return;
  let aborted = false;
  let activeReader = null;
  port.onDisconnect.addListener(() => {
    aborted = true;
    // Actually cancel the upstream fetch: without this the enhance request
    // ran (and billed) to completion after the user closed the preview.
    if (activeReader) activeReader.cancel().catch(() => {});
  });
  port.onMessage.addListener(async (msg) => {
    if (!msg || msg.type !== "start") return;
    try {
      const res = await siteFetch(msg.path || "/api/enhance", {
        method: "POST",
        body: JSON.stringify(msg.body || {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        port.postMessage({ type: "error", status: res.status, error: data?.error || null });
        return;
      }
      const reader = res.body.getReader();
      activeReader = reader;
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done || aborted) break;
        port.postMessage({ type: "chunk", text: decoder.decode(value, { stream: true }) });
      }
      if (aborted) reader.cancel().catch(() => {});
      if (!aborted) {
        port.postMessage({
          type: "done",
          status: res.status,
          ok: true,
          cache: res.headers.get("X-Peroot-Cache") || null,
        });
      }
    } catch (err) {
      if (!aborted) port.postMessage({ type: "error", status: 0, error: err?.message || "network" });
    }
  });
});

// ─── Auth sync from an open peroot.space tab ───
async function forceAuthSync() {
  try {
    const tabs = await chrome.tabs.query({
      url: ["https://peroot.space/*", "https://www.peroot.space/*"],
    });
    if (tabs.length === 0) return null;
    const ask = () =>
      new Promise((resolve) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_TOKEN_SYNC" }, (r) => {
          resolve(chrome.runtime.lastError ? null : r?.token || null);
        });
      });
    let token = await ask();
    if (!token) {
      await chrome.scripting
        .executeScript({ target: { tabId: tabs[0].id }, files: ["content/auth-sync.js"] })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
      token = await ask();
    }
    if (token) {
      await chrome.storage.local.set({ peroot_token: token });
      refreshBadge();
    }
    return token;
  } catch {
    return null;
  }
}
