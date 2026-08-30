import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { authServerMetadata } from "@/lib/connect/oauth-metadata";

/** RFC 8414 path-appended discovery (issuer with a path) — same document. */
export function GET() {
  return authServerMetadata();
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
