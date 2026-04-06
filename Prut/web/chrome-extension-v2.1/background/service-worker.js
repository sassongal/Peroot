/**
 * Peroot Extension - Service Worker
 * Handles: context menu with quick actions, auth token storage/relay,
 *          on-demand content script injection for enhance panel.
 */

const SITE_URL = "https://www.peroot.space";

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
    // Expected for chrome:// and extension pages — silently skip
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

// ─── Keyboard Shortcut: Alt+Shift+E to enhance selection ───
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "enhance-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

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
    // Expected for chrome:// and extension pages — silently skip
    return;
  }

  // Get selected text and trigger enhancement
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, {
      type: "ENHANCE_KEYBOARD_SHORTCUT",
    });
  }, 100);
});

// ─── Auto-sync token when user navigates to peroot.space ───
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.startsWith("https://peroot.space") || tab.url.startsWith("https://www.peroot.space"))
  ) {
    // Inject auth-sync to pick up fresh token after login/navigation
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/auth-sync.js"],
    }).catch(() => {
      // Ignore errors (page might not be accessible)
    });
  }
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

  // API proxy for content scripts (avoids CORS issues)
  if (message.type === "API_FETCH") {
    (async () => {
      try {
        const { peroot_token, peroot_api_key } = await chrome.storage.local.get(["peroot_token", "peroot_api_key"]);
        const token = peroot_api_key || peroot_token;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${SITE_URL}${message.path}`, {
          method: message.method || "GET",
          headers,
          body: message.body ? JSON.stringify(message.body) : undefined,
        });

        if (message.stream) {
          // For streaming responses, read the full body and return as text
          const text = await res.text();
          sendResponse({ ok: res.ok, status: res.status, text });
        } else {
          const data = await res.json().catch(() => null);
          sendResponse({ ok: res.ok, status: res.status, data });
        }
      } catch (err) {
        sendResponse({ ok: false, status: 0, error: err.message });
      }
    })();
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
    // Find any open peroot.space tab (with or without www)
    const tabs = await chrome.tabs.query({ url: ["https://peroot.space/*", "https://www.peroot.space/*"] });
    if (tabs.length === 0) return null;

    // Ask the auth-sync content script (already injected) for a fresh token
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_TOKEN_SYNC" }, (response) => {
        if (chrome.runtime.lastError || !response?.token) {
          // Content script not ready — try injecting it first, then retry
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content/auth-sync.js"],
          }).then(() => {
            // Give it a moment to initialize, then ask again
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_TOKEN_SYNC" }, (r2) => {
                const token = r2?.token || null;
                if (token) chrome.storage.local.set({ peroot_token: token });
                resolve(token);
              });
            }, 500);
          }).catch(() => resolve(null));
          return;
        }
        const token = response.token;
        if (token) chrome.storage.local.set({ peroot_token: token });
        resolve(token);
      });
    });
  } catch {
    return null;
  }
}
