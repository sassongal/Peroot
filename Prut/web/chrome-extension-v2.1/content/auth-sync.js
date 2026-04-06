/**
 * Peroot Extension - Auth Sync (runs only on peroot.space)
 * Syncs the user's session token to chrome.storage so popup and
 * programmatically-injected scripts can make authenticated API calls.
 */

(async function syncAuth() {
  async function fetchToken() {
    try {
      const res = await fetch("/api/extension-token", { credentials: "same-origin" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token || null;
    } catch {
      return null;
    }
  }

  async function storeToken(token) {
    if (!token) return;
    // Try direct storage first (works in MV3 content scripts)
    try {
      await chrome.storage.local.set({ peroot_token: token });
    } catch {
      // noop
    }
    // Also notify service worker (redundant but ensures delivery)
    try {
      chrome.runtime.sendMessage({ type: "STORE_AUTH_TOKEN", token });
    } catch {
      // noop
    }
  }

  // Sync immediately on page load
  const token = await fetchToken();
  if (token) await storeToken(token);

  // Poll aggressively for 20 seconds to catch post-login redirects
  let polls = 0;
  const interval = setInterval(async () => {
    polls++;
    const t = await fetchToken();
    if (t) {
      await storeToken(t);
      if (polls > 3) clearInterval(interval); // Keep polling a bit even after finding token
    }
    if (polls > 10) clearInterval(interval);
  }, 2000);

  // Re-sync when user returns to this tab
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      const t = await fetchToken();
      if (t) await storeToken(t);
    }
  });

  // Listen for explicit sync requests
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "REQUEST_TOKEN_SYNC") {
      fetchToken().then(t => {
        if (t) storeToken(t);
        sendResponse({ token: t });
      });
      return true;
    }
  });
})();
