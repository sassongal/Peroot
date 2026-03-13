"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  Database,
  Zap,
  Shield,
  HardDrive,
  DollarSign,
  Activity,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubStatus = 'healthy' | 'warning' | 'critical';

interface HourlyBucket {
  hour: string;
  callCount: number;
  totalTokens: number;
  totalCost: number;
}

interface StorageTable {
  total: number;
  last24h: number;
  growth?: number;
}

interface HealthData {
  healthScore: number;
  overallStatus: SubStatus;
  checkedAt: string;
  db: {
    status: SubStatus;
    responseMs: number;
  };
  apiPerformance: {
    status: SubStatus;
    totalCallsLast24h: number;
    avgCallsPerHour: number;
    hourlyBuckets: HourlyBucket[];
  };
  errorRate: {
    status: SubStatus;
    errorEvents: number;
    totalEvents: number;
    ratePct: number;
  };
  storage: {
    profiles: StorageTable;
    personalLibrary: StorageTable;
    activityLogs: StorageTable;
    apiUsageLogs: StorageTable;
  };
  costBurnRate: {
    today: number;
    yesterday: number;
    sevenDayAvg: number;
    trend: number;
  };
  uptime: {
    status: SubStatus;
    uptimePct: number;
    callsChecked: number;
  };
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubStatus, {
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  label: string;
}> = {
  healthy:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle,    label: 'תקין' },
  warning:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: AlertTriangle,  label: 'אזהרה' },
  critical: { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     icon: XCircle,        label: 'קריטי' },
};

function statusGaugeColor(score: number) {
  if (score >= 80) return { stroke: '#10b981', glow: 'shadow-emerald-500/30' };
  if (score >= 50) return { stroke: '#f59e0b', glow: 'shadow-amber-500/30' };
  return { stroke: '#f43f5e', glow: 'shadow-rose-500/30' };
}

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`;
}

// ── Circular gauge (SVG) ──────────────────────────────────────────────────────

function CircularGauge({ score }: { score: number }) {
  const radius  = 72;
  const stroke  = 10;
  const circ    = 2 * Math.PI * radius;
  // 75% arc (270°)
  const arcLen  = circ * 0.75;
  const filled  = arcLen * (score / 100);
  const { stroke: strokeColor, glow } = statusGaugeColor(score);

  const statusLabel =
    score >= 80 ? 'מערכת תקינה' : score >= 50 ? 'דרוש מעקב' : 'בעיה קריטית';

  return (
    <div className={cn("relative flex items-center justify-center w-48 h-48 rounded-full shadow-2xl", glow)}>
      <svg width="192" height="192" viewBox="0 0 192 192" className="-rotate-[135deg]">
        {/* Track */}
        <circle
          cx="96" cy="96" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
          strokeDasharray={`${arcLen} ${circ}`}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx="96" cy="96" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-black leading-none tabular-nums"
          style={{ color: strokeColor }}
        >
          {score}
        </span>
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-1">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

// ── API Call chart (bars) ─────────────────────────────────────────────────────

function ApiChart({ buckets }: { buckets: HourlyBucket[] }) {
  const maxCalls = Math.max(...buckets.map((b) => b.callCount), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {buckets.map((b) => {
        const pct = Math.max((b.callCount / maxCalls) * 100, b.callCount > 0 ? 6 : 2);
        return (
          <div
            key={b.hour}
            className="flex-1 flex flex-col items-center gap-1 group"
            title={`${b.hour}: ${b.callCount} calls, $${b.totalCost.toFixed(5)}`}
          >
            <div
              className="w-full rounded-t-sm transition-all duration-700"
              style={{
                height: `${pct}%`,
                background: b.callCount > 0
                  ? `rgba(99,102,241,${0.15 + (b.callCount / maxCalls) * 0.75})`
                  : 'rgba(255,255,255,0.03)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [data, setData]       = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath('/api/admin/health'));
      if (!res.ok) throw new Error('Failed to fetch health data');
      const json: HealthData = await res.json();
      setData(json);
    } catch (err) {
      logger.error('[Health page] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const overallConfig = data ? STATUS_CONFIG[data.overallStatus] : STATUS_CONFIG['healthy'];

  const storageRows: { key: keyof HealthData['storage']; label: string; emoji?: string }[] = [
    { key: 'profiles',       label: 'Profiles' },
    { key: 'personalLibrary', label: 'Personal Library' },
    { key: 'activityLogs',   label: 'Activity Logs' },
    { key: 'apiUsageLogs',   label: 'API Usage Logs' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-12 animate-in fade-in duration-1000 pb-24 select-none" dir="rtl">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                System Intelligence Layer
              </span>
            </div>
            <h1 className="text-6xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              System Health
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
              ניטור בריאות מערכת. בסיס נתונים, API, שגיאות ועלויות. עדכון כל 30 שניות.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <div className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest",
                overallConfig.bg, overallConfig.border, overallConfig.color
              )}>
                <overallConfig.icon className="w-3.5 h-3.5" />
                {overallConfig.label}
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              בדוק עכשיו
            </button>
          </div>
        </div>

        {/* ── Health score + Subsystem cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 px-2">

          {/* Gauge */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center gap-6 p-8 rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              Health Score
            </span>
            {loading && !data ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-zinc-700" />
              </div>
            ) : (
              <CircularGauge score={data?.healthScore ?? 0} />
            )}
          </div>

          {/* Subsystem cards */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <SubsystemCard
              title="Database"
              sub={data ? `${data.db.responseMs}ms` : '…'}
              status={data?.db.status ?? 'healthy'}
              icon={Database}
              loading={loading && !data}
            />
            <SubsystemCard
              title="API"
              sub={data ? `${data.apiPerformance.totalCallsLast24h} calls/24h` : '…'}
              status={data?.apiPerformance.status ?? 'healthy'}
              icon={Zap}
              loading={loading && !data}
            />
            <SubsystemCard
              title="Auth"
              sub={data ? `${data.uptime.uptimePct}% uptime` : '…'}
              status={data?.uptime.status ?? 'healthy'}
              icon={Shield}
              loading={loading && !data}
            />
            <SubsystemCard
              title="Storage"
              sub={data ? `${fmt(data.storage.profiles.total)} users` : '…'}
              status="healthy"
              icon={HardDrive}
              loading={loading && !data}
            />
          </div>
        </div>

        {/* ── API call volume chart ── */}
        <div className="px-2 space-y-4">
          <SectionTitle icon={Zap} color="indigo" title="API Call Volume" sub="24 שעות אחרונות - לפי שעה" />
          <div className="p-8 rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl">
            {loading && !data ? (
              <div className="h-24 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500/20" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <span className="text-3xl font-black text-white tabular-nums">
                      {fmt(data?.apiPerformance.totalCallsLast24h ?? 0)}
                    </span>
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ms-2">
                      סה"כ קריאות
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/5" />
                  <div>
                    <span className="text-xl font-black text-zinc-400 tabular-nums">
                      {fmt(data?.apiPerformance.avgCallsPerHour ?? 0)}
                    </span>
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ms-2">
                      ממוצע/שעה
                    </span>
                  </div>
                </div>
                <ApiChart buckets={data?.apiPerformance.hourlyBuckets ?? []} />
                {/* Hour labels */}
                <div className="flex gap-1">
                  {(data?.apiPerformance.hourlyBuckets ?? []).map((b, i) => (
                    <div key={b.hour} className="flex-1 text-center">
                      {i % 6 === 0 && (
                        <span className="text-[8px] font-black text-zinc-800">{b.hour}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Error rate + Cost burn rate (side by side) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">

          {/* Error rate */}
          <div className="space-y-4">
            <SectionTitle icon={AlertTriangle} color="rose" title="Error Rate" sub="24 שעות אחרונות" />
            <div className="p-8 rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl space-y-6">
              {loading && !data ? (
                <div className="h-24 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-rose-500/20" />
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <span className={cn(
                      "text-5xl font-black tabular-nums leading-none",
                      (data?.errorRate.ratePct ?? 0) < 1
                        ? 'text-emerald-400'
                        : (data?.errorRate.ratePct ?? 0) < 5
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    )}>
                      {data?.errorRate.ratePct?.toFixed(2) ?? '0.00'}%
                    </span>
                    <span className="text-zinc-700 font-black uppercase text-[9px] tracking-widest pb-1">
                      שיעור שגיאות
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        (data?.errorRate.ratePct ?? 0) < 1  ? 'bg-emerald-500' :
                        (data?.errorRate.ratePct ?? 0) < 5  ? 'bg-amber-500'   : 'bg-rose-500'
                      )}
                      style={{ width: `${Math.min((data?.errorRate.ratePct ?? 0), 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-black text-zinc-700 uppercase tracking-wider">
                    <span>{fmt(data?.errorRate.errorEvents ?? 0)} שגיאות</span>
                    <span>{fmt(data?.errorRate.totalEvents ?? 0)} אירועים כולל</span>
                  </div>

                  {/* Status badge */}
                  {data && (
                    <StatusBadge status={data.errorRate.status} />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Cost burn rate */}
          <div className="space-y-4">
            <SectionTitle icon={DollarSign} color="amber" title="Cost Burn Rate" sub="היום / אתמול / ממוצע 7 ימים" />
            <div className="p-8 rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl space-y-6">
              {loading && !data ? (
                <div className="h-24 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500/20" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {[
                      { label: 'היום',         value: data?.costBurnRate.today      ?? 0, highlight: true },
                      { label: 'אתמול',        value: data?.costBurnRate.yesterday   ?? 0, highlight: false },
                      { label: 'ממוצע 7 ימים', value: data?.costBurnRate.sevenDayAvg ?? 0, highlight: false },
                    ].map((row) => {
                      const maxVal = Math.max(
                        data?.costBurnRate.today ?? 0,
                        data?.costBurnRate.yesterday ?? 0,
                        data?.costBurnRate.sevenDayAvg ?? 0,
                        0.0001
                      );
                      return (
                        <div key={row.label} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                            <span className={row.highlight ? 'text-white' : 'text-zinc-600'}>
                              {row.label}
                            </span>
                            <span className={row.highlight ? 'text-amber-400' : 'text-zinc-500'}>
                              {fmtCost(row.value)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                row.highlight ? 'bg-amber-500' : 'bg-zinc-700'
                              )}
                              style={{ width: `${(row.value / maxVal) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Trend */}
                  {data && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      {data.costBurnRate.trend > 0 ? (
                        <TrendingUp className="w-4 h-4 text-rose-400" />
                      ) : data.costBurnRate.trend < 0 ? (
                        <TrendingDown className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-zinc-600" />
                      )}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        data.costBurnRate.trend > 0 ? 'text-rose-400' :
                        data.costBurnRate.trend < 0 ? 'text-emerald-400' : 'text-zinc-600'
                      )}>
                        {data.costBurnRate.trend > 0 ? '+' : ''}{data.costBurnRate.trend.toFixed(1)}% vs אתמול
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Storage table ── */}
        <div className="px-2 space-y-4">
          <SectionTitle icon={HardDrive} color="purple" title="Storage Overview" sub="מספר שורות לפי טבלה" />
          <div className="rounded-[36px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  {['טבלה', 'סה"כ שורות', '24 שעות אחרונות', 'צמיחה'].map((h) => (
                    <th key={h} className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading && !data ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-purple-500/20 mx-auto" />
                    </td>
                  </tr>
                ) : (
                  storageRows.map(({ key, label }) => {
                    const row = data?.storage[key];
                    const growth = row?.growth ?? 0;
                    return (
                      <tr key={key} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-zinc-300">{label}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-base font-black text-white tabular-nums">
                            {fmt(row?.total ?? 0)}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-zinc-500 tabular-nums">
                            +{fmt(row?.last24h ?? 0)}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider",
                            growth > 0 ? 'text-emerald-400' : growth < 0 ? 'text-rose-400' : 'text-zinc-700'
                          )}>
                            {growth > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : growth < 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            {growth > 0 ? '+' : ''}{growth}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Last checked ── */}
        {data?.checkedAt && (
          <div className="text-center text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">
            נבדק לאחרונה: {new Date(data.checkedAt).toLocaleTimeString('he-IL')}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SubsystemCard({
  title,
  sub,
  status,
  icon: Icon,
  loading,
}: {
  title: string;
  sub: string;
  status: SubStatus;
  icon: React.ElementType;
  loading: boolean;
}) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className={cn(
      "group p-6 rounded-[28px] border flex flex-col gap-4 transition-all duration-500",
      cfg.bg, cfg.border
    )}>
      <div className="flex justify-between items-start">
        <div className={cn("p-2.5 rounded-xl", cfg.bg, cfg.color)}>
          <Icon className="w-4 h-4" />
        </div>
        {loading ? (
          <RefreshCw className="w-3 h-3 animate-spin text-zinc-700" />
        ) : (
          <cfg.icon className={cn("w-3.5 h-3.5", cfg.color)} />
        )}
      </div>
      <div>
        <div className="text-sm font-black text-white">{title}</div>
        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mt-0.5">{sub}</div>
      </div>
      <div className={cn(
        "text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full self-start border",
        cfg.bg, cfg.border, cfg.color
      )}>
        {cfg.label}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-wider",
      cfg.bg, cfg.border, cfg.color
    )}>
      <cfg.icon className="w-3.5 h-3.5" />
      {cfg.label}
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
  color: string;
  title: string;
  sub: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    indigo:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <div className="flex items-center gap-4">
      <div className={cn("p-2.5 rounded-xl border", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{sub}</p>
      </div>
    </div>
  );
}
