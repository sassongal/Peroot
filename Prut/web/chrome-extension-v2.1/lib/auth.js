/**
 * Peroot Chrome Extension - Auth Helper (v2 - Self-contained)
 *
 * Authentication is handled entirely within the extension:
 *   1. Google OAuth via chrome.identity.launchWebAuthFlow -> Supabase
 *   2. Email/password via Supabase REST API
 *   3. Token refresh via Supabase REST API (using stored refresh_token)
 *
 * No dependency on having peroot.space open.
 * auth-sync.js remains as a bonus — if the user visits peroot.space,
 * it syncs the latest token for convenience.
 */

const PEROOT_URL = "https://www.peroot.space";
const SUPABASE_URL = "https://ravinxlujmlvxhgbjxti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdmlueGx1am1sdnhoZ2JqeHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDYyMzQsImV4cCI6MjA4NDU4MjIzNH0.Mq-UzPZhFe6fM5J76BcQhS8YhaDxXyBH7hzNGk1T7Kk";

// ─── Storage helpers ───

/**
 * Get the stored access token.
 */
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("peroot_token", (data) => {
      resolve(data.peroot_token || null);
    });
  });
}

/**
 * Get the stored refresh token.
 */
async function getRefreshToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("peroot_refresh_token", (data) => {
      resolve(data.peroot_refresh_token || null);
    });
  });
}

/**
 * Store both access and refresh tokens.
 */
async function storeTokens(accessToken, refreshToken) {
  const data = {};
  if (accessToken) data.peroot_token = accessToken;
  if (refreshToken) data.peroot_refresh_token = refreshToken;
  if (Object.keys(data).length > 0) {
    await chrome.storage.local.set(data);
  }
}

/**
 * Clear all auth data (logout).
 */
async function clearAuth() {
  await chrome.storage.local.remove([
    "peroot_token",
    "peroot_refresh_token",
  ]);
}

// ─── JWT helpers ───

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
  if (!payload?.exp) return true; // Treat malformed tokens as expired
  return payload.exp * 1000 < Date.now() + 5 * 60 * 1000;
}

/**
 * Check if a JWT token is genuinely expired (past its expiry time).
 */
function isTokenGenuinelyExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // Treat malformed tokens as expired
  return payload.exp * 1000 < Date.now();
}

// ─── Google OAuth via chrome.identity ───

/**
 * Login with Google using chrome.identity.launchWebAuthFlow.
 * Opens a secure browser window for Google OAuth, returns tokens.
 */
async function loginWithGoogle() {
  const redirectUrl = chrome.identity.getRedirectURL();

  // Supabase OAuth authorize endpoint — implicit flow returns tokens in hash
  const authUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", "google");
  authUrl.searchParams.set("redirect_to", redirectUrl);

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error("No response URL received"));
        } else {
          resolve(response);
        }
      }
    );
  });

  // Extract tokens from the URL hash fragment
  // Supabase returns: #access_token=...&token_type=bearer&expires_in=...&refresh_token=...
  const url = new URL(responseUrl);
  const hashParams = new URLSearchParams(url.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken) {
    throw new Error("No access token in response");
  }

  await storeTokens(accessToken, refreshToken);

  return { accessToken, refreshToken };
}

// ─── Email/Password auth via Supabase REST API ───

/**
 * Login with email and password using Supabase REST API.
 */
async function loginWithEmail(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error_description || err.msg || err.error || "Login failed";
    throw new Error(msg);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  if (!accessToken) {
    throw new Error("No access token in response");
  }

  await storeTokens(accessToken, refreshToken);

  return { accessToken, refreshToken };
}

// ─── Token refresh via Supabase REST API ───

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new access token or null if refresh fails.
 */
async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      // Refresh token is invalid — clear auth
      if (res.status === 401 || res.status === 400) {
        await clearAuth();
      }
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      await storeTokens(data.access_token, data.refresh_token || refreshToken);
      return data.access_token;
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Legacy compatibility: forceAuthSync ───

/**
 * Try to force-sync auth by asking service worker to inject into peroot.space tab.
 * Kept as a fallback — the new flow doesn't need this.
 */
async function forceAuthSync() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FORCE_AUTH_SYNC" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response?.token || null);
    });
  });
}

// ─── Main auth check ───

/**
 * Check if user is authenticated.
 *
 * Flow:
 * 1. Check stored token — if valid, return authenticated
 * 2. If token expired, try refresh via Supabase REST API
 * 3. If no token at all, try legacy force-sync from peroot.space tab
 * 4. If all fail, return not authenticated
 */
async function checkAuth() {
  let token = await getAuthToken();

  // Case 1: Valid stored token
  if (token && !isTokenGenuinelyExpired(token)) {
    const payload = decodeJwtPayload(token);

    // If about to expire (within 5 minutes), try background refresh
    if (isTokenExpired(token)) {
      refreshAccessToken(); // fire-and-forget
    }

    return {
      authenticated: true,
      email: payload?.email || null,
      userId: payload?.sub || null,
    };
  }

  // Case 2: Token expired — try refreshing via Supabase REST API
  if (token) {
    const refreshed = await refreshAccessToken();
    if (refreshed && !isTokenGenuinelyExpired(refreshed)) {
      const payload = decodeJwtPayload(refreshed);
      return {
        authenticated: true,
        email: payload?.email || null,
        userId: payload?.sub || null,
      };
    }
  }

  // Case 3: No token — try legacy force-sync from an open peroot.space tab
  token = await forceAuthSync();
  if (token && !isTokenGenuinelyExpired(token)) {
    const payload = decodeJwtPayload(token);
    return {
      authenticated: true,
      email: payload?.email || null,
      userId: payload?.sub || null,
    };
  }

  // Case 4: Not authenticated
  if (token) {
    await clearAuth();
  }
  return { authenticated: false, reason: token ? "token_expired" : "no_token" };
}

// ─── Open login tab (legacy fallback) ───

async function openLoginTab() {
  await chrome.tabs.create({ url: `${PEROOT_URL}/login` });
}

// ─── API key helpers ───

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("peroot_api_key", (data) => {
      resolve(data.peroot_api_key || null);
    });
  });
}

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
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = { ...options.headers, Authorization: `Bearer ${refreshed}` };
      return fetch(`${PEROOT_URL}${path}`, { ...options, headers: retryHeaders });
    }
  }

  return res;
}
