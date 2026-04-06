/**
 * Peroot Extension - Auth Sync (runs only on peroot.space)
 *
 * Strategy: Try two methods to get the auth token:
 * 1. Read Supabase session directly from localStorage (fastest, most reliable)
 * 2. Fetch from /api/extension-token (fallback)
 *
 * Stores token in chrome.storage.local for popup and content scripts.
 */

(async function syncAuth() {
  // Method 1: Read Supabase session from localStorage
  // Supabase stores the session in localStorage with a key pattern
  // Returns { access_token, refresh_token } or null
  function getTokensFromLocalStorage() {
    try {
      // Try known Supabase storage key patterns
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-')) && key.includes('auth')) {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const data = JSON.parse(raw);
            // Supabase stores { access_token, refresh_token, ... } or nested
            const accessToken = data?.access_token
              || data?.currentSession?.access_token
              || data?.session?.access_token;
            const refreshToken = data?.refresh_token
              || data?.currentSession?.refresh_token
              || data?.session?.refresh_token;
            if (accessToken && typeof accessToken === 'string' && accessToken.length > 20) {
              return { access_token: accessToken, refresh_token: refreshToken || null };
            }
          } catch {
            // Not JSON, skip
          }
        }
      }
    } catch {
      // localStorage not available
    }
    return null;
  }

  // Backward-compatible wrapper
  function getTokenFromLocalStorage() {
    const tokens = getTokensFromLocalStorage();
    return tokens?.access_token || null;
  }

  // Method 2: Fetch from server API
  async function fetchTokenFromAPI() {
    try {
      const res = await fetch("/api/extension-token", { credentials: "same-origin" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token || null;
    } catch {
      return null;
    }
  }

  // Get token using best available method
  async function getToken() {
    // Try localStorage first (instant, no network)
    const lsToken = getTokenFromLocalStorage();
    if (lsToken) return lsToken;

    // Fallback to API
    return await fetchTokenFromAPI();
  }

  async function storeToken(token) {
    if (!token) return;
    try {
      await chrome.storage.local.set({ peroot_token: token });
    } catch { /* noop */ }
    try {
      chrome.runtime.sendMessage({ type: "STORE_AUTH_TOKEN", token });
    } catch { /* noop */ }
  }

  // Store both access and refresh tokens when available
  async function storeTokens(accessToken, refreshToken) {
    if (!accessToken) return;
    const data = { peroot_token: accessToken };
    if (refreshToken) data.peroot_refresh_token = refreshToken;
    try {
      await chrome.storage.local.set(data);
    } catch { /* noop */ }
    try {
      chrome.runtime.sendMessage({ type: "STORE_AUTH_TOKEN", token: accessToken });
    } catch { /* noop */ }
  }

  // Sync immediately — store both tokens
  const tokens = getTokensFromLocalStorage();
  if (tokens) {
    await storeTokens(tokens.access_token, tokens.refresh_token);
  } else {
    const token = await getToken();
    if (token) await storeToken(token);
  }

  // Poll for token (catches login redirects, slow page loads)
  let polls = 0;
  const interval = setInterval(async () => {
    polls++;
    const tkns = getTokensFromLocalStorage();
    if (tkns) {
      await storeTokens(tkns.access_token, tkns.refresh_token);
      clearInterval(interval); // Stop polling once we have tokens
      return;
    } else {
      const t = await getToken();
      if (t) {
        await storeToken(t);
        clearInterval(interval); // Stop polling once we have token
        return;
      }
    }
    if (polls > 10) clearInterval(interval);
  }, 2000);

  // Re-sync when tab becomes visible
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      const tkns = getTokensFromLocalStorage();
      if (tkns) {
        await storeTokens(tkns.access_token, tkns.refresh_token);
      } else {
        const t = await getToken();
        if (t) await storeToken(t);
      }
    }
  });

  // Listen for explicit sync requests from service worker
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "REQUEST_TOKEN_SYNC") {
      getToken().then(t => {
        if (t) storeToken(t);
        sendResponse({ token: t });
      });
      return true;
    }
  });
})();
