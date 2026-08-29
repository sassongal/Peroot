import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * Peroot Connect — shared auth/limits for the public surface (/api/v1 + /api/mcp).
 *
 * The key IS the credential (no cookies, no CSRF surface), so these endpoints
 * are CSRF-exempt in proxy.ts and answer CORS openly. Two independent rate
 * ceilings apply on top of the user's credit allowance:
 *   - per key  (connectKey, 20/min) — bounds one leaked/hot key
 *   - per user (connectUser, 40/min) — N keys must not multiply throughput
 */

export interface ConnectAuth {
  userId: string;
  keyId: string;
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
  return NextResponse.json(
    { error: he, error_en: en, code, ...extra },
    { status, headers: CORS_HEADERS },
  );
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

  const result = await validateApiKey(token);
  if (!result.valid || !result.userId || !result.keyId) {
    return connectError(
      401,
      "invalid_key",
      "מפתח API לא תקין או שבוטל — צור מפתח חדש ב-Peroot Connect",
      "Invalid or revoked API key — create a new key in Peroot Connect",
    );
  }

  const [keyLimit, userLimit] = await Promise.all([
    checkRateLimit(`connect:key:${result.keyId}`, "connectKey"),
    checkRateLimit(`connect:user:${result.userId}`, "connectUser"),
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

  return { userId: result.userId, keyId: result.keyId };
}

/**
 * Fire-and-forget per-key usage log (metadata ONLY — never prompt bodies).
 * Powers the Connect usage view and leaked-key anomaly detection.
 */
export function logConnectUsage(entry: {
  userId: string;
  keyId: string;
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
