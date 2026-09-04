import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { consumeAuthCode, issueTokens, rotateRefreshToken, verifyPkce } from "@/lib/connect/oauth";
import { checkRateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";

/**
 * POST /api/oauth/token — OAuth 2.1 token endpoint (public clients, PKCE S256).
 *
 * grant_type=authorization_code: code + code_verifier + client_id [+ redirect_uri]
 * grant_type=refresh_token:      refresh_token + client_id (rotation — the old
 *                                refresh token is revoked on every use)
 *
 * Accepts application/x-www-form-urlencoded (spec) and JSON (pragmatic).
 * Errors follow RFC 6749 §5.2. CSRF-exempt in proxy.ts — the code/PKCE pair
 * is the credential, cookies play no part.
 */

function tokenError(status: number, error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(body).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>;
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let params: Record<string, string>;
  try {
    params = await readParams(req);
  } catch {
    return tokenError(400, "invalid_request", "Malformed body");
  }

  const grantType = params.grant_type ?? "";
  const clientId = params.client_id ?? "";
  if (!clientId) return tokenError(400, "invalid_request", "client_id is required");

  // Rate-limit per CLIENT, not per IP: connector platforms (claude.ai/ChatGPT)
  // exchange tokens from shared egress IPs — an IP bucket would let one
  // platform's users exhaust each other's quota. client_id is validated
  // against the code/refresh-token below, so it can't be spoofed usefully.
  const ip = clientIp(req) ?? "unknown";
  const limit = await checkRateLimit(`oauth:token:${clientId || ip}`, "connectKey");
  if (!limit.success) {
    return tokenError(429, "invalid_request", "Too many requests, try again shortly");
  }

  try {
    if (grantType === "authorization_code") {
      const { code, code_verifier: verifier, redirect_uri: redirectUri } = params;
      if (!code || !verifier) {
        return tokenError(400, "invalid_request", "code and code_verifier are required");
      }
      const payload = await consumeAuthCode(code);
      if (!payload) return tokenError(400, "invalid_grant", "Code is invalid, expired, or used");
      if (payload.clientId !== clientId) {
        return tokenError(400, "invalid_grant", "client_id does not match the code");
      }
      if (redirectUri && redirectUri !== payload.redirectUri) {
        return tokenError(400, "invalid_grant", "redirect_uri does not match the code");
      }
      if (!verifyPkce(verifier, payload.codeChallenge)) {
        return tokenError(400, "invalid_grant", "PKCE verification failed");
      }
      const tokens = await issueTokens(payload.userId, payload.clientId, payload.scope);
      return NextResponse.json(tokens, {
        headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
      });
    }

    if (grantType === "refresh_token") {
      const refresh = params.refresh_token ?? "";
      if (!refresh) return tokenError(400, "invalid_request", "refresh_token is required");
      const tokens = await rotateRefreshToken(refresh, clientId);
      if (!tokens) {
        return tokenError(400, "invalid_grant", "Refresh token is invalid, expired, or revoked");
      }
      return NextResponse.json(tokens, {
        headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
      });
    }

    return tokenError(400, "unsupported_grant_type", "Use authorization_code or refresh_token");
  } catch (e) {
    logger.error("[OAuth] token endpoint failed:", e);
    return tokenError(500, "server_error", "Token issuance failed");
  }
}
