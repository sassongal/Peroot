/**
 * Peroot Chrome Extension - Auth Helper
 * Token is synced to chrome.storage by the content script on peroot.space.
 * All contexts (popup, content script, service worker) read from storage.
 */

const PEROOT_URL = "https://peroot.space";

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
 * Check if user is authenticated (local check, no server call).
 * First checks storage, then tries force-sync from open peroot.space tab.
 */
async function checkAuth() {
  let token = await getAuthToken();

  // If no token in storage, try force-sync from an open peroot.space tab
  if (!token) {
    token = await forceAuthSync();
  }

  if (!token) return { authenticated: false };

  // Decode JWT payload for email
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired, clear it
      chrome.storage.local.remove("peroot_token");
      return { authenticated: false };
    }

    return {
      authenticated: true,
      email: payload.email || null,
      userId: payload.sub || null,
    };
  } catch {}

  return { authenticated: true };
}

/**
 * Build fetch headers with Authorization bearer token.
 */
async function getAuthHeaders(extra = {}) {
  const token = await getAuthToken();
  const headers = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Authenticated fetch to peroot.space.
 */
async function authFetch(path, options = {}) {
  const headers = await getAuthHeaders(options.headers || {});
  return fetch(`${PEROOT_URL}${path}`, { ...options, headers });
}
