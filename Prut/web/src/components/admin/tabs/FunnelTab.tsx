"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  Users,
  Zap,
  Star,
  FileText,
  RefreshCw,
  TrendingDown,
  ArrowDown,
  LucideIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunnelStage {
  key: string;
  label: string;
  labelHe: string;
  count: number;
  color: string;
}

interface FunnelData {
  stages: FunnelStage[];
  timeRange: string;
  generatedAt: string;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7 ימים",
  "30d": "30 ימים",
  "90d": "90 ימים",
  all: "כל הזמן",
};

const STAGE_ICONS: Record<string, LucideIcon> = {
  signup: Users,
  first_prompt: FileText,
  ai_enhance: Zap,
  became_pro: Star,
};

const BAR_GRADIENTS: Record<string, { from: string; to: string; glow: string; badge: string; ring: string }> = {
  blue: {
    from: "from-blue-600",
    to: "to-blue-400",
    glow: "shadow-blue-500/20",
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    ring: "border-blue-500/30",
  },
  indigo: {
    from: "from-indigo-600",
    to: "to-indigo-400",
    glow: "shadow-indigo-500/20",
    badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    ring: "border-indigo-500/30",
  },
  purple: {
    from: "from-purple-600",
    to: "to-purple-400",
    glow: "shadow-purple-500/20",
    badge: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    ring: "border-purple-500/30",
  },
  emerald: {
    from: "from-emerald-600",
    to: "to-emerald-400",
    glow: "shadow-emerald-500/20",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    ring: "border-emerald-500/30",
  },
};

function conversionPct(from: number, to: number): string {
  if (from === 0) return "0.0";
  return ((to / from) * 100).toFixed(1);
}

function overallConversion(stages: FunnelStage[]): string {
  if (!stages.length) return "0.0";
  return conversionPct(stages[0].count, stages[stages.length - 1].count);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: LucideIcon; color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="group p-7 rounded-[36px] bg-zinc-950/80 border border-white/5 flex flex-col gap-5 transition-all duration-500 hover:border-white/10 hover:shadow-2xl backdrop-blur-sm">
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-2xl border transition-all duration-500", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter leading-none">{value}</div>
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{label}</div>
        {sub && <div className="text-[9px] text-zinc-700 font-bold">{sub}</div>}
      </div>
    </div>
  );
}

function DropOffBadge({ pct }: { pct: string }) {
  const val = parseFloat(pct);
  const isHigh = val >= 50;
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider",
      isHigh
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        : "bg-red-500/10 border-red-500/20 text-red-400"
    )}>
      <TrendingDown className="w-3 h-3" />
      {pct}% המשיכו
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function FunnelTab() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("all");

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath(`/api/admin/funnel?range=${range}`));
      if (!res.ok) throw new Error("Failed to fetch funnel data");
      const json: FunnelData = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Funnel Tab] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchFunnel(); }, [fetchFunnel]);

  const stages = data?.stages ?? [];
  const topCount = stages[0]?.count || 1;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">

      {/* Header strip with controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Conversion Intelligence</span>
          </div>
          <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
            מעקב אחר מסע המשתמש משלב ההרשמה ועד לשדרוג לפרו
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white/5 border border-white/5 rounded-2xl">
            {(["7d", "30d", "90d", "all"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  range === r ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          <button
            onClick={fetchFunnel}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-7 rounded-[36px] bg-zinc-950/80 border border-white/5 h-36 animate-pulse" />
            ))
          : stages.map((stage) => {
              const Icon = STAGE_ICONS[stage.key] ?? Users;
              return (
                <SummaryCard
                  key={stage.key}
                  label={stage.label}
                  value={stage.count.toLocaleString()}
                  sub={stage.labelHe}
                  icon={Icon}
                  color={stage.color}
                />
              );
            })}
      </div>

      {/* Overall conversion KPI */}
      {!loading && stages.length > 0 && (
        <div className="flex items-center gap-6 p-8 rounded-[36px] bg-zinc-950/50 border border-white/5">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-5xl font-black text-white tracking-tighter">{overallConversion(stages)}%</div>
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-1">Overall Conversion Rate</div>
            <div className="text-xs text-zinc-500 font-medium mt-0.5">מנרשמים לפרו</div>
          </div>
        </div>
      )}

      {/* Funnel Visualization */}
      <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-10 shadow-2xl space-y-2">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">המשפך המלא</h2>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
              Full Conversion Funnel — {RANGE_LABELS[range]}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-white/5" />
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Loading Funnel Data...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const Icon = STAGE_ICONS[stage.key] ?? Users;
              const widthPct = topCount > 0 ? (stage.count / topCount) * 100 : 0;
              const g = BAR_GRADIENTS[stage.color] ?? BAR_GRADIENTS.blue;
              const prevStage = idx > 0 ? stages[idx - 1] : null;
              const pct = prevStage ? conversionPct(prevStage.count, stage.count) : null;

              return (
                <div key={stage.key} className="space-y-2">
                  {idx > 0 && prevStage && (
                    <div className="flex items-center gap-4 py-1 px-4">
                      <div className="flex flex-col items-center gap-1 opacity-30">
                        <ArrowDown className="w-4 h-4 text-white" />
                      </div>
                      <DropOffBadge pct={pct!} />
                      <div className="flex-1 border-t border-dashed border-white/5" />
                      <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                        {(prevStage.count - stage.count).toLocaleString()} נשרו
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    "group relative flex items-center gap-6 p-5 rounded-[24px] border transition-all duration-500 hover:border-opacity-60",
                    g.ring,
                    "bg-zinc-900/40 hover:bg-zinc-900/70"
                  )}>
                    <div className={cn("p-3 rounded-2xl border shrink-0", g.badge)}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="w-32 shrink-0 space-y-0.5">
                      <div className="text-sm font-black text-white">{stage.label}</div>
                      <div className="text-[10px] text-zinc-600 font-bold">{stage.labelHe}</div>
                    </div>

                    <div className="flex-1 relative h-10 bg-white/[0.03] rounded-xl overflow-hidden">
                      <div
                        className={cn("h-full rounded-xl bg-gradient-to-r transition-all duration-1000 shadow-lg", g.from, g.to, g.glow)}
                        style={{ width: `${widthPct}%`, minWidth: stage.count > 0 ? "2rem" : "0" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl" />
                    </div>

                    <div className="w-24 text-right shrink-0">
                      <div className="text-2xl font-black text-white tabular-nums tracking-tighter">
                        {stage.count.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{widthPct.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage-by-stage conversion table */}
      {!loading && stages.length > 1 && (
        <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5">
            <h2 className="text-xl font-black text-white tracking-tight">פירוט המרות בין שלבים</h2>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-1">Stage-to-Stage Conversion Details</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  {["From Stage", "To Stage", "Users In", "Users Out", "Conversion", "Drop-off"].map((h) => (
                    <th key={h} className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stages.slice(1).map((stage, idx) => {
                  const prev = stages[idx];
                  const pct = conversionPct(prev.count, stage.count);
                  const dropped = prev.count - stage.count;
                  const val = parseFloat(pct);
                  return (
                    <tr key={stage.key} className="group hover:bg-white/[0.02] transition-all duration-300">
                      <td className="px-8 py-5">
                        <span className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider", BAR_GRADIENTS[prev.color]?.badge ?? "")}>
                          {prev.label}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider", BAR_GRADIENTS[stage.color]?.badge ?? "")}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-zinc-300 font-black text-base tabular-nums">{prev.count.toLocaleString()}</td>
                      <td className="px-8 py-5 text-zinc-300 font-black text-base tabular-nums">{stage.count.toLocaleString()}</td>
                      <td className="px-8 py-5">
                        <span className={cn("text-xl font-black tabular-nums", val >= 50 ? "text-emerald-400" : val >= 20 ? "text-amber-400" : "text-red-400")}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-8 py-5 text-zinc-600 font-bold text-sm tabular-nums">-{dropped.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer timestamp */}
      {data?.generatedAt && (
        <p className="text-center text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">
          Updated: {new Date(data.generatedAt).toLocaleString("he-IL")}
        </p>
      )}
    </div>
  );
}
