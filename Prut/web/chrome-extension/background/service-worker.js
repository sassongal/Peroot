/**
 * Peroot Extension - Service Worker
 * Handles: context menu with quick actions, auth token storage/relay,
 *          on-demand content script injection for enhance panel.
 */

const SITE_URL = "https://peroot.space";

// ─── Context Menu ───
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "peroot-parent",
    title: "Peroot",
    contexts: ["selection"],
  });

  const actions = [
    { id: "enhance", title: "\u05E9\u05D3\u05E8\u05D2" },
    { id: "shorten", title: "\u05E7\u05E6\u05E8" },
    { id: "lengthen", title: "\u05D4\u05D0\u05E8\u05DA" },
    { id: "fix", title: "\u05EA\u05E7\u05DF \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA" },
    { id: "translate", title: "Translate EN/HE" },
  ];

  actions.forEach((a) => {
    chrome.contextMenus.create({
      id: `peroot-${a.id}`,
      title: a.title,
      parentId: "peroot-parent",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith("peroot-") || !info.selectionText || !tab?.id) return;

  const action = info.menuItemId.replace("peroot-", "");
  if (action === "parent") return;

  // Inject content script + CSS on demand (idempotent - won't duplicate)
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content/content.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/content.js"],
    });
  } catch (err) {
    // Can't inject into chrome:// or extension pages
    console.warn("[Peroot] Cannot inject into this page:", err.message);
    return;
  }

  // Small delay to let the script initialize, then send message
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, {
      type: "ENHANCE_SELECTION",
      text: info.selectionText,
      action: action,
    });
  }, 100);
});

// ─── Message Handler ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "STORE_AUTH_TOKEN") {
    if (message.token) {
      chrome.storage.local.set({ peroot_token: message.token });
    } else {
      chrome.storage.local.remove("peroot_token");
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "GET_AUTH_TOKEN") {
    chrome.storage.local.get("peroot_token", (data) => {
      sendResponse({ token: data.peroot_token || null });
    });
    return true;
  }

  if (message.type === "FORCE_AUTH_SYNC") {
    forceAuthSync().then((token) => sendResponse({ token }));
    return true;
  }

  // Inject content script into a tab on behalf of popup
  if (message.type === "INJECT_AND_INSERT") {
    (async () => {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: message.tabId },
          files: ["content/content.css"],
        });
        await chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          files: ["content/content.js"],
        });
        setTimeout(() => {
          chrome.tabs.sendMessage(message.tabId, {
            type: "INSERT_TEXT",
            text: message.text,
          });
          sendResponse({ ok: true });
        }, 100);
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
});

// ─── Force Auth Sync ───
async function forceAuthSync() {
  try {
    let tabs = await chrome.tabs.query({ url: "https://peroot.space/*" });
    if (tabs.length === 0) {
      tabs = await chrome.tabs.query({ url: "https://www.peroot.space/*" });
    }
    if (tabs.length === 0) return null;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: async () => {
        try {
          const res = await fetch("/api/extension-token", { credentials: "same-origin" });
          if (!res.ok) return null;
          const data = await res.json();
          return data.token || null;
        } catch {
          return null;
        }
      },
    });

    const token = results?.[0]?.result || null;
    if (token) {
      await chrome.storage.local.set({ peroot_token: token });
    }
    return token;
  } catch {
    return null;
  }
}
