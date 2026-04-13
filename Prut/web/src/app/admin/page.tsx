"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  CircleDollarSign,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
  Sparkles,
  BarChart3,
  Target,
  Percent,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { InfoTooltip } from "@/components/admin/InfoTooltip";
import { getApiPath } from "@/lib/api-path";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

// ─── Data Shape ─────────────────────────────────────────────────────────────

interface DashboardData {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  conversionRate: string;
  totalRevenue: number;
  apiCostsMTD: number;
  manualCostsMTD: number;
  promptsThisMonth: number;
  promptsToday: number;
  totalGenerations: number;
  generationsToday: number;
  generationsThisMonth: number;
  dau: number;
  wau: number;
  mau: number;
  avgPromptsPerUser: string;
  modeDistribution: Record<string, number>;
  errorCountMTD: number;
  recentSignups: Array<{ id: string; created_at: string; plan_tier: string; email?: string }>;
  recentActivity: Array<{
    id: string;
    user_id: string;
    action: string;
    created_at: string;
    details: Record<string, unknown> | null;
  }>;
  monthlyTrend: Array<{ month: string; newUsers: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

const PLAN_BADGE: Record<string, string> = {
  pro: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  free: "bg-zinc-800 text-zinc-500 border-white/5",
  premium: "bg-purple-500/15 text-purple-400 border-purple-500/25",
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "animate-pulse rounded-lg bg-white/4",
        className
      )}
    />
  );
}

function DashboardSkeleton() {
  return (
    <AdminLayout>
      <div className="space-y-10 pb-20" dir="rtl">
        {/* Header skeleton */}
        <div className="bg-zinc-950/50 p-10 rounded-[40px] border border-white/5 flex justify-between items-end">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-14 w-80" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-52 rounded-2xl" />
        </div>

        {/* KPI row skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 space-y-6">
              <div className="flex justify-between">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts row skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-[36px] bg-zinc-950 border border-white/5 p-8 h-64">
            <Skeleton className="h-6 w-48 mb-8" />
            <div className="flex items-end gap-3 h-32">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${40 + i * 12}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-[36px] bg-zinc-950 border border-white/5 p-8 h-64 flex items-center justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>

        {/* Bottom row skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-[36px] bg-zinc-950 border border-white/5 p-8 space-y-4">
              <Skeleton className="h-6 w-40 mb-6" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

type AccentColor = "blue" | "purple" | "emerald" | "amber" | "rose";

const ACCENT: Record<AccentColor, {
  icon: string;
  border: string;
  glow: string;
  badge: string;
  bar: string;
}> = {
  blue:    { icon: "text-blue-400",    border: "group-hover:border-blue-500/30",    glow: "group-hover:shadow-blue-500/10",    badge: "bg-blue-500/10 text-blue-400",    bar: "bg-blue-500" },
  purple:  { icon: "text-purple-400",  border: "group-hover:border-purple-500/30",  glow: "group-hover:shadow-purple-500/10",  badge: "bg-purple-500/10 text-purple-400", bar: "bg-purple-500" },
  emerald: { icon: "text-emerald-400", border: "group-hover:border-emerald-500/30", glow: "group-hover:shadow-emerald-500/10", badge: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500" },
  amber:   { icon: "text-amber-400",   border: "group-hover:border-amber-500/30",   glow: "group-hover:shadow-amber-500/10",   badge: "bg-amber-500/10 text-amber-400",  bar: "bg-amber-500" },
  rose:    { icon: "text-rose-400",    border: "group-hover:border-rose-500/30",    glow: "group-hover:shadow-rose-500/10",    badge: "bg-rose-500/10 text-rose-400",    bar: "bg-rose-500" },
};

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  color,
  href,
  flashing,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  trend: string;
  icon: React.ElementType;
  color: AccentColor;
  href: string;
  flashing?: boolean;
  tooltip?: string;
}) {
  const a = ACCENT[color];
  return (
    <Link
      href={href}
      className={cn(
        "p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6",
        "transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl group cursor-pointer",
        a.border,
        a.glow,
        flashing && "animate-pulse-once",
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          "p-4 rounded-2xl bg-zinc-900 border border-white/5 transition-colors duration-500",
          a.icon
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          {tooltip && (
            <InfoTooltip text={tooltip} position="top" />
          )}
          <span className={cn(
            "text-[9px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-lg",
            a.badge
          )}>
            {trend}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter tabular-nums">
          {value}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
          {label}
        </div>
        {sub && (
          <div className="text-[10px] font-bold text-zinc-600 pt-0.5">{sub}</div>
        )}
      </div>
    </Link>
  );
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: Array<{ month: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-3 h-40 w-full">
      {data.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end">
            <span className={cn(
              "text-[9px] font-black tabular-nums transition-opacity duration-300",
              isLast ? "text-blue-400 opacity-100" : "text-zinc-700 opacity-0 group-hover/bar:opacity-100"
            )}>
              {formatNumber(d.count)}
            </span>
            <div
              className={cn(
                "w-full rounded-t-lg transition-all duration-700",
                isLast
                  ? "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  : "bg-zinc-800 group-hover/bar:bg-zinc-700"
              )}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[9px] font-bold text-zinc-600 group-hover/bar:text-zinc-400 transition-colors">
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Donut / Ring Chart ───────────────────────────────────────────────────────

interface DonutSlice {
  label: string;
  value: number;
  color: string;
  stroke: string;
}

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  // Pre-compute rotations with a reduce so the render pass is pure (no
  // mutating accumulator mid-map — mid-render mutation breaks React 19's
  // Strict Mode double-invoke guarantees).
  const slicesWithRotation = slices.reduce<Array<typeof slices[number] & { rotate: number; dash: number; gap: number }>>(
    (acc, slice) => {
      const prevRotate = acc.length > 0 ? acc[acc.length - 1].rotate + (acc[acc.length - 1].dash / circumference) * 360 : -90;
      const fraction = total > 0 ? slice.value / total : 0;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      acc.push({ ...slice, rotate: prevRotate, dash, gap });
      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-col gap-6 items-center h-full justify-center">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="14"
          />
          {slicesWithRotation.map((slice, i) => {
            const { dash, gap, rotate } = slice;

            return (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={slice.stroke}
                strokeWidth="14"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                transform={`rotate(${rotate} ${cx} ${cy})`}
                className="transition-all duration-1000"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white tabular-nums">
            {total > 0 ? `$${total.toFixed(0)}` : "-"}
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">TOTAL</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-2.5">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.stroke }} />
              <span className="text-[10px] font-bold text-zinc-500 truncate">{slice.label}</span>
            </div>
            <span className="text-[10px] font-black text-zinc-300 tabular-nums shrink-0">
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plan Tier Badge ──────────────────────────────────────────────────────────

function PlanBadge({ tier }: { tier: string }) {
  const key = (tier || "free").toLowerCase();
  const cls = PLAN_BADGE[key] ?? PLAN_BADGE["free"];
  return (
    <span className={cn(
      "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
      cls
    )}>
      {key}
    </span>
  );
}

// ─── Action Label Map ─────────────────────────────────────────────────────────

const ACTION_COLOR: Record<string, string> = {
  signup:       "text-emerald-400",
  login:        "text-blue-400",
  generate:     "text-purple-400",
  upgrade:      "text-amber-400",
  downgrade:    "text-rose-400",
  delete:       "text-rose-500",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type RefreshInterval = 30 | 60 | 0; // seconds; 0 = off

export default function AdminDashboardPage() {
  const t = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  const [kpiFlash, setKpiFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/dashboard"));
      if (!res.ok) throw new Error("Failed");
      const json: DashboardData = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setSecondsSince(0);
      if (isRefresh) {
        setKpiFlash(true);
        setTimeout(() => setKpiFlash(false), 700);
      }
    } catch {
      setError(true);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => loadData(true), refreshInterval * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, loadData]);

  // "Updated X seconds ago" clock
  useEffect(() => {
    if (clockRef.current) clearInterval(clockRef.current);
    clockRef.current = setInterval(() => {
      setSecondsSince((s) => s + 1);
    }, 1000);
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [lastUpdated]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-4" dir="rtl">
          <Activity className="w-10 h-10 text-rose-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">
            Failed to load dashboard data
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/5 hover:border-white/10"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const totalCostsMTD = data.apiCostsMTD + data.manualCostsMTD;

  const mrr = data.totalRevenue;

  // Seed monthlyTrend fallback if empty
  const trendData: Array<{ month: string; count: number }> =
    data.monthlyTrend && data.monthlyTrend.length > 0
      ? data.monthlyTrend.slice(-6).map((d) => ({ month: d.month, count: d.newUsers }))
      : [
          { month: "Oct", count: 0 },
          { month: "Nov", count: 0 },
          { month: "Dec", count: 0 },
          { month: "Jan", count: 0 },
          { month: "Feb", count: 0 },
          { month: "Mar", count: 0 },
        ];

  const donutSlices: DonutSlice[] = [
    { label: "LLM API",  value: data.apiCostsMTD,    color: "text-blue-400",    stroke: "#3b82f6" },
    { label: "Manual",   value: data.manualCostsMTD, color: "text-purple-400",  stroke: "#a78bfa" },
    { label: "Revenue",  value: mrr,                 color: "text-emerald-400", stroke: "#10b981" },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 select-none pb-24 overflow-x-hidden" dir="rtl">

        {/* ── Back Link ── */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 hover:text-white transition-colors group w-fit min-h-[44px]"
        >
          <ArrowUpRight className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
          Back to App
        </Link>

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 bg-zinc-950/50 px-4 py-5 md:px-10 md:py-10 rounded-2xl md:rounded-[40px] border border-white/5">
          <div className="space-y-3 md:space-y-4 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-blue-500 truncate">
                Operational Authority Level 1
              </span>
            </div>
            <h1 className="text-3xl md:text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tight md:tracking-tighter leading-none wrap-break-word">
              Command Center
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-sm md:text-lg max-w-xl">
              {t.admin.dashboard.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:shrink-0 md:items-end">
            <div className="flex flex-wrap gap-2 md:gap-3">
              {/* System status */}
              <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-white/3 border border-white/5 text-emerald-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </div>
              {/* Quick date */}
              <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-white/3 border border-white/5 text-zinc-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 md:gap-2.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>

            {/* Auto-refresh controls */}
            <div className="flex items-center gap-1.5 md:gap-2 p-1.5 rounded-xl md:rounded-2xl bg-white/3 border border-white/5 flex-wrap">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-600 mr-1" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-0.5">
                רענון אוטומטי
              </span>
              {([30, 60, 0] as RefreshInterval[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRefreshInterval(opt)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    refreshInterval === opt
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  {opt === 0 ? "כבוי" : `${opt}s`}
                </button>
              ))}
            </div>

            {/* Last updated timestamp */}
            {lastUpdated && (
              <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                עודכן לפני {secondsSince} שניות
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            label="Total Users"
            value={formatNumber(data.totalUsers)}
            sub={`${data.proUsers} pro · ${data.freeUsers} free`}
            trend={`${data.conversionRate}% conv`}
            icon={Users}
            color="blue"
            href="/admin/users"
            flashing={kpiFlash}
            tooltip="סה״כ משתמשים רשומים בפלטפורמה. מפוצל לפי פלן: Pro (משלם) ו-Free (חינמי). אחוז ה-Conversion מראה כמה אחוז מהכלל שדרגו ל-Pro."
          />
          <KpiCard
            label="Monthly Revenue"
            value={formatCurrency(mrr)}
            sub="MRR"
            trend="-"
            icon={DollarSign}
            color="emerald"
            href="/admin/users"
            flashing={kpiFlash}
            tooltip="MRR — Monthly Recurring Revenue. סה״כ ההכנסה החוזרת החודשית ממנויים פעילים. מחושב כ: מספר מנויי Pro פעילים × מחיר המנוי."
          />
          <KpiCard
            label="API Costs MTD"
            value={formatCurrency(totalCostsMTD)}
            sub={`LLM $${data.apiCostsMTD.toFixed(2)} · Manual $${data.manualCostsMTD.toFixed(2)}`}
            trend={data.errorCountMTD > 0 ? `${data.errorCountMTD} errors` : '-'}
            icon={CircleDollarSign}
            color="amber"
            href="/admin/activity"
            flashing={kpiFlash}
            tooltip="עלות שימוש ב-API של AI מתחילת החודש. LLM = עלות ישירה מ-api_usage_logs. Manual = הוצאות ידניות שהוזנו. Errors = קריאות שעלותן $0 (נחשב כשגיאה)."
          />
          <KpiCard
            label="Generations MTD"
            value={formatNumber(data.generationsThisMonth)}
            sub={`${formatNumber(data.generationsToday)} today · ${data.avgPromptsPerUser} avg/user`}
            trend={`${formatNumber(data.totalGenerations)} total`}
            icon={Sparkles}
            color="purple"
            href="/admin/prompts"
            flashing={kpiFlash}
            tooltip="מספר פרומפטים/גנרציות שיועדרו החודש. avg/user = ממוצע לכל משתמש פעיל (MAU). Total = סה״כ כל הזמן."
          />
        </div>

        {/* ── Engagement Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EngagementCard label="DAU" value={data.dau} icon={Target}
            tooltip="Daily Active Users — משתמשים ייחודיים שביצעו לפחות גנרציה אחת היום. מחושב מטבלת history." />
          <EngagementCard label="WAU" value={data.wau} icon={BarChart3}
            tooltip="Weekly Active Users — משתמשים ייחודיים שפעלו ב-7 הימים האחרונים. אינדיקטור לשימור שבועי." />
          <EngagementCard label="MAU" value={data.mau} icon={Activity}
            tooltip="Monthly Active Users — משתמשים ייחודיים שפעלו ב-30 הימים האחרונים. הבסיס לחישוב ARPU ו-avg prompts/user." />
          <EngagementCard label="Conversion" value={`${data.conversionRate}%`} icon={Percent}
            tooltip="אחוז ה-Conversion — Pro Users / Total Users. מראה כמה אחוז מהמשתמשים הרשומים שדרגו לפלן Pro." />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Cost vs Growth bar chart */}
          <div className="xl:col-span-2 p-8 rounded-[36px] bg-zinc-950 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-blue-600/3 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-blue-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">Cost vs Growth</h3>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">New users - last 6 months</p>
                  </div>
                </div>
                <Link
                  href="/admin/users"
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-blue-400 transition-colors"
                >
                  View All
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <BarChart data={trendData} />
            </div>
          </div>

          {/* Cost breakdown donut */}
          <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-purple-600/3 to-transparent pointer-events-none" />
            <div className="relative h-full flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-purple-400">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Cost Breakdown</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">MTD allocation</p>
                </div>
              </div>

              <div className="flex-1">
                <DonutChart slices={donutSlices} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Mode Distribution Row ── */}
        {Object.keys(data.modeDistribution).length > 0 && (
          <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-amber-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Engine Mode Distribution</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">This month</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(data.modeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([mode, count]) => {
                  const total = Object.values(data.modeDistribution).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={mode} className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest w-32 truncate">{mode}</span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500/60 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 tabular-nums w-16 text-left">{count} ({pct}%)</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Recent Signups */}
          <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Recent Signups</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Last 10 users</p>
                </div>
              </div>
              <Link
                href="/admin/users"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors group/link"
              >
                All Users
                <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-2">
              {data.recentSignups.length === 0 ? (
                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest text-center py-8">
                  No signups yet
                </p>
              ) : (
                data.recentSignups.slice(0, 10).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/3 transition-colors group/row cursor-default"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0 text-[10px] font-black text-zinc-400 group-hover/row:border-white/10 transition-colors">
                      {initials(user.id)}
                    </div>

                    {/* ID */}
                    <div className="flex-1 min-w-0 font-mono text-[10px] text-zinc-500 truncate" dir="ltr">
                      {user.id}
                    </div>

                    {/* Plan badge */}
                    <PlanBadge tier={user.plan_tier} />

                    {/* Time */}
                    <span className="text-[9px] font-bold text-zinc-700 tabular-nums shrink-0">
                      {relativeTime(user.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Recent Activity</h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Last 10 events</p>
                </div>
              </div>
              <Link
                href="/admin/activity"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors group/link"
              >
                All Events
                <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[420px] custom-scrollbar pr-1">
              {data.recentActivity.length === 0 ? (
                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest text-center py-8">
                  No activity yet
                </p>
              ) : (
                data.recentActivity.slice(0, 10).map((event) => {
                  const actionColor = ACTION_COLOR[event.action?.toLowerCase()] ?? "text-zinc-400";
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 px-4 py-3 rounded-2xl hover:bg-white/3 transition-colors group/ev cursor-default"
                    >
                      {/* Action dot */}
                      <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 shrink-0 opacity-60"
                        style={{ color: "currentColor" }}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Action label */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", actionColor)}>
                            {event.action || "event"}
                          </span>
                          <span className="font-mono text-[9px] text-zinc-600 truncate max-w-[120px]" dir="ltr">
                            {event.user_id?.slice(0, 12)}…
                          </span>
                        </div>
                        {/* Details */}
                        {event.details && typeof event.details === "object" && Object.keys(event.details).length > 0 && (
                          <p className="text-[9px] text-zinc-700 mt-0.5 truncate font-mono" dir="ltr">
                            {JSON.stringify(event.details).slice(0, 60)}
                          </p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[9px] font-bold text-zinc-700 tabular-nums shrink-0 mt-0.5">
                        {relativeTime(event.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

// ─── Engagement Card ────────────────────────────────────────────────────────

function EngagementCard({
  label,
  value,
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tooltip?: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-zinc-950 border border-white/5 flex items-center gap-4 hover:border-white/10 transition-all">
      <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-xl font-black text-white tabular-nums tracking-tighter">
            {value}
          </div>
          {tooltip && <InfoTooltip text={tooltip} position="top" />}
        </div>
        <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </div>
  );
}
