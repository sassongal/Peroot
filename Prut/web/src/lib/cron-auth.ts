import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Verify an incoming cron request's `Authorization: Bearer <CRON_SECRET>`
 * header using a constant-time comparison.
 *
 * Returns a NextResponse (401) on failure, or null on success.
 *
 * Why constant-time:
 *   A direct string compare leaks the length of the common prefix via timing,
 *   which is exploitable over a network — especially on shared compute where
 *   microsecond differences are measurable from outside.
 */
export function verifyCronSecret(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const header = req.headers.get("authorization") ?? "";
  const expectedHeader = `Bearer ${expected}`;

  // Length mismatch — shortcut to deny (length itself is already leaked by
  // the header's existence, no value in padding this side).
  if (header.length !== expectedHeader.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expectedHeader, "utf8");
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
