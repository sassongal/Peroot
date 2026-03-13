"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  Globe,
  Users,
  Eye,
  Timer,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  RefreshCw,
  BarChart3,
  Share2,
  MapPin,
  AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface GAOverview {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
}

interface GADaily {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
}

interface GAPage {
  path: string;
  pageViews: number;
  users: number;
  avgDuration: number;
}

interface GASource {
  channel: string;
  sessions: number;
  users: number;
  bounceRate: number;
}

interface GADevice {
  device: string;
  sessions: number;
  users: number;
}

interface GACountry {
  country: string;
  sessions: number;
  users: number;
}

interface GAData {
  overview: GAOverview;
  daily: GADaily[];
  topPages: GAPage[];
  trafficSources: GASource[];
  devices: GADevice[];
  countries: GACountry[];
  range: number;
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  // GA4 returns dates as YYYYMMDD
  if (dateStr.length === 8) {
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
    });
  }
  return dateStr;
}

const DEVICE_ICON: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-white/[0.04]", className)} />
  );
}

function PageSkeleton() {
  return (
    <AdminLayout>
      <div className="space-y-10 pb-20" dir="rtl">
        <div className="space-y-3">
          <Skeleton className="h-14 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 space-y-6">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-[36px]" />
      </div>
    </AdminLayout>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

type AccentColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";

const ACCENT: Record<AccentColor, { icon: string; border: string; glow: string; badge: string }> = {
  blue:    { icon: "text-blue-400",    border: "hover:border-blue-500/30",    glow: "hover:shadow-blue-500/10",    badge: "bg-blue-500/10 text-blue-400" },
  purple:  { icon: "text-purple-400",  border: "hover:border-purple-500/30",  glow: "hover:shadow-purple-500/10",  badge: "bg-purple-500/10 text-purple-400" },
  emerald: { icon: "text-emerald-400", border: "hover:border-emerald-500/30", glow: "hover:shadow-emerald-500/10", badge: "bg-emerald-500/10 text-emerald-400" },
  amber:   { icon: "text-amber-400",   border: "hover:border-amber-500/30",   glow: "hover:shadow-amber-500/10",   badge: "bg-amber-500/10 text-amber-400" },
  rose:    { icon: "text-rose-400",    border: "hover:border-rose-500/30",    glow: "hover:shadow-rose-500/10",    badge: "bg-rose-500/10 text-rose-400" },
  cyan:    { icon: "text-cyan-400",    border: "hover:border-cyan-500/30",    glow: "hover:shadow-cyan-500/10",    badge: "bg-cyan-500/10 text-cyan-400" },
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: AccentColor;
}) {
  const a = ACCENT[color];
  return (
    <div
      className={cn(
        "p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6",
        "transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl",
        a.border,
        a.glow,
      )}
    >
      <div className={cn("p-4 rounded-2xl bg-zinc-900 border border-white/5 w-fit", a.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter tabular-nums">{value}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{label}</div>
        {sub && <div className="text-[10px] font-bold text-zinc-600 pt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────────────────────

function DailyChart({ data, metric }: { data: GADaily[]; metric: "pageViews" | "sessions" | "activeUsers" }) {
  const max = Math.max(...data.map((d) => d[metric]), 1);
  // Show last 28 items max for readability
  const visibleData = data.slice(-28);

  return (
    <div className="flex items-end gap-1.5 h-48 w-full">
      {visibleData.map((d, i) => {
        const pct = Math.round((d[metric] / max) * 100);
        const isLast = i === visibleData.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end min-w-0">
            <span
              className={cn(
                "text-[8px] font-black tabular-nums transition-opacity duration-300",
                isLast ? "text-blue-400 opacity-100" : "text-zinc-700 opacity-0 group-hover/bar:opacity-100"
              )}
            >
              {formatNumber(d[metric])}
            </span>
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-500",
                isLast
                  ? "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  : "bg-zinc-800 group-hover/bar:bg-zinc-700"
              )}
              style={{ height: `${Math.max(pct, 3)}%` }}
            />
            {/* Show date labels for every 7th item to avoid clutter */}
            {(i % 7 === 0 || isLast) && (
              <span className="text-[8px] font-bold text-zinc-600 truncate w-full text-center">
                {formatDate(d.date)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type RangeOption = 7 | 14 | 28 | 90;

export default function GoogleAnalyticsPage() {
  const [data, setData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>(28);
  const [chartMetric, setChartMetric] = useState<"pageViews" | "sessions" | "activeUsers">("pageViews");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath(`/api/admin/google-analytics?range=${range}`));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: GAData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) return <PageSkeleton />;

  if (error && !data) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-6" dir="rtl">
          <div className="p-6 rounded-full bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <p className="text-lg font-black text-white">Google Analytics Unavailable</p>
            <p className="text-sm text-zinc-500">{error}</p>
            <p className="text-[10px] text-zinc-600 mt-4">
              Make sure <code className="text-zinc-400">GA4_PROPERTY_ID</code> and{" "}
              <code className="text-zinc-400">GOOGLE_APPLICATION_CREDENTIALS_JSON</code> are set in your environment.
            </p>
          </div>
          <button
            onClick={loadData}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/5 hover:border-white/10"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  const totalDeviceSessions = data.devices.reduce((s, d) => s + d.sessions, 0) || 1;
  const totalSourceSessions = data.trafficSources.reduce((s, d) => s + d.sessions, 0) || 1;

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 select-none pb-24" dir="rtl">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 px-10 py-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
                Google Analytics 4
              </span>
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              Website Analytics
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-lg">
              נתוני תעבורה, מבקרים ומקורות הגעה מ-Google Analytics
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0 items-end">
            {/* Range selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5">
              {([7, 14, 28, 90] as RangeOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRange(opt)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    range === opt
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  {opt}d
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest hover:text-white transition-colors"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              {loading ? "טוען..." : "רענן נתונים"}
            </button>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            label="Active Users"
            value={formatNumber(data.overview.activeUsers)}
            sub={`${formatNumber(data.overview.newUsers)} new`}
            icon={Users}
            color="blue"
          />
          <KpiCard
            label="Sessions"
            value={formatNumber(data.overview.sessions)}
            icon={TrendingUp}
            color="emerald"
          />
          <KpiCard
            label="Page Views"
            value={formatNumber(data.overview.pageViews)}
            icon={Eye}
            color="purple"
          />
          <KpiCard
            label="Bounce Rate"
            value={formatPercent(data.overview.bounceRate)}
            sub={`Avg: ${formatDuration(data.overview.avgSessionDuration)}`}
            icon={Timer}
            color="amber"
          />
        </div>

        {/* ── Daily Chart ── */}
        <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.03] to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Daily Traffic</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                    Last {range} days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
                {(["pageViews", "sessions", "activeUsers"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      chartMetric === m
                        ? "bg-blue-600 text-white"
                        : "text-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    {m === "pageViews" ? "Views" : m === "sessions" ? "Sessions" : "Users"}
                  </button>
                ))}
              </div>
            </div>

            <DailyChart data={data.daily} metric={chartMetric} />
          </div>
        </div>

        {/* ── Bottom Grid: Pages + Sources + Devices ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Top Pages */}
          <div className="xl:col-span-2 p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-purple-400">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Top Pages</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                  Most viewed pages
                </p>
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[400px] custom-scrollbar">
              {/* Header */}
              <div className="flex items-center gap-4 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                <span className="flex-1">Page</span>
                <span className="w-20 text-left">Views</span>
                <span className="w-16 text-left">Users</span>
                <span className="w-16 text-left">Avg Time</span>
              </div>
              {data.topPages.map((page, i) => (
                <div
                  key={page.path}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors group/row"
                >
                  <span className="text-[10px] font-black text-zinc-700 w-5 tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-zinc-300 truncate font-mono group-hover/row:text-white transition-colors" dir="ltr">
                    {page.path}
                  </span>
                  <span className="w-20 text-sm font-black text-white tabular-nums text-left">{formatNumber(page.pageViews)}</span>
                  <span className="w-16 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{formatNumber(page.users)}</span>
                  <span className="w-16 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{formatDuration(page.avgDuration)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Sources + Devices */}
          <div className="flex flex-col gap-6">

            {/* Traffic Sources */}
            <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Traffic Sources</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Channel groups</p>
                </div>
              </div>

              <div className="space-y-4">
                {data.trafficSources.map((src) => {
                  const pct = Math.round((src.sessions / totalSourceSessions) * 100);
                  return (
                    <div key={src.channel} className="space-y-2 group">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                          {src.channel}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-600">{formatNumber(src.sessions)} sessions</span>
                          <span className="text-[10px] font-black text-zinc-500">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Devices */}
            <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-cyan-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Devices</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">By category</p>
                </div>
              </div>

              <div className="space-y-3">
                {data.devices.map((d) => {
                  const pct = Math.round((d.sessions / totalDeviceSessions) * 100);
                  const DevIcon = DEVICE_ICON[d.device.toLowerCase()] || Monitor;
                  return (
                    <div key={d.device} className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors">
                      <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-cyan-400">
                        <DevIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-zinc-300 capitalize flex-1">{d.device}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-white tabular-nums">{pct}%</span>
                        <span className="text-[10px] font-bold text-zinc-600 tabular-nums">{formatNumber(d.sessions)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Countries */}
            <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-amber-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Top Countries</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">By sessions</p>
                </div>
              </div>

              <div className="space-y-2">
                {data.countries.map((c, i) => (
                  <div key={c.country} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <span className="text-[10px] font-black text-zinc-700 w-4 tabular-nums">{i + 1}</span>
                    <span className="text-sm font-bold text-zinc-300 flex-1">{c.country}</span>
                    <span className="text-sm font-black text-white tabular-nums">{formatNumber(c.sessions)}</span>
                    <span className="text-[10px] font-bold text-zinc-600 tabular-nums">{formatNumber(c.users)} users</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer timestamp ── */}
        <div className="text-center text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
          Data generated at {new Date(data.generatedAt).toLocaleString("he-IL")}
        </div>
      </div>
    </AdminLayout>
  );
}
