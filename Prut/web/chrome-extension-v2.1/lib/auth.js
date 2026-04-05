/**
 * Peroot Chrome Extension - Auth Helper
 * Token is synced to chrome.storage by the content script on peroot.space.
 * All contexts (popup, content script, service worker) read from storage.
 */

const PEROOT_URL = "https://www.peroot.space";

/**
 * Get auth token from chrome.storage (set by content script on peroot.space).
 */
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("peroot_token", (data) => {
      resolve(data.peroot_token || null);
    });
  });
}

/**
 * Try to force-sync auth by asking service worker to inject into peroot.space tab.
 */
async function forceAuthSync() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FORCE_AUTH_SYNC" }, (response) => {
      resolve(response?.token || null);
    });
  });
}

/**
 * Decode JWT payload safely.
 */
function decodeJwtPayload(token) {
  try {
    return JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired (or will expire within 5 minutes).
 */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  // Consider expired if less than 5 minutes remaining
  return payload.exp * 1000 < Date.now() + 5 * 60 * 1000;
}

/**
 * Try to refresh the token by syncing from an open peroot.space tab.
 * Returns the new token or null.
 */
async function tryRefreshToken() {
  // First try force-sync from an already-open peroot.space tab
  const token = await forceAuthSync();
  if (token && !isTokenExpired(token)) {
    return token;
  }
  return null;
}

/**
 * Open peroot.space login in a new tab.
 */
async function openLoginTab() {
  await chrome.tabs.create({ url: `${PEROOT_URL}/login` });
}

/**
 * Check if user is authenticated (local check, no server call).
 * First checks storage, then tries force-sync from open peroot.space tab.
 * If token is expired, attempts refresh before giving up.
 */
async function checkAuth() {
  let token = await getAuthToken();

  // If no token in storage, try force-sync from an open peroot.space tab
  if (!token) {
    token = await forceAuthSync();
  }

  if (!token) return { authenticated: false, reason: "no_token" };

  const payload = decodeJwtPayload(token);

  // Check expiry
  if (payload?.exp && payload.exp * 1000 < Date.now()) {
    // Token expired — try to refresh it
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newPayload = decodeJwtPayload(refreshed);
      return {
        authenticated: true,
        email: newPayload?.email || null,
        userId: newPayload?.sub || null,
      };
    }

    // Refresh failed — clear expired token
    chrome.storage.local.remove("peroot_token");
    return { authenticated: false, reason: "token_expired" };
  }

  // Token about to expire (within 5 minutes) — try background refresh
  if (isTokenExpired(token)) {
    tryRefreshToken(); // fire-and-forget, don't block
  }

  return {
    authenticated: true,
    email: payload?.email || null,
    userId: payload?.sub || null,
  };
}

/**
 * Get API key from storage (user-configured in settings).
 */
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("peroot_api_key", (data) => {
      resolve(data.peroot_api_key || null);
    });
  });
}

/**
 * Save API key to storage.
 */
async function saveApiKey(key) {
  if (key) {
    await chrome.storage.local.set({ peroot_api_key: key });
  } else {
    await chrome.storage.local.remove("peroot_api_key");
  }
}

/**
 * Build fetch headers with Authorization.
 * Prefers API key (prk_*) if configured, falls back to Bearer token.
 */
async function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
  const apiKey = await getApiKey();
  if (apiKey && apiKey.startsWith("prk_")) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    return headers;
  }
  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Authenticated fetch to peroot.space.
 * On 401, tries to refresh token and retry once.
 */
async function authFetch(path, options = {}) {
  const headers = await getAuthHeaders(options.headers || {});
  const res = await fetch(`${PEROOT_URL}${path}`, { ...options, headers });

  // On 401, try refreshing the token and retry once
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = { ...options.headers, Authorization: `Bearer ${refreshed}` };
      return fetch(`${PEROOT_URL}${path}`, { ...options, headers: retryHeaders });
    }
  }

  return res;
}
