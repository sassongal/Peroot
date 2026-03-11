/**
 * Peroot Extension - Service Worker
 * Handles: context menu, auth token relay for content scripts
 */

const COOKIE_PREFIX = "sb-ravinxlujmlvxhgbjxti-auth-token";
const SITE_URL = "https://peroot.space";

// ─── Context Menu ───
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "peroot-enhance",
    title: "\u05E9\u05D3\u05E8\u05D2 \u05E2\u05DD Peroot",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "peroot-enhance" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "ENHANCE_SELECTION",
      text: info.selectionText,
    });
  }
});

// ─── Message Handler ───
// Content scripts can't use chrome.cookies, so they ask us for the token
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_AUTH_TOKEN") {
    getAuthToken().then((token) => sendResponse({ token }));
    return true; // keep channel open for async
  }
});

// ─── Auth Token from Cookies ───
async function getAuthToken() {
  try {
    const cookies = await chrome.cookies.getAll({ url: SITE_URL });

    const authCookies = cookies
      .filter(
        (c) =>
          c.name === COOKIE_PREFIX ||
          c.name.startsWith(COOKIE_PREFIX + ".")
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    if (authCookies.length === 0) return null;

    const raw = authCookies.map((c) => c.value).join("");
    if (!raw) return null;

    let session;
    try {
      session = JSON.parse(raw);
    } catch {
      try {
        session = JSON.parse(decodeURIComponent(raw));
      } catch {
        try {
          session = JSON.parse(
            atob(raw.replace(/-/g, "+").replace(/_/g, "/"))
          );
        } catch {
          return null;
        }
      }
    }

    return session?.access_token || null;
  } catch {
    return null;
  }
}
