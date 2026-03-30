"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  Globe,
  Users,
  Eye,
  Timer,
  TrendingUp,
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  RefreshCw,
  BarChart3,
  Share2,
  MapPin,
  AlertCircle,
  Clock,
  Zap,
  MousePointerClick,
  ExternalLink,
  Chrome,
  LucideIcon,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface GAOverview {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  engagedSessions: number;
  totalEngagementDuration: number;
  sessionsPerUser: number;
  pagesPerSession: number;
  engagementRate: number;
}

interface GADeltas {
  activeUsers: number | null;
  sessions: number | null;
  pageViews: number | null;
  bounceRate: number | null;
  avgSessionDuration: number | null;
  newUsers: number | null;
}

interface GADaily {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  engagedSessions: number;
}

interface GAPage {
  path: string;
  pageViews: number;
  users: number;
  avgDuration: number;
  bounceRate: number;
}

interface GASource {
  channel: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgDuration: number;
}

interface GASourceMedium {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgDuration: number;
}

interface GALandingPage {
  path: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgDuration: number;
}

interface GADevice {
  device: string;
  sessions: number;
  users: number;
  bounceRate: number;
}

interface GACountry {
  country: string;
  sessions: number;
  users: number;
  bounceRate: number;
}

interface GAEvent {
  name: string;
  count: number;
  users: number;
}

interface GAHourly {
  hour: string;
  activeUsers: number;
  sessions: number;
}

interface GABrowser {
  browser: string;
  sessions: number;
  users: number;
}

interface GAData {
  overview: GAOverview;
  deltas: GADeltas;
  daily: GADaily[];
  topPages: GAPage[];
  trafficSources: GASource[];
  devices: GADevice[];
  countries: GACountry[];
  sourceMedium: GASourceMedium[];
  landingPages: GALandingPage[];
  events: GAEvent[];
  hourly: GAHourly[];
  browsers: GABrowser[];
  range: number;
  generatedAt: string;
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

function fmtDate(dateStr: string): string {
  if (dateStr.length === 8) {
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  }
  return dateStr;
}

function fmtHour(h: string): string {
  const n = parseInt(h, 10);
  return `${n.toString().padStart(2, "0")}:00`;
}

const DEVICE_ICON: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.04]", className)} />;
}

// ── Delta Badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ value, invertColor }: { value: number | null; invertColor?: boolean }) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isGood = invertColor ? !isPositive : isPositive;
  return (
    <div className={cn(
      "flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md",
      isGood ? "bg-emerald-500/10 text-emerald-400" : value === 0 ? "bg-zinc-500/10 text-zinc-500" : "bg-rose-500/10 text-rose-400"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : null}
      {value > 0 ? "+" : ""}{value}%
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

type AccentColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";

const ACCENT: Record<AccentColor, { icon: string; border: string; glow: string }> = {
  blue:    { icon: "text-blue-400",    border: "hover:border-blue-500/30",    glow: "hover:shadow-blue-500/10"    },
  purple:  { icon: "text-purple-400",  border: "hover:border-purple-500/30",  glow: "hover:shadow-purple-500/10"  },
  emerald: { icon: "text-emerald-400", border: "hover:border-emerald-500/30", glow: "hover:shadow-emerald-500/10" },
  amber:   { icon: "text-amber-400",   border: "hover:border-amber-500/30",   glow: "hover:shadow-amber-500/10"   },
  rose:    { icon: "text-rose-400",    border: "hover:border-rose-500/30",    glow: "hover:shadow-rose-500/10"    },
  cyan:    { icon: "text-cyan-400",    border: "hover:border-cyan-500/30",    glow: "hover:shadow-cyan-500/10"    },
};

function KpiCard({ label, value, sub, icon: Icon, color, delta, invertDelta }: {
  label: string; value: string; sub?: string; icon: LucideIcon; color: AccentColor;
  delta?: number | null; invertDelta?: boolean;
}) {
  const a = ACCENT[color];
  return (
    <div className={cn(
      "p-6 rounded-3xl bg-zinc-950 border border-white/5 flex flex-col gap-4 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl cursor-default",
      a.border, a.glow,
    )}>
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-xl bg-zinc-900 border border-white/5", a.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        {delta !== undefined && <DeltaBadge value={delta ?? null} invertColor={invertDelta} />}
      </div>
      <div className="space-y-0.5">
        <div className="text-3xl font-black text-white tracking-tighter tabular-nums">{value}</div>
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">{label}</div>
        {sub && <div className="text-[10px] font-bold text-zinc-600 pt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, icon: Icon, color, children, className }: {
  title: string; subtitle: string; icon: LucideIcon; color: AccentColor; children: React.ReactNode; className?: string;
}) {
  const a = ACCENT[color];
  return (
    <div className={cn("p-6 md:p-8 rounded-3xl bg-zinc-950 border border-white/5 flex flex-col gap-6", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-xl bg-zinc-900 border border-white/5", a.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function DailyChart({ data, metric }: { data: GADaily[]; metric: "pageViews" | "sessions" | "activeUsers" }) {
  const max = Math.max(...data.map((d) => d[metric]), 1);
  const visibleData = data.slice(-28);

  return (
    <div className="flex items-end gap-1 h-48 w-full">
      {visibleData.map((d, i) => {
        const pct = Math.round((d[metric] / max) * 100);
        const isLast = i === visibleData.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end min-w-0">
            <span className={cn(
              "text-[8px] font-black tabular-nums transition-opacity duration-300",
              isLast ? "text-blue-400 opacity-100" : "text-zinc-700 opacity-0 group-hover/bar:opacity-100"
            )}>
              {fmtNum(d[metric])}
            </span>
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-500",
                isLast ? "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "bg-zinc-800 group-hover/bar:bg-zinc-700"
              )}
              style={{ height: `${Math.max(pct, 3)}%` }}
            />
            {(i % 7 === 0 || isLast) && (
              <span className="text-[8px] font-bold text-zinc-600 truncate w-full text-center">{fmtDate(d.date)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Hourly Heatmap ────────────────────────────────────────────────────────────

function HourlyChart({ data }: { data: GAHourly[] }) {
  const max = Math.max(...data.map((d) => d.sessions), 1);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d) => {
        const pct = Math.round((d.sessions / max) * 100);
        const intensity = pct / 100;
        return (
          <div key={d.hour} className="flex-1 flex flex-col items-center gap-1.5 group/bar h-full justify-end min-w-0">
            <span className="text-[7px] font-black text-zinc-700 opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums">
              {d.sessions}
            </span>
            <div
              className="w-full rounded-t-sm transition-all duration-500 group-hover/bar:shadow-[0_0_8px_rgba(168,85,247,0.3)]"
              style={{
                height: `${Math.max(pct, 4)}%`,
                backgroundColor: `rgba(168, 85, 247, ${0.15 + intensity * 0.85})`,
              }}
            />
            {parseInt(d.hour) % 4 === 0 && (
              <span className="text-[7px] font-bold text-zinc-600 tabular-nums">{fmtHour(d.hour)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Table Header ──────────────────────────────────────────────────────────────

function TableHeader({ cols }: { cols: { label: string; className?: string }[] }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-600">
      {cols.map((c) => <span key={c.label} className={c.className}>{c.label}</span>)}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

type RangeOption = 7 | 14 | 28 | 90;

export default function TrafficTab() {
  const [data, setData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>(28);
  const [chartMetric, setChartMetric] = useState<"pageViews" | "sessions" | "activeUsers">("pageViews");
  const [activeTab, setActiveTab] = useState<"overview" | "acquisition" | "engagement" | "tech">("overview");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath(`/api/admin/google-analytics?range=${range}`));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !data) {
    return (
      <div className="space-y-10 pb-20">
        <div className="space-y-3"><Skeleton className="h-14 w-80" /><Skeleton className="h-4 w-64" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-6 rounded-3xl bg-zinc-950 border border-white/5 space-y-4">
              <Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-8 w-24" /><Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="p-6 rounded-full bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <p className="text-lg font-black text-white">Google Analytics Unavailable</p>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
        <button onClick={loadData} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/5 hover:border-white/10">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const totalDeviceSessions = data.devices.reduce((s, d) => s + d.sessions, 0) || 1;
  const totalSourceSessions = data.trafficSources.reduce((s, d) => s + d.sessions, 0) || 1;

  const innerTabs = [
    { key: "overview" as const, label: "סקירה כללית" },
    { key: "acquisition" as const, label: "רכישת משתמשים" },
    { key: "engagement" as const, label: "מעורבות" },
    { key: "tech" as const, label: "טכנולוגיה" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 select-none pb-24">

      {/* Controls row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/50 px-6 md:px-10 py-6 rounded-3xl border border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500">Google Analytics 4</span>
          </div>
          <p className="text-zinc-500 font-medium tracking-tight text-sm">
            תעבורה, מעורבות ומקורות הגעה — {data.range} ימים אחרונים
          </p>
        </div>

        <div className="flex flex-col gap-3 shrink-0 items-end">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5">
            {([7, 14, 28, 90] as RangeOption[]).map((opt) => (
              <button key={opt} onClick={() => setRange(opt)} className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                range === opt ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
              )}>
                {opt}d
              </button>
            ))}
          </div>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest hover:text-white transition-colors">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            {loading ? "טוען..." : "רענן נתונים"}
          </button>
        </div>
      </div>

      {/* Inner Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 w-fit">
        {innerTabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === t.key ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300"
          )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard label="Active Users" value={fmtNum(data.overview.activeUsers)} sub={`${fmtNum(data.overview.newUsers)} חדשים`} icon={Users} color="blue" delta={data.deltas.activeUsers} />
            <KpiCard label="Sessions" value={fmtNum(data.overview.sessions)} sub={`${data.overview.sessionsPerUser.toFixed(1)} per user`} icon={TrendingUp} color="emerald" delta={data.deltas.sessions} />
            <KpiCard label="Page Views" value={fmtNum(data.overview.pageViews)} sub={`${data.overview.pagesPerSession.toFixed(1)} per session`} icon={Eye} color="purple" delta={data.deltas.pageViews} />
            <KpiCard label="Bounce Rate" value={fmtPct(data.overview.bounceRate)} sub={`Avg: ${fmtDur(data.overview.avgSessionDuration)}`} icon={Timer} color="amber" delta={data.deltas.bounceRate} invertDelta />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard label="Engagement Rate" value={fmtPct(data.overview.engagementRate)} icon={Zap} color="cyan" />
            <KpiCard label="Engaged Sessions" value={fmtNum(data.overview.engagedSessions)} icon={MousePointerClick} color="rose" />
            <KpiCard label="Avg Session Duration" value={fmtDur(data.overview.avgSessionDuration)} icon={Clock} color="purple" delta={data.deltas.avgSessionDuration} />
            <KpiCard label="New Users" value={fmtNum(data.overview.newUsers)} icon={Users} color="emerald" delta={data.deltas.newUsers} />
          </div>

          <SectionCard title="נפח פעילות יומי" subtitle="Daily traffic" icon={BarChart3} color="blue">
            <div className="flex items-center justify-end gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 w-fit ms-auto">
              {(["pageViews", "sessions", "activeUsers"] as const).map((m) => (
                <button key={m} onClick={() => setChartMetric(m)} className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  chartMetric === m ? "bg-blue-600 text-white" : "text-zinc-600 hover:text-zinc-300"
                )}>
                  {m === "pageViews" ? "Views" : m === "sessions" ? "Sessions" : "Users"}
                </button>
              ))}
            </div>
            <DailyChart data={data.daily} metric={chartMetric} />
          </SectionCard>

          {data.hourly.length > 0 && (
            <SectionCard title="דפוס פעילות לפי שעה" subtitle="Peak hours (last 7 days)" icon={Clock} color="purple">
              <HourlyChart data={data.hourly} />
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-600 px-1">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* ACQUISITION TAB */}
      {activeTab === "acquisition" && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard title="ערוצי תעבורה" subtitle="Channel groups" icon={Share2} color="emerald">
              <div className="space-y-4">
                {data.trafficSources.map((src) => {
                  const pct = Math.round((src.sessions / totalSourceSessions) * 100);
                  return (
                    <div key={src.channel} className="space-y-2 group cursor-default">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{src.channel}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-600">{fmtNum(src.sessions)} sessions</span>
                          <span className="text-[10px] font-bold text-zinc-600">{fmtDur(src.avgDuration)}</span>
                          <span className="text-[10px] font-black text-zinc-500">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="מקור / אמצעי" subtitle="Source / Medium detail" icon={ExternalLink} color="blue">
              <div className="space-y-1 overflow-y-auto max-h-[350px] custom-scrollbar">
                <TableHeader cols={[
                  { label: "Source / Medium", className: "flex-1" },
                  { label: "Sessions", className: "w-16 text-left" },
                  { label: "Users", className: "w-14 text-left" },
                  { label: "Bounce", className: "w-14 text-left" },
                  { label: "Avg Time", className: "w-16 text-left" },
                ]} />
                {data.sourceMedium.map((sm, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group/row">
                    <span className="flex-1 text-sm font-bold text-zinc-400 truncate group-hover/row:text-white transition-colors" dir="ltr">
                      {sm.source} / {sm.medium}
                    </span>
                    <span className="w-16 text-xs font-black text-white tabular-nums text-left">{fmtNum(sm.sessions)}</span>
                    <span className="w-14 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtNum(sm.users)}</span>
                    <span className="w-14 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtPct(sm.bounceRate)}</span>
                    <span className="w-16 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtDur(sm.avgDuration)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="דפי נחיתה" subtitle="Entry points" icon={ExternalLink} color="purple">
            <div className="space-y-1 overflow-y-auto max-h-[400px] custom-scrollbar">
              <TableHeader cols={[
                { label: "#", className: "w-5" },
                { label: "Page", className: "flex-1" },
                { label: "Sessions", className: "w-16 text-left" },
                { label: "Users", className: "w-14 text-left" },
                { label: "Bounce", className: "w-14 text-left" },
                { label: "Avg Time", className: "w-16 text-left" },
              ]} />
              {data.landingPages.map((lp, i) => (
                <div key={lp.path} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group/row">
                  <span className="text-[10px] font-black text-zinc-700 w-5 tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-zinc-400 truncate font-mono group-hover/row:text-white transition-colors" dir="ltr">{lp.path || "/"}</span>
                  <span className="w-16 text-xs font-black text-white tabular-nums text-left">{fmtNum(lp.sessions)}</span>
                  <span className="w-14 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtNum(lp.users)}</span>
                  <span className="w-14 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtPct(lp.bounceRate)}</span>
                  <span className="w-16 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtDur(lp.avgDuration)}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="מדינות מובילות" subtitle="Top countries" icon={MapPin} color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.countries.map((c, i) => {
                const pct = Math.round((c.sessions / (data.countries[0]?.sessions || 1)) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <span className="text-[10px] font-black text-zinc-700 w-4 tabular-nums">{i + 1}</span>
                    <span className="text-sm font-bold text-zinc-300 flex-1">{c.country}</span>
                    <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-black text-white tabular-nums w-10 text-left">{fmtNum(c.sessions)}</span>
                    <span className="text-[10px] font-bold text-zinc-600 tabular-nums">{fmtPct(c.bounceRate)}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}

      {/* ENGAGEMENT TAB */}
      {activeTab === "engagement" && (
        <>
          <SectionCard title="דפים מובילים" subtitle="Most viewed pages" icon={Eye} color="purple">
            <div className="space-y-1 overflow-y-auto max-h-[500px] custom-scrollbar">
              <TableHeader cols={[
                { label: "#", className: "w-5" },
                { label: "Page", className: "flex-1" },
                { label: "Views", className: "w-16 text-left" },
                { label: "Users", className: "w-14 text-left" },
                { label: "Bounce", className: "w-14 text-left" },
                { label: "Avg Time", className: "w-16 text-left" },
              ]} />
              {data.topPages.map((page, i) => (
                <div key={page.path} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group/row">
                  <span className="text-[10px] font-black text-zinc-700 w-5 tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-zinc-400 truncate font-mono group-hover/row:text-white transition-colors" dir="ltr">{page.path}</span>
                  <span className="w-16 text-xs font-black text-white tabular-nums text-left">{fmtNum(page.pageViews)}</span>
                  <span className="w-14 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtNum(page.users)}</span>
                  <span className="w-14 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtPct(page.bounceRate)}</span>
                  <span className="w-16 text-[10px] font-bold text-zinc-500 tabular-nums text-left">{fmtDur(page.avgDuration)}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="אירועים" subtitle="Event tracking" icon={MousePointerClick} color="rose">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.events.map((evt) => {
                const maxCount = data.events[0]?.count || 1;
                const pct = Math.round((evt.count / maxCount) * 100);
                return (
                  <div key={evt.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group/row cursor-default">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-400 group-hover/row:text-white transition-colors truncate font-mono" dir="ltr">{evt.name}</div>
                      <div className="h-1 mt-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500/50 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-xs font-black text-white tabular-nums">{fmtNum(evt.count)}</div>
                      <div className="text-[9px] font-bold text-zinc-600 tabular-nums">{fmtNum(evt.users)} users</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {data.hourly.length > 0 && (
            <SectionCard title="דפוס פעילות לפי שעה" subtitle="Peak hours (last 7 days)" icon={Clock} color="cyan">
              <HourlyChart data={data.hourly} />
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-600 px-1">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* TECH TAB */}
      {activeTab === "tech" && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard title="מכשירים" subtitle="Device categories" icon={Monitor} color="cyan">
              <div className="space-y-4">
                {data.devices.map((d) => {
                  const pct = Math.round((d.sessions / totalDeviceSessions) * 100);
                  const DevIcon = DEVICE_ICON[d.device.toLowerCase()] || Monitor;
                  return (
                    <div key={d.device} className="flex items-center gap-4 group cursor-default">
                      <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-cyan-400">
                        <DevIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-zinc-300 capitalize group-hover:text-white transition-colors">{d.device}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-zinc-600">{fmtNum(d.sessions)} sessions</span>
                            <span className="text-[10px] font-bold text-zinc-600">Bounce: {fmtPct(d.bounceRate)}</span>
                            <span className="text-sm font-black text-white tabular-nums">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="דפדפנים" subtitle="Browser breakdown" icon={Chrome} color="blue">
              <div className="space-y-3">
                {data.browsers.map((b, i) => {
                  const totalBrowserSessions = data.browsers.reduce((s, br) => s + br.sessions, 0) || 1;
                  const pct = Math.round((b.sessions / totalBrowserSessions) * 100);
                  return (
                    <div key={b.browser} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors cursor-default">
                      <span className="text-[10px] font-black text-zinc-700 w-4 tabular-nums">{i + 1}</span>
                      <span className="text-sm font-bold text-zinc-300 flex-1">{b.browser}</span>
                      <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-black text-white tabular-nums w-10 text-left">{pct}%</span>
                      <span className="text-[10px] font-bold text-zinc-600 tabular-nums">{fmtNum(b.sessions)}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="מדינות" subtitle="Geographic distribution" icon={MapPin} color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.countries.map((c, i) => {
                const pct = Math.round((c.sessions / (data.countries[0]?.sessions || 1)) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <span className="text-[10px] font-black text-zinc-700 w-4 tabular-nums">{i + 1}</span>
                    <span className="text-sm font-bold text-zinc-300 flex-1">{c.country}</span>
                    <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-black text-white tabular-nums w-10 text-left">{fmtNum(c.sessions)}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[9px] font-bold text-zinc-700 uppercase tracking-widest px-2">
        <span>Data generated at {new Date(data.generatedAt).toLocaleString("he-IL")}</span>
        <span className="flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" />
          Powered by GA4 Data API
        </span>
      </div>
    </div>
  );
}
