import { NextResponse } from "next/server";
import { getActiveModelProfiles } from "@/lib/engines/model-profiles";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

interface ExtensionConfigResponse {
  version: string;
  cache_version: number;
  selectors: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  model_profiles: Array<{
    slug: string;
    displayName: string;
    displayNameHe: string;
    hostMatch: string[];
  }>;
}

let memo: { value: ExtensionConfigResponse; ts: number } | null = null;
const SERVER_CACHE_MS = 5 * 60 * 1000;

/**
 * Invalidate the in-process memo. Called by the admin invalidator endpoint when
 * the active extension_configs row is rotated, so callers see the new version
 * within seconds rather than waiting up to 5 min for memo expiry.
 */
export function invalidateExtensionConfigMemo(): void {
  memo = null;
}

/**
 * GET /api/extension-config
 * withUser owns auth + a per-user free-bucket rate limit (keyed ext-cfg:<uid>).
 * The active config lives in a global table read via the service-role client
 * (forceServiceClient); the in-process memo absorbs DB load on cache hits.
 */
export const GET = withUser(
  async (_req, ctx): Promise<Response> => {
    if (memo && Date.now() - memo.ts < SERVER_CACHE_MS) {
      return NextResponse.json(memo.value, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }

    try {
      const { data: row, error } = await ctx.db
        .from("extension_configs")
        .select("version,cache_version,selectors,feature_flags")
        .eq("is_active", true)
        .maybeSingle();
      if (error || !row) {
        logger.warn("[extension-config] no active row", { error: error?.message });
        return NextResponse.json({ error: "Config not available" }, { status: 503 });
      }
      const profiles = await getActiveModelProfiles();
      const payload: ExtensionConfigResponse = {
        version: row.version,
        cache_version: row.cache_version,
        selectors: row.selectors,
        feature_flags: row.feature_flags,
        model_profiles: profiles.map((p) => ({
          slug: p.slug,
          displayName: p.displayName,
          displayNameHe: p.displayNameHe,
          hostMatch: p.hostMatch,
        })),
      };
      memo = { value: payload, ts: Date.now() };
      return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=300" } });
    } catch (err) {
      logger.error("[extension-config] failed", { err: (err as Error).message });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  },
  {
    rateLimit: "free",
    rateLimitKey: ({ user }) => `ext-cfg:${user!.id}`,
    forceServiceClient: true,
  },
);
