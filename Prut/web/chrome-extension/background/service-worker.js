/**
 * Peroot Extension - Service Worker
 * Handles: context menu with quick actions, auth token storage/relay
 */

const SITE_URL = "https://peroot.space";

// ─── Context Menu ───
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: "peroot-parent",
    title: "Peroot",
    contexts: ["selection"],
  });

  // Quick actions as sub-items
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId.startsWith("peroot-") || !info.selectionText || !tab?.id) return;

  const action = info.menuItemId.replace("peroot-", "");
  if (action === "parent") return;

  chrome.tabs.sendMessage(tab.id, {
    type: "ENHANCE_SELECTION",
    text: info.selectionText,
    action: action,
  });
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
