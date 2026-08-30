import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { authServerMetadata } from "@/lib/connect/oauth-metadata";

/** RFC 8414 — OAuth 2.1 authorization-server metadata (Peroot Connect P3). */
export function GET() {
  return authServerMetadata();
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
