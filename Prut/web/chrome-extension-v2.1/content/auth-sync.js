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
    if (token) {
      chrome.runtime.sendMessage({ type: "STORE_AUTH_TOKEN", token });
    }
  }

  // Sync immediately
  const token = await fetchToken();
  storeToken(token);

  // Poll a few times to catch post-login redirects
  let polls = 0;
  const interval = setInterval(async () => {
    const t = await fetchToken();
    if (t) {
      storeToken(t);
      clearInterval(interval);
    }
    if (++polls > 5) clearInterval(interval);
  }, 2000);

  // Re-sync when user returns to this tab (e.g. after login redirect)
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      const t = await fetchToken();
      storeToken(t);
    }
  });
})();
