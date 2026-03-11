/**
 * Peroot Chrome Extension - Auth Helper
 * Works in popup (direct chrome.cookies) and content scripts (via service worker).
 */

const PEROOT_COOKIE_PREFIX = "sb-ravinxlujmlvxhgbjxti-auth-token";
const PEROOT_URL = "https://peroot.space";

/**
 * Get auth token - works from both popup and content scripts.
 * Popup: reads chrome.cookies directly
 * Content script: asks service worker via message
 */
async function getAuthToken() {
  // If chrome.cookies is available (popup, service worker), use directly
  if (chrome.cookies) {
    return await _readTokenFromCookies();
  }
  // Otherwise (content script), ask the service worker
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_TOKEN" }, (response) => {
      resolve(response?.token || null);
    });
  });
}

/**
 * Read token directly from cookies (popup/service worker only).
 */
async function _readTokenFromCookies() {
  try {
    const cookies = await chrome.cookies.getAll({ url: PEROOT_URL });

    const authCookies = cookies
      .filter(
        (c) =>
          c.name === PEROOT_COOKIE_PREFIX ||
          c.name.startsWith(PEROOT_COOKIE_PREFIX + ".")
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    if (authCookies.length === 0) return null;

    const raw = authCookies.map((c) => c.value).join("");
    if (!raw) return null;

    const session = _parseSession(raw);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Parse Supabase session from cookie value.
 * Handles: raw JSON, URL-encoded JSON, base64-encoded JSON.
 */
function _parseSession(raw) {
  // Try raw JSON first
  try { return JSON.parse(raw); } catch {}
  // Try URL-decoded
  try { return JSON.parse(decodeURIComponent(raw)); } catch {}
  // Try base64
  try {
    return JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {}
  return null;
}

/**
 * Check if user is authenticated (local check, no server call).
 */
async function checkAuth() {
  const token = await getAuthToken();
  if (!token) return { authenticated: false };

  // Decode JWT payload for email
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
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
