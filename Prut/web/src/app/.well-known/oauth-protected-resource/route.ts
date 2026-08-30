import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/connect/auth";
import { protectedResourceMetadata } from "@/lib/connect/oauth-metadata";

/** RFC 9728 — protected-resource metadata for the Connect surface. */
export function GET() {
  return protectedResourceMetadata();
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
