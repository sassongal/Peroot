import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

interface Row {
  event: string;
  site: string | null;
  ext_version: string | null;
  target_model: string | null;
  latency_ms: number | null;
  success: boolean | null;
  chain_index: number | null;
  meta: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

/**
 * GET /api/admin/extension-telemetry
 *
 * The extension's event stream, summarized for the "תוסף" admin tab: events
 * per day for the last 14 days, selector misses by site and field (the
 * signal that a chat site changed its markup), versions in the field,
 * active people, and the latest raw events. The table has no RLS policies
 * on purpose (service-role only), so the read goes through the service
 * client inside the admin gate.
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("extension_telemetry_events")
    .select(
      "event, site, ext_version, target_model, latency_ms, success, chain_index, meta, user_id, created_at",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    logger.error("[admin/extension-telemetry] read failed", error);
    return NextResponse.json({ error: "טעינת הטלמטריה נכשלה" }, { status: 500 });
  }
  const rows = (data ?? []) as Row[];

  const byDay = new Map<string, Record<string, number>>();
  const misses = new Map<string, number>();
  const versions = new Map<string, number>();
  const users7d = new Set<string>();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const totals: Record<string, number> = {};

  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    const d = byDay.get(day) ?? {};
    d[r.event] = (d[r.event] ?? 0) + 1;
    byDay.set(day, d);
    totals[r.event] = (totals[r.event] ?? 0) + 1;
    if (r.event === "selector_miss") {
      const kind = typeof r.meta?.selector_kind === "string" ? r.meta.selector_kind : "unknown";
      const key = `${r.site ?? "?"}:${kind}`;
      misses.set(key, (misses.get(key) ?? 0) + 1);
    }
    if (r.ext_version) versions.set(r.ext_version, (versions.get(r.ext_version) ?? 0) + 1);
    if (r.user_id && new Date(r.created_at).getTime() > weekAgo) users7d.add(r.user_id);
  }

  const days = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, events]) => ({ day, events }));

  return NextResponse.json({
    totals,
    days,
    selectorMisses: [...misses.entries()]
      .map(([key, count]) => {
        const [site, kind] = key.split(":");
        return { site, kind, count };
      })
      .sort((a, b) => b.count - a.count),
    versions: [...versions.entries()]
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count),
    activeUsers7d: users7d.size,
    latest: rows.slice(0, 40).map((r) => ({
      event: r.event,
      site: r.site,
      ext_version: r.ext_version,
      target_model: r.target_model,
      meta: r.meta,
      created_at: r.created_at,
    })),
  });
});
