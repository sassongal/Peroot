import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { validateOAuthToken, OAUTH_ACCESS_PREFIX } from "@/lib/connect/oauth";
import { checkRateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * Peroot Connect — shared auth/limits for the public surface (/api/v1 + /api/mcp).
 *
 * The bearer credential is either a prk_ API key or (Phase 3) a pot_ OAuth
 * access token — no cookies, no CSRF surface, so these endpoints are
 * CSRF-exempt in proxy.ts and answer CORS openly. Two independent rate
 * ceilings apply on top of the user's credit allowance:
 *   - per credential (connectKey, 20/min) — bounds one leaked/hot key or token
 *   - per user       (connectUser, 40/min) — N credentials must not multiply throughput
 */

export interface ConnectAuth {
  userId: string;
  /** developer_api_keys.id for prk_ auth; null for OAuth tokens. */
  keyId: string | null;
  kind: "key" | "oauth";
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
};

export function connectError(
  status: number,
  code: string,
  he: string,
  en: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  const res = NextResponse.json(
    { error: he, error_en: en, code, ...extra },
    { status, headers: CORS_HEADERS },
  );
  if (status === 401) {
    // RFC 9728 / MCP auth: point clients at the resource metadata so an
    // OAuth-capable client (claude.ai web, ChatGPT) can start the flow.
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
    res.headers.set(
      "WWW-Authenticate",
      `Bearer realm="Peroot Connect", resource_metadata="${base}/.well-known/oauth-protected-resource"`,
    );
  }
  return res;
}

export function connectJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS }) as NextResponse;
}

/**
 * Authenticates a Connect request (Bearer prk_live_*) and enforces both rate
 * ceilings. Returns ConnectAuth on success, or a ready-to-return NextResponse
 * (401/429) on failure.
 */
export async function authenticateConnect(req: Request): Promise<ConnectAuth | NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return connectError(
      401,
      "missing_key",
      "חסר מפתח API — הוסף כותרת Authorization: Bearer prk_live_…",
      "Missing API key — send Authorization: Bearer prk_live_…",
    );
  }

  let userId: string;
  let keyId: string | null;
  let kind: "key" | "oauth";
  let credentialLimitKey: string;

  if (token.startsWith(OAUTH_ACCESS_PREFIX)) {
    // Phase 3 — OAuth access token (claude.ai web / ChatGPT connectors).
    const oauth = await validateOAuthToken(token);
    if (!oauth.valid || !oauth.userId) {
      return connectError(
        401,
        "invalid_key",
        "טוקן OAuth לא תקין או שפג — התחבר מחדש ל-Peroot",
        "Invalid or expired OAuth token — reconnect to Peroot",
      );
    }
    userId = oauth.userId;
    keyId = null;
    kind = "oauth";
    // Same per-credential ceiling as a key; bucket by user+client.
    credentialLimitKey = `connect:oauth:${userId}:${oauth.clientId ?? "unknown"}`;
  } else {
    const result = await validateApiKey(token);
    if (!result.valid || !result.userId || !result.keyId) {
      return connectError(
        401,
        "invalid_key",
        "מפתח API לא תקין או שבוטל — צור מפתח חדש ב-Peroot Connect",
        "Invalid or revoked API key — create a new key in Peroot Connect",
      );
    }
    userId = result.userId;
    keyId = result.keyId;
    kind = "key";
    credentialLimitKey = `connect:key:${result.keyId}`;
  }

  const [keyLimit, userLimit] = await Promise.all([
    checkRateLimit(credentialLimitKey, "connectKey"),
    checkRateLimit(`connect:user:${userId}`, "connectUser"),
  ]);
  const blocked = !keyLimit.success ? keyLimit : !userLimit.success ? userLimit : null;
  if (blocked) {
    const retryAfter = Math.max(1, Math.ceil((blocked.reset - Date.now()) / 1000));
    const res = connectError(
      429,
      "rate_limited",
      "יותר מדי בקשות — נסה שוב בעוד רגע",
      "Too many requests — try again shortly",
      { retry_after_seconds: retryAfter },
    );
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }

  return { userId, keyId, kind };
}

/**
 * Fire-and-forget per-key usage log (metadata ONLY — never prompt bodies).
 * Powers the Connect usage view and leaked-key anomaly detection.
 */
export function logConnectUsage(entry: {
  userId: string;
  /** null for OAuth-authenticated calls (api_key_id FK is prk-only). */
  keyId: string | null;
  endpoint: string;
  durationMs: number;
  engineMode?: string;
  cacheHit?: boolean;
}): void {
  try {
    const db = createServiceClient();
    void db
      .from("api_usage_logs")
      .insert({
        user_id: entry.userId,
        api_key_id: entry.keyId,
        provider: "connect",
        model: entry.engineMode ?? "n/a",
        endpoint: entry.endpoint,
        duration_ms: Math.round(entry.durationMs),
        engine_mode: entry.engineMode ?? null,
        cache_hit: entry.cacheHit ?? false,
        input_tokens: 0,
        output_tokens: 0,
      })
      .then(({ error }: { error: unknown }) => {
        if (error) logger.warn("[Connect] usage log failed:", error);
      });
  } catch {
    /* never block the request on logging */
  }
}
