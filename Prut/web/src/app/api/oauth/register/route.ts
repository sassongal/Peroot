import { NextResponse } from "next/server";
import { z } from "zod";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { isAllowedRedirectUri, registerOAuthClient } from "@/lib/connect/oauth";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * POST /api/oauth/register — RFC 7591 dynamic client registration.
 * PUBLIC clients only (no secret is ever issued); PKCE is the proof of
 * possession at the token endpoint. Rate-limited per IP.
 */

const RegisterSchema = z.object({
  client_name: z.string().trim().min(1).max(200).default("MCP Client"),
  redirect_uris: z.array(z.string().max(2000)).min(1).max(10),
  // Accepted-and-ignored standard fields (clients send them; we don't need them).
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
  scope: z.string().optional(),
});

function oauthError(status: number, error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const limit = await checkRateLimit(`oauth:register:${ip}`, "apiKeys");
  if (!limit.success) {
    return oauthError(429, "invalid_client_metadata", "Too many registrations — try again later");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return oauthError(400, "invalid_client_metadata", "Body must be JSON");
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return oauthError(400, "invalid_client_metadata", "client_name and redirect_uris[] required");
  }
  const bad = parsed.data.redirect_uris.find((u) => !isAllowedRedirectUri(u));
  if (bad) {
    return oauthError(
      400,
      "invalid_redirect_uri",
      `redirect_uris must be https:// (or http://localhost): ${bad}`,
    );
  }

  try {
    const client = await registerOAuthClient(parsed.data.client_name, parsed.data.redirect_uris);
    return NextResponse.json(
      {
        client_id: client.client_id,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (e) {
    logger.error("[OAuth] client registration failed:", e);
    return oauthError(500, "server_error", "Registration failed");
  }
}
