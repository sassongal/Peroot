import { NextResponse } from "next/server";
import { withAdminWrite } from "@/lib/api-middleware";
import { invalidateExtensionConfigMemo } from "@/app/api/extension-config/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/extension-config/invalidate
 *
 * Clears the in-process memo cache backing /api/extension-config so that a
 * freshly-promoted extension_configs row is visible to clients within seconds.
 * Without this, callers wait up to 5 min for natural memo expiry — defeating
 * the "push fixes without Chrome Web Store review" promise.
 *
 * Admin-only. No body required.
 */
export const POST = withAdminWrite(async () => {
  invalidateExtensionConfigMemo();
  return NextResponse.json({ ok: true });
});
