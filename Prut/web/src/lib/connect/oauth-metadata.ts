import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { OAUTH_SCOPE } from "@/lib/connect/oauth";

export function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
}

/** RFC 8414 — authorization-server metadata document. */
export function authServerMetadata(): NextResponse {
  const base = siteBase();
  return NextResponse.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [OAUTH_SCOPE],
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" } },
  );
}

/** RFC 9728 — protected-resource metadata document. */
export function protectedResourceMetadata(): NextResponse {
  const base = siteBase();
  return NextResponse.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
      scopes_supported: [OAUTH_SCOPE],
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" } },
  );
}
