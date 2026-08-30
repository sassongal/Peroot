import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { CONNECT_OPENAPI } from "@/lib/connect/openapi";

/**
 * GET /api/v1/openapi.json (served at /api/v1/openapi) — the public Peroot
 * Connect contract. Documentation, not data: intentionally unauthenticated.
 * /connect/docs renders from the SAME object, so they can never drift.
 */
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function GET() {
  return NextResponse.json(CONNECT_OPENAPI, {
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" },
  });
}
