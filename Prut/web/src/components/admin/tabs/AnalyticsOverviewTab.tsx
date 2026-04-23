"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApiPath } from "@/lib/api-path";
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  Users,
  RefreshCw,
  Zap,
  ArrowUpRight,
  Brain,
  Layers,
  PieChart,
  Globe,
  Eye,
  MousePointerClick,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getCapabilityLabel } from "@/lib/capability-mode";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProductData {
  promptsPerDay: Array<{ date: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  engineBreakdown: Array<{ mode: string; count: number }>;
  dau: number;
  wau: number;
  mau: number;
  summary: {
    totalPrompts: number;
    activeCreators: number;
    avgPerDay: number;
    conversionRate: string;
    totalProfiles: number;
    enhanceUsers: number;
  };
}

interface TrafficSummary {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  engagementRate: number;
  pagesPerSession: number;
}

interface TrafficDeltas {
  activeUsers: number | null;
  sessions: number | null;
  pageViews: number | null;
  newUsers: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDur(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ── Metric Card ────────────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const isPositive = value > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md",
        isPositive
          ? "bg-emerald-500/10 text-emerald-400"
          : value === 0
            ? "bg-zinc-500/10 text-zinc-500"
            : "bg-rose-500/10 text-rose-400",
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : value < 0 ? (
        <TrendingDown className="w-2.5 h-2.5" />
      ) : null}
      {value > 0 ? "+" : ""}
      {value}%
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  delta,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  delta?: number | null;
  sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-600/10 to-blue-900/5 text-blue-400 border-blue-500/10",
    purple: "from-purple-600/10 to-purple-900/5 text-purple-400 border-purple-500/10",
    emerald: "from-emerald-600/10 to-emerald-900/5 text-emerald-400 border-emerald-500/10",
    amber: "from-amber-600/10 to-amber-900/5 text-amber-400 border-amber-500/10",
  };
  return (
    <div
      className={cn(
        "p-5 rounded-2xl border bg-linear-to-br transition-all duration-500 group cursor-default",
        colors[color],
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
          <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </div>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>
      <div className="space-y-0.5">
        <div className="text-2xl font-black text-white tracking-tighter tabular-nums">{value}</div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{label}</div>
        {sub && <div className="text-[10px] font-bold text-zinc-600 pt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── CSV Export ──────────────────────────────────────────────────────────────────

function exportCSV(data: ProductData) {
  const rows: string[][] = [];

  rows.push(["--- Summary ---"]);
  rows.push(["Metric", "Value"]);
  rows.push(["Total Prompts", String(data.summary.totalPrompts)]);
  rows.push(["Active Creators", String(data.summary.activeCreators)]);
  rows.push(["Avg Per Day", String(data.summary.avgPerDay)]);
  rows.push(["Enhancement Rate", data.summary.conversionRate]);
  rows.push(["Total Profiles", String(data.summary.totalProfiles)]);
  rows.push([]);

  rows.push(["--- Daily Volume ---"]);
  rows.push(["Date", "Count"]);
  data.promptsPerDay.forEach((d) => rows.push([d.date, String(d.count)]));
  rows.push([]);

  rows.push(["--- Top Categories ---"]);
  rows.push(["Category", "Count"]);
  data.topCategories.forEach((c) => rows.push([c.category, String(c.count)]));

  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function AnalyticsOverviewTab() {
  const [product, setProduct] = useState<ProductData>({
    promptsPerDay: [],
    topCategories: [],
    engineBreakdown: [],
    dau: 0,
    wau: 0,
    mau: 0,
    summary: {
      totalPrompts: 0,
      activeCreators: 0,
      avgPerDay: 0,
      conversionRate: "0%",
      totalProfiles: 0,
      enhanceUsers: 0,
    },
  });
  const [traffic, setTraffic] = useState<TrafficSummary | null>(null);
  const [trafficDeltas, setTrafficDeltas] = useState<TrafficDeltas | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const daysMap = { week: 7, month: 30, year: 365 };

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const daysToFetch = daysMap[timeRange];
      const startDate = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000);

      const [productResult, gaResult] = await Promise.all([
        loadProductData(startDate, daysToFetch),
        loadTrafficData(daysToFetch),
      ]);

      setProduct(productResult);
      if (gaResult) {
        setTraffic(gaResult.overview);
        setTrafficDeltas(gaResult.deltas);
      }
    } catch (err) {
      logger.error("Failed to load analytics:", err);
      setError("שגיאה בטעינת הנתונים. נסה שוב.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  async function loadProductData(startDate: Date, daysToFetch: number): Promise<ProductData> {
    const [
      { data: promptsData },
      { data: allPrompts },
      { count: totalProfilesCount },
      { data: enhanceUsers },
      analyticsRes,
    ] = await Promise.all([
      supabase
        .from("personal_library")
        .select("created_at, user_id")
        .gte("created_at", startDate.toISOString()),
      supabase.from("personal_library").select("personal_category"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("prompt_usage_events")
        .select("user_id")
        .in("event_type", ["enhance", "refine"]),
      fetch(getApiPath(`/api/admin/analytics?range=${daysToFetch}`)).catch(() => null),
    ]);

    const analytics: {
      engineBreakdown: Array<{ mode: string; count: number }>;
      dau: number;
      wau: number;
      mau: number;
    } =
      analyticsRes && analyticsRes.ok
        ? await analyticsRes.json()
        : { engineBreakdown: [], dau: 0, wau: 0, mau: 0 };

    const promptsByDay: Record<string, number> = {};
    const dates: string[] = [];
    for (let i = 0; i < daysToFetch; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const dateStr = d.toISOString().split("T")[0];
      dates.push(dateStr);
      promptsByDay[dateStr] = 0;
    }
    promptsData?.forEach((p) => {
      const ds = (p.created_at as string).split("T")[0];
      if (promptsByDay[ds] !== undefined) promptsByDay[ds]++;
    });
    const promptsPerDay = dates.map((date) => ({ date, count: promptsByDay[date] }));

    const catMap: Record<string, number> = {};
    allPrompts?.forEach((p) => {
      const c = (p.personal_category as string) || "כללי";
      catMap[c] = (catMap[c] || 0) + 1;
    });
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, count]) => ({ category, count }));

    const distinctEnhance = new Set(enhanceUsers?.map((r: { user_id: string }) => r.user_id)).size;
    const totalProfiles = totalProfilesCount || 1;
    const conversionPct = ((distinctEnhance / totalProfiles) * 100).toFixed(1);

    const totalPrompts = promptsData?.length || 0;
    const activeCreators =
      new Set(promptsData?.map((p: { user_id: string }) => p.user_id)).size || 0;

    const { engineBreakdown, dau, wau, mau } = analytics;

    return {
      promptsPerDay,
      topCategories: topCategories.length > 0 ? topCategories : [{ category: "None", count: 0 }],
      engineBreakdown,
      dau,
      wau,
      mau,
      summary: {
        totalPrompts,
        activeCreators,
        avgPerDay: Math.round(totalPrompts / daysToFetch),
        conversionRate: `${conversionPct}%`,
        totalProfiles,
        enhanceUsers: distinctEnhance,
      },
    };
  }

  async function loadTrafficData(
    days: number,
  ): Promise<{ overview: TrafficSummary; deltas: TrafficDeltas } | null> {
    try {
      const res = await fetch(getApiPath(`/api/admin/google-analytics?range=${days}`));
      if (!res.ok) return null;
      const json = await res.json();
      return {
        overview: json.overview,
        deltas: {
          activeUsers: json.deltas?.activeUsers ?? null,
          sessions: json.deltas?.sessions ?? null,
          pageViews: json.deltas?.pageViews ?? null,
          newUsers: json.deltas?.newUsers ?? null,
        },
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const maxVal = Math.max(...product.promptsPerDay.map((d) => d.count), 1);
  const totalCatCount = product.topCategories.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Time range + refresh controls */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex p-1 bg-white/5 border border-white/5 rounded-xl">
          {(["week", "month", "year"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                timeRange === r
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              {r === "week" ? "שבוע" : r === "month" ? "חודש" : "שנה"}
            </button>
          ))}
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            נסה שוב
          </button>
        </div>
      )}

      {/* Website Traffic (from GA4) */}
      {traffic && (
        <>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Website Traffic
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Visitors"
              value={fmtNum(traffic.activeUsers)}
              icon={Users}
              color="blue"
              delta={trafficDeltas?.activeUsers}
              sub={`${fmtNum(traffic.newUsers)} חדשים`}
            />
            <MetricCard
              label="Sessions"
              value={fmtNum(traffic.sessions)}
              icon={Eye}
              color="emerald"
              delta={trafficDeltas?.sessions}
            />
            <MetricCard
              label="Page Views"
              value={fmtNum(traffic.pageViews)}
              icon={MousePointerClick}
              color="purple"
              delta={trafficDeltas?.pageViews}
              sub={`${traffic.pagesPerSession?.toFixed(1) || "-"} per session`}
            />
            <MetricCard
              label="Engagement"
              value={fmtPct(traffic.engagementRate || 0)}
              icon={Zap}
              color="amber"
              sub={`Avg: ${fmtDur(traffic.avgSessionDuration)}`}
            />
          </div>
        </>
      )}

      {/* Product Metrics (from Supabase) */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
          Product Metrics
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Generations"
          value={product.summary.totalPrompts.toLocaleString()}
          icon={Brain}
          color="blue"
        />
        <MetricCard
          label="Active Creators"
          value={product.summary.activeCreators.toLocaleString()}
          icon={Users}
          color="purple"
        />
        <MetricCard
          label="Daily Average"
          value={product.summary.avgPerDay.toString()}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          label="Enhancement Rate"
          value={product.summary.conversionRate}
          icon={Zap}
          color="amber"
          sub={`${product.summary.enhanceUsers} of ${product.summary.totalProfiles} users`}
        />
      </div>

      {/* DAU / WAU / MAU */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/5 bg-zinc-950 p-5 text-center space-y-1">
          <div className="text-2xl font-black text-white tabular-nums">
            {product.dau.toLocaleString()}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            DAU — יום
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-zinc-950 p-5 text-center space-y-1">
          <div className="text-2xl font-black text-white tabular-nums">
            {product.wau.toLocaleString()}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            WAU — שבוע
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-zinc-950 p-5 text-center space-y-1">
          <div className="text-2xl font-black text-white tabular-nums">
            {product.mau.toLocaleString()}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            MAU — חודש
          </div>
        </div>
      </div>

      {/* Engine breakdown */}
      {product.engineBreakdown.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Engine Breakdown
            </span>
          </div>
          <div className="rounded-3xl border border-white/5 bg-zinc-950 p-6 space-y-4">
            {product.engineBreakdown.map(({ mode, count }) => {
              const total = product.engineBreakdown.reduce((s, e) => s + e.count, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={mode} className="space-y-1 group cursor-default">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-zinc-300">{getCapabilityLabel(mode)}</span>
                    <div className="flex gap-2 text-zinc-500 text-xs font-bold">
                      <span>{count.toLocaleString()}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generations Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-zinc-950 p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BarChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">נפח פעילות יומי</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                Generations Volume
              </p>
            </div>
          </div>

          <div className="h-56 flex items-end gap-1.5 px-1">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-white/5" />
              </div>
            ) : (
              product.promptsPerDay.map((day, i) => {
                const isLast = i === product.promptsPerDay.length - 1;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2 group h-full justify-end min-w-0"
                  >
                    <div className="w-full relative">
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-all duration-500",
                          isLast
                            ? "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            : "bg-linear-to-t from-blue-600 to-blue-400 group-hover:from-blue-400 group-hover:to-white group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
                        )}
                        style={{ height: `${(day.count / maxVal) * 100}%`, minHeight: "3px" }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-zinc-800 text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-white/10 pointer-events-none whitespace-nowrap shadow-2xl z-10">
                        {day.count}
                      </div>
                    </div>
                    {(i % Math.max(Math.floor(product.promptsPerDay.length / 7), 1) === 0 ||
                      isLast) && (
                      <div className="text-[8px] font-black text-slate-600 group-hover:text-slate-300 transition-colors">
                        {new Date(day.date).toLocaleDateString("he-IL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-3xl border border-white/5 bg-zinc-950 p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">פילוח קטגוריות</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                Usage Distribution
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {product.topCategories.map((c, i) => {
              const pct = Math.round((c.count / totalCatCount) * 100);
              return (
                <div key={i} className="space-y-1.5 group cursor-default">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                        {c.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-600">{c.count}</span>
                      <span className="text-[10px] font-black text-slate-500">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-purple-600 to-indigo-400 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={() => exportCSV(product)}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-3xl border border-white/5 bg-zinc-950 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">Conversion Funnel</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              From visit to enhancement
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch gap-3">
          {[
            {
              label: "מבקרים",
              value: traffic?.activeUsers ?? "-",
              color: "from-blue-600/20 to-blue-600/5 border-blue-500/20",
            },
            {
              label: "נרשמו",
              value: product.summary.totalProfiles,
              color: "from-purple-600/20 to-purple-600/5 border-purple-500/20",
            },
            {
              label: "יצרו פרומפט",
              value: product.summary.activeCreators,
              color: "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20",
            },
            {
              label: "השתמשו בשדרוג",
              value: product.summary.enhanceUsers,
              color: "from-amber-600/20 to-amber-600/5 border-amber-500/20",
            },
          ].map((step, i, arr) => {
            const prevValue =
              i === 0
                ? typeof step.value === "number"
                  ? step.value
                  : 0
                : typeof arr[i - 1].value === "number"
                  ? (arr[i - 1].value as number)
                  : 0;
            const currentValue = typeof step.value === "number" ? step.value : 0;
            const dropoff =
              i > 0 && prevValue > 0 ? Math.round((currentValue / prevValue) * 100) : null;
            return (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div
                  className={cn(
                    "flex-1 p-5 rounded-2xl border bg-linear-to-b text-center",
                    step.color,
                  )}
                >
                  <div className="text-2xl font-black text-white tabular-nums">
                    {typeof step.value === "number" ? fmtNum(step.value) : step.value}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-400 mt-1">{step.label}</div>
                  {dropoff !== null && (
                    <div className="text-[9px] font-black text-zinc-600 mt-1">
                      {dropoff}% מהשלב הקודם
                    </div>
                  )}
                </div>
                {i < arr.length - 1 && (
                  <ArrowUpRight className="w-4 h-4 text-zinc-700 shrink-0 -rotate-45 hidden md:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
