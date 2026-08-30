import { createHash, randomBytes } from "crypto";
import { hashApiKey, hashesEqual } from "@/lib/api-keys";
import { redis } from "@/lib/redis";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * Peroot Connect Phase 3 — OAuth 2.1 core (PKCE S256, public clients, opaque
 * rotated tokens). Serves the claude.ai web / ChatGPT connector flow, which
 * cannot send a prk_ header.
 *
 * Design (plan §P3):
 * - Clients are PUBLIC (RFC 7591 dynamic registration, token_endpoint_auth
 *   "none") — PKCE is the proof of possession, never a client secret.
 * - Auth codes: Redis only, TTL 10 min, deleted on first use.
 * - Access tokens `pot_…` (30d) + refresh tokens `por_…` (90d, rotated and
 *   revoked on every refresh). Stored as SHA-256 hashes, same discipline as
 *   prk_ keys: indexed 16-char prefix lookup + constant-time hash compare.
 */

export const OAUTH_ACCESS_PREFIX = "pot_";
export const OAUTH_REFRESH_PREFIX = "por_";
export const OAUTH_ACCESS_PATTERN = /^pot_[0-9a-f]{40}$/;
export const OAUTH_REFRESH_PATTERN = /^por_[0-9a-f]{40}$/;
const TOKEN_PREFIX_LEN = 16;

export const ACCESS_TOKEN_TTL_S = 30 * 24 * 60 * 60; // 30 days
export const REFRESH_TOKEN_TTL_S = 90 * 24 * 60 * 60; // 90 days
export const AUTH_CODE_TTL_S = 600; // 10 minutes (RFC 9700 recommends ≤10m)

export const OAUTH_SCOPE = "connect";

// ── PKCE ────────────────────────────────────────────────────────────────────

/** S256: base64url(sha256(verifier)) must equal the stored challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const computed = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && a.equals(b);
}

// ── Client registration (RFC 7591, public clients) ──────────────────────────

export interface OAuthClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
}

/** https:// anywhere, or http:// only on localhost (native-app loopback). */
export function isAllowedRedirectUri(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.protocol === "https:") return true;
  if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
    return true;
  }
  return false;
}

export async function registerOAuthClient(
  clientName: string,
  redirectUris: string[],
): Promise<OAuthClient> {
  const client: OAuthClient = {
    client_id: "pcl_" + randomBytes(16).toString("hex"),
    client_name: clientName.slice(0, 200),
    redirect_uris: redirectUris,
  };
  const db = createServiceClient();
  const { error } = await db.from("oauth_clients").insert({
    client_id: client.client_id,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
  });
  if (error) throw new Error(`oauth client registration failed: ${error.message}`);
  return client;
}

export async function getOAuthClient(clientId: string): Promise<OAuthClient | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("oauth_clients")
    .select("client_id, client_name, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data as OAuthClient | null) ?? null;
}

// ── Authorization codes (Redis, one-time) ───────────────────────────────────

export interface AuthCodePayload {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}

const codeKey = (code: string) => `connect:oauth:code:${hashApiKey(code)}`;

export async function createAuthCode(payload: AuthCodePayload): Promise<string> {
  const code = "pac_" + randomBytes(24).toString("hex");
  await redis.set(codeKey(code), payload, { ex: AUTH_CODE_TTL_S });
  return code;
}

/** One-time: reads AND deletes. A replayed code gets null. */
export async function consumeAuthCode(code: string): Promise<AuthCodePayload | null> {
  const key = codeKey(code);
  const payload = await redis.get<AuthCodePayload>(key);
  if (!payload) return null;
  await redis.del(key);
  return payload;
}

// ── Tokens ──────────────────────────────────────────────────────────────────

export interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

function generateToken(prefix: string) {
  const raw = prefix + randomBytes(20).toString("hex");
  return { raw, hash: hashApiKey(raw), prefix16: raw.slice(0, TOKEN_PREFIX_LEN) };
}

export async function issueTokens(
  userId: string,
  clientId: string,
  scope: string = OAUTH_SCOPE,
): Promise<IssuedTokens> {
  const access = generateToken(OAUTH_ACCESS_PREFIX);
  const refresh = generateToken(OAUTH_REFRESH_PREFIX);
  const now = Date.now();
  const db = createServiceClient();
  const { error } = await db.from("oauth_tokens").insert([
    {
      token_hash: access.hash,
      token_prefix: access.prefix16,
      token_type: "access",
      user_id: userId,
      client_id: clientId,
      scope,
      expires_at: new Date(now + ACCESS_TOKEN_TTL_S * 1000).toISOString(),
    },
    {
      token_hash: refresh.hash,
      token_prefix: refresh.prefix16,
      token_type: "refresh",
      user_id: userId,
      client_id: clientId,
      scope,
      expires_at: new Date(now + REFRESH_TOKEN_TTL_S * 1000).toISOString(),
    },
  ]);
  if (error) throw new Error(`oauth token issuance failed: ${error.message}`);
  return {
    access_token: access.raw,
    refresh_token: refresh.raw,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_S,
    scope,
  };
}

interface TokenRow {
  id: string;
  token_hash: string;
  token_type: string;
  user_id: string;
  client_id: string;
  scope: string;
  expires_at: string;
  revoked: boolean;
}

async function findLiveToken(raw: string, type: "access" | "refresh"): Promise<TokenRow | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("oauth_tokens")
    .select("id, token_hash, token_type, user_id, client_id, scope, expires_at, revoked")
    .eq("token_prefix", raw.slice(0, TOKEN_PREFIX_LEN))
    .eq("token_type", type)
    .eq("revoked", false);
  if (error) {
    // Fail closed, but distinguishably from "invalid token".
    throw new Error(`oauth token lookup failed: ${error.message}`);
  }
  const rawHash = hashApiKey(raw);
  // Constant-time compare across ALL prefix matches (same as prk_ lookup).
  let match: TokenRow | null = null;
  for (const row of (data ?? []) as TokenRow[]) {
    if (hashesEqual(row.token_hash, rawHash)) match = row;
  }
  if (!match) return null;
  if (new Date(match.expires_at).getTime() <= Date.now()) return null;
  return match;
}

export interface OAuthValidation {
  valid: boolean;
  userId?: string;
  clientId?: string;
}

/** Validates a pot_ access token. Fire-and-forget last_used_at touch. */
export async function validateOAuthToken(raw: string): Promise<OAuthValidation> {
  if (!OAUTH_ACCESS_PATTERN.test(raw)) return { valid: false };
  try {
    const row = await findLiveToken(raw, "access");
    if (!row) return { valid: false };
    try {
      const db = createServiceClient();
      void db
        .from("oauth_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", row.id)
        .then(({ error }: { error: unknown }) => {
          if (error) logger.warn("[OAuth] last_used_at touch failed:", error);
        });
    } catch {
      /* never block validation on the touch */
    }
    return { valid: true, userId: row.user_id, clientId: row.client_id };
  } catch (e) {
    logger.error("[OAuth] token validation unavailable:", e);
    return { valid: false };
  }
}

/**
 * Refresh grant with rotation: the presented refresh token is revoked and a
 * brand-new access+refresh pair is issued (OAuth 2.1 §4.3.1).
 */
export async function rotateRefreshToken(
  raw: string,
  clientId: string,
): Promise<IssuedTokens | null> {
  if (!OAUTH_REFRESH_PATTERN.test(raw)) return null;
  const row = await findLiveToken(raw, "refresh");
  if (!row || row.client_id !== clientId) return null;
  const db = createServiceClient();
  const { error } = await db.from("oauth_tokens").update({ revoked: true }).eq("id", row.id);
  if (error) throw new Error(`oauth refresh rotation failed: ${error.message}`);
  return issueTokens(row.user_id, row.client_id, row.scope);
}
