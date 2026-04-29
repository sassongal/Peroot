import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getActiveModelProfiles } from "@/lib/engines/model-profiles";
import { logger } from "@/lib/logger";

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

export async function GET(_req: Request): Promise<NextResponse> {
  void _req;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (memo && Date.now() - memo.ts < SERVER_CACHE_MS) {
    return NextResponse.json(memo.value, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  try {
    const service = createServiceClient();
    const { data: row, error } = await service
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
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    logger.error("[extension-config] failed", { err: (err as Error).message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
