"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  BarChart3,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CreditCard,
  PieChart,
  Activity,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPI {
  mrr: number;
  activeSubs: number;
  newThisMonth: number;
  churned: number;
  churnRate: number;
  conversionRate: number;
  arpu: number;
  totalUsers: number;
}

interface MonthlyPoint {
  month: string;
  label: string;
  newSubs: number;
  activeSubs: number;
}

interface PlanBreakdown {
  free: number;
  pro: number;
  premium: number;
}

interface RecentEvent {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Subscriber {
  id: string;
  user_id: string;
  status: string;
  plan_name: string;
  customer_email: string;
  customer_name: string;
  renews_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  is_manual?: boolean;
}

interface RevenueData {
  kpi: KPI & { proUsersWithoutSub?: number };
  monthly: MonthlyPoint[];
  planBreakdown: PlanBreakdown;
  subscribers: Subscriber[];
  recentEvents: RecentEvent[];
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtILS(n: number) {
  return `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function fmtCount(n: number) {
  return n.toLocaleString("en-US");
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

function actionLabel(action: string): { label: string; color: string } {
  if (action.includes("cancel") || action.includes("downgrade")) {
    return { label: "ביטול", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
  }
  if (action.includes("upgrade")) {
    return { label: "שדרוג", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  }
  return { label: "מנוי", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const colorMap = {
  emerald: {
    icon: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    glow: "group-hover:shadow-emerald-500/10",
  },
  blue: {
    icon: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    glow: "group-hover:shadow-blue-500/10",
  },
  purple: {
    icon: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    glow: "group-hover:shadow-purple-500/10",
  },
  rose: {
    icon: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    glow: "group-hover:shadow-rose-500/10",
  },
  amber: {
    icon: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    glow: "group-hover:shadow-amber-500/10",
  },
};

type ColorKey = keyof typeof colorMap;

function KpiCard({
  label,
  sublabel,
  value,
  icon: Icon,
  color,
  loading,
  trend,
}: {
  label: string;
  sublabel: string;
  value: string;
  icon: React.ElementType;
  color: ColorKey;
  loading: boolean;
  trend?: "up" | "down" | "neutral";
}) {
  const c = colorMap[color];

  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-rose-400"
      : "text-zinc-600";

  return (
    <div
      className={cn(
        "group p-8 rounded-[40px] bg-zinc-950 border border-white/5 flex flex-col gap-6",
        "transition-all duration-700 hover:border-white/10 hover:shadow-2xl",
        c.glow
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-4 rounded-2xl border transition-all duration-700 shadow-2xl", c.icon)}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn("p-2 rounded-xl", trendColor)}>
            <TrendIcon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        {loading ? (
          <div className="h-10 w-28 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <div className="text-4xl font-black text-white tracking-tighter transition-transform duration-700 group-hover:scale-110 group-hover:-translate-x-1 origin-right leading-none tabular-nums">
            {value}
          </div>
        )}
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{label}</div>
        <div className="text-[9px] text-zinc-800 font-bold">{sublabel}</div>
      </div>
    </div>
  );
}

function SecondaryCard({
  label,
  sublabel,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  sublabel: string;
  value: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="p-6 rounded-[32px] bg-zinc-950/60 border border-white/5 flex items-center gap-5 hover:border-white/10 transition-all duration-300">
      <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-0.5 flex-1 min-w-0">
        {loading ? (
          <div className="h-6 w-20 rounded-lg bg-white/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-black text-white tracking-tight tabular-nums truncate">{value}</div>
        )}
        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest truncate">{label}</div>
        <div className="text-[8px] text-zinc-800 font-bold truncate">{sublabel}</div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  color,
  title,
  sub,
}: {
  icon: React.ElementType;
  color: ColorKey;
  title: string;
  sub: string;
}) {
  const c = colorMap[color];
  return (
    <div className="flex items-center gap-4">
      <div className={cn("p-2.5 rounded-xl border", c.icon)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{sub}</p>
      </div>
    </div>
  );
}

// ── Tab Component ─────────────────────────────────────────────────────────────

export default function RevenueTab() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath("/api/admin/revenue"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RevenueData = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Revenue Tab] fetch error:", err);
      setError("שגיאה בטעינת נתוני הכנסות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const hasNoData =
    !loading &&
    !error &&
    data &&
    data.kpi.activeSubs === 0 &&
    data.kpi.totalUsers === 0;

  const maxMonthly = Math.max(...(data?.monthly ?? []).map((m) => m.activeSubs), 1);

  // Donut chart segments
  const breakdown = data?.planBreakdown ?? { free: 0, pro: 0, premium: 0 };
  const totalBreakdown = breakdown.free + breakdown.pro + breakdown.premium;
  const donutSegments = [
    { label: "Free", key: "free", value: breakdown.free, color: "#3f3f46" },
    { label: "Pro", key: "pro", value: breakdown.pro, color: "#2563eb" },
    { label: "Premium", key: "premium", value: breakdown.premium, color: "#7c3aed" },
  ];

  // Build SVG donut
  function buildDonutPath() {
    const r = 40;
    const cx = 50;
    const cy = 50;
    let startAngle = -90;
    const paths: { d: string; color: string; label: string; pct: number }[] = [];

    for (const seg of donutSegments) {
      if (totalBreakdown === 0 || seg.value === 0) continue;
      const pct = seg.value / totalBreakdown;
      const angle = pct * 360;
      const endAngle = startAngle + angle;

      const toRad = (a: number) => (a * Math.PI) / 180;
      const x1 = cx + r * Math.cos(toRad(startAngle));
      const y1 = cy + r * Math.sin(toRad(startAngle));
      const x2 = cx + r * Math.cos(toRad(endAngle));
      const y2 = cy + r * Math.sin(toRad(endAngle));
      const largeArc = angle > 180 ? 1 : 0;

      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      paths.push({ d, color: seg.color, label: seg.label, pct });
      startAngle = endAngle;
    }
    return paths;
  }

  const donutPaths = buildDonutPath();

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none" dir="rtl">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
              Revenue Intelligence Layer
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Revenue Analytics
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
            מעקב הכנסות, מנויים ושיעורי המרה בזמן אמת. ניתוח MRR ונתוני צמיחה.
          </p>
        </div>
        <button
          onClick={fetchRevenue}
          disabled={loading}
          className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-2xl"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh Data
        </button>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-4 p-6 rounded-[28px] bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-rose-400 font-bold text-sm">{error}</p>
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {hasNoData && (
        <div className="flex flex-col items-center justify-center gap-6 py-32 rounded-[40px] border border-white/5 bg-zinc-950/50">
          <div className="p-6 rounded-full bg-zinc-900 border border-white/5">
            <BarChart3 className="w-12 h-12 text-zinc-700" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-zinc-600 tracking-tight">No subscription data yet</h2>
            <p className="text-zinc-800 font-bold text-sm">אין נתוני מנויים להצגה כרגע.</p>
          </div>
        </div>
      )}

      {!hasNoData && (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 px-2">
            <KpiCard
              label="MRR"
              sublabel="Monthly Recurring Revenue"
              value={data ? fmtILS(data.kpi.mrr) : "-"}
              icon={DollarSign}
              color="emerald"
              loading={loading}
              trend="up"
            />
            <KpiCard
              label="Active Subscribers"
              sublabel="מנויים פעילים"
              value={data ? fmtCount(data.kpi.activeSubs) : "-"}
              icon={Users}
              color="blue"
              loading={loading}
            />
            <KpiCard
              label="Churn Rate"
              sublabel="שיעור נטישה"
              value={data ? fmtPct(data.kpi.churnRate) : "-"}
              icon={TrendingUp}
              color="rose"
              loading={loading}
              trend={data && data.kpi.churnRate > 5 ? "down" : "neutral"}
            />
            <KpiCard
              label="New This Month"
              sublabel="מנויים חדשים החודש"
              value={data ? fmtCount(data.kpi.newThisMonth) : "-"}
              icon={ArrowUpRight}
              color="purple"
              loading={loading}
              trend="up"
            />
          </div>

          {/* ── Secondary KPI Row ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-2">
            <SecondaryCard
              label="Conversion Rate"
              sublabel="Pro / Total Users"
              value={data ? fmtPct(data.kpi.conversionRate) : "-"}
              icon={CreditCard}
              loading={loading}
            />
            <SecondaryCard
              label="ARPU"
              sublabel="Average Revenue Per User"
              value={data ? fmtILS(data.kpi.arpu) : "-"}
              icon={BarChart3}
              loading={loading}
            />
            <SecondaryCard
              label="Total Users"
              sublabel="סה״כ משתמשים"
              value={data ? fmtCount(data.kpi.totalUsers) : "-"}
              icon={Users}
              loading={loading}
            />
          </div>

          {/* ── MRR Trend Chart + Donut Row ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2">

            {/* Monthly bar chart (spans 2 cols) */}
            <div className="lg:col-span-2 rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-8 shadow-2xl space-y-6">
              <SectionTitle
                icon={BarChart3}
                color="emerald"
                title="MRR Trend"
                sub="Active subscribers - last 6 months"
              />

              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="w-10 h-10 animate-spin text-emerald-500/20" />
                </div>
              ) : (
                <div className="flex items-end gap-3 h-52 pt-4">
                  {(data?.monthly ?? []).map((m) => {
                    const height = Math.max((m.activeSubs / maxMonthly) * 100, 2);
                    return (
                      <div
                        key={m.month}
                        className="flex flex-col items-center gap-2 group flex-1 min-w-[2.5rem]"
                        title={`${m.label}: ${m.activeSubs} active subs, ${m.newSubs} new`}
                      >
                        <span className="text-[9px] font-black text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                          {m.activeSubs}
                        </span>
                        <div
                          className="w-full bg-emerald-600 group-hover:bg-emerald-500 rounded-t-xl transition-all duration-700 relative"
                          style={{ height: `${height}%` }}
                        >
                          {m.newSubs > 0 && (
                            <div
                              className="absolute top-0 inset-x-0 bg-emerald-400 rounded-t-xl"
                              style={{
                                height: `${Math.min((m.newSubs / Math.max(m.activeSubs, 1)) * 100, 100)}%`,
                              }}
                            />
                          )}
                        </div>
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Active Subs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">New Subs</span>
                </div>
              </div>
            </div>

            {/* Plan breakdown donut */}
            <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-8 shadow-2xl space-y-6">
              <SectionTitle
                icon={PieChart}
                color="purple"
                title="Plan Breakdown"
                sub="Subscriber distribution"
              />

              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="w-10 h-10 animate-spin text-purple-500/20" />
                </div>
              ) : totalBreakdown === 0 ? (
                <div className="flex items-center justify-center py-16 text-zinc-800 font-black text-[9px] uppercase tracking-widest">
                  No data
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <svg viewBox="0 0 100 100" className="w-40 h-40">
                    {donutPaths.map((p) => (
                      <path key={p.label} d={p.d} fill={p.color} className="transition-opacity hover:opacity-80" />
                    ))}
                    {/* Center hole */}
                    <circle cx="50" cy="50" r="25" fill="#09090b" />
                    <text x="50" y="54" textAnchor="middle" className="fill-white text-[10px] font-bold" style={{ fontSize: 10, fontWeight: 900 }}>
                      {fmtCount(totalBreakdown)}
                    </text>
                  </svg>

                  <div className="w-full space-y-3">
                    {donutSegments.map((seg) => {
                      const pct = totalBreakdown > 0 ? (seg.value / totalBreakdown) * 100 : 0;
                      return (
                        <div key={seg.key} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color }} />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                              {seg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white tabular-nums">
                              {fmtCount(seg.value)}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-700 tabular-nums w-10 text-left">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Subscriber List ─────────────────────────────────────── */}
          <div className="space-y-4 px-2">
            <SectionTitle
              icon={CreditCard}
              color="emerald"
              title="Subscribers"
              sub="רשימת מנויים פעילים ומנויים שעזבו"
            />

            <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500/20" />
                </div>
              ) : (data?.subscribers ?? []).length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="text-zinc-800 font-black uppercase tracking-widest text-[9px]">
                    No subscribers yet
                  </div>
                  {(data?.kpi?.proUsersWithoutSub ?? 0) > 0 && (
                    <div className="text-amber-500/60 font-bold text-[10px]">
                      {data?.kpi?.proUsersWithoutSub} pro users upgraded manually (no subscription record)
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {/* Table header */}
                  <div className="px-8 py-4 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    <span className="flex-1">Customer</span>
                    <span className="w-20 text-center">Plan</span>
                    <span className="w-24 text-center">Status</span>
                    <span className="w-28 text-center">Renews</span>
                    <span className="w-24 text-center">Since</span>
                  </div>
                  {(data?.subscribers ?? []).map((sub) => {
                    const isActive = sub.status === 'active' || sub.status === 'on_trial';
                    const isChurned = sub.status === 'cancelled' || sub.status === 'expired';
                    return (
                      <div
                        key={sub.id}
                        className={cn(
                          "px-8 py-5 flex items-center gap-4 hover:bg-white/[0.02] transition-all",
                          isChurned && "opacity-60"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-zinc-200 truncate">
                            {sub.customer_name || sub.customer_email || sub.user_id.slice(0, 16)}
                          </div>
                          {sub.customer_name && sub.customer_email && (
                            <div className="text-[10px] text-zinc-600 truncate">{sub.customer_email}</div>
                          )}
                        </div>
                        <span className="w-20 text-center text-[9px] font-black uppercase tracking-widest text-zinc-400 flex flex-col items-center gap-0.5">
                          {sub.plan_name || 'pro'}
                          {sub.is_manual && (
                            <span className="text-[7px] text-amber-500/60">ידני</span>
                          )}
                        </span>
                        <span className={cn(
                          "w-24 text-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                          isActive && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                          isChurned && "bg-red-500/10 border-red-500/20 text-red-400",
                          !isActive && !isChurned && "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        )}>
                          {sub.status}
                        </span>
                        <span className="w-28 text-center text-[10px] font-bold text-zinc-500">
                          {sub.renews_at
                            ? new Date(sub.renews_at).toLocaleDateString('he-IL')
                            : sub.ends_at
                              ? new Date(sub.ends_at).toLocaleDateString('he-IL')
                              : '-'}
                        </span>
                        <span className="w-24 text-center text-[10px] font-bold text-zinc-600">
                          {relativeTime(sub.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Events ─────────────────────────────────────────── */}
          <div className="space-y-4 px-2">
            <SectionTitle
              icon={Activity}
              color="blue"
              title="Recent Subscription Events"
              sub="אירועי מנוי אחרונים"
            />

            <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500/20" />
                </div>
              ) : (data?.recentEvents ?? []).length === 0 ? (
                <div className="py-24 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]">
                  No subscription events yet
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {(data?.recentEvents ?? []).map((ev) => {
                    const { label, color } = actionLabel(ev.action);
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-4 px-8 py-5 hover:bg-white/[0.02] transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                              color
                            )}
                          >
                            {label}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-zinc-300 truncate max-w-[200px]">
                              {ev.user_id.slice(0, 20)}…
                            </span>
                            <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                              {ev.action}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-700 shrink-0">
                          {relativeTime(ev.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
