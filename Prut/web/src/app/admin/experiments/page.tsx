"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  FlaskConical,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Zap,
  AlertCircle,
  ChevronRight,
  Key,
  BarChart3,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Circle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeatureAdoption {
  action: string;
  distinctUsers: number;
  adoptionRate: number;
}

interface SegmentFeature {
  action: string;
  proUsers: number;
  freeUsers: number;
  proRate: number;
  freeRate: number;
}

interface Summary {
  featuresTracked: number;
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  mostAdopted: { action: string; adoptionRate: number } | null;
  leastAdopted: { action: string; adoptionRate: number } | null;
  segmentGap: number;
  proAvgActivity: number;
  freeAvgActivity: number;
}

interface ExperimentsData {
  summary: Summary;
  featureAdoption: FeatureAdoption[];
  experimentFeatures: FeatureAdoption[];
  segmentBreakdown: SegmentFeature[];
  posthogConnected: boolean;
  generatedAt: string;
  periodDays: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 36);
}

function TrendIcon({ rate }: { rate: number }) {
  if (rate >= 30)
    return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (rate >= 10)
    return <Minus className="w-3 h-3 text-amber-400" />;
  return <TrendingDown className="w-3 h-3 text-rose-400" />;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
          <Skeleton className="h-14 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 space-y-6"
            >
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-96 rounded-[36px]" />
        <Skeleton className="h-64 rounded-[36px]" />
      </div>
    </AdminLayout>
  );
}

type AccentColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";

const ACCENT_MAP: Record<
  AccentColor,
  { icon: string; border: string; bg: string }
> = {
  blue: {
    icon: "text-blue-400",
    border: "hover:border-blue-500/30",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  purple: {
    icon: "text-purple-400",
    border: "hover:border-purple-500/30",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  emerald: {
    icon: "text-emerald-400",
    border: "hover:border-emerald-500/30",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  amber: {
    icon: "text-amber-400",
    border: "hover:border-amber-500/30",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  rose: {
    icon: "text-rose-400",
    border: "hover:border-rose-500/30",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  cyan: {
    icon: "text-cyan-400",
    border: "hover:border-cyan-500/30",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
};

function SummaryCard({
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
  const a = ACCENT_MAP[color];
  return (
    <div
      className={cn(
        "p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
        a.border
      )}
    >
      <div
        className={cn(
          "p-4 rounded-2xl border w-fit",
          a.bg,
          a.icon
        )}
      >
        <Icon className="w-5 h-5" />
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
    </div>
  );
}

// ── Feature Adoption Tracker ───────────────────────────────────────────────────

function FeatureAdoptionTracker({
  features,
  loading,
}: {
  features: FeatureAdoption[];
  loading: boolean;
}) {
  const max = Math.max(...features.map((f) => f.adoptionRate), 1);

  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-blue-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Feature Adoption Tracker
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
            אחוז משתמשים שהשתמשו בכל פיצ׳ר — 30 יום אחרונים
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-white/10" />
        </div>
      ) : features.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
          <Layers className="w-10 h-10 opacity-30" />
          <p className="text-sm font-bold">אין נתוני פעילות זמינים</p>
        </div>
      ) : (
        <div className="relative space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
            <span className="flex-1">Feature / Action</span>
            <span className="w-16 text-left">Users</span>
            <span className="w-20 text-left">Adoption</span>
            <span className="w-28 text-left">Bar</span>
          </div>

          {features.map((feature, i) => (
            <div
              key={feature.action}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors group/row"
            >
              <span className="text-[10px] font-black text-zinc-700 w-5 tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <TrendIcon rate={feature.adoptionRate} />
                <span className="text-sm font-bold text-zinc-300 truncate group-hover/row:text-white transition-colors">
                  {formatAction(feature.action)}
                </span>
              </div>
              <span className="w-16 text-sm font-black text-white tabular-nums text-left">
                {feature.distinctUsers.toLocaleString()}
              </span>
              <span
                className={cn(
                  "w-20 text-sm font-black tabular-nums text-left",
                  feature.adoptionRate >= 30
                    ? "text-emerald-400"
                    : feature.adoptionRate >= 10
                    ? "text-amber-400"
                    : "text-zinc-400"
                )}
              >
                {feature.adoptionRate}%
              </span>
              <div className="w-28 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                  style={{ width: `${(feature.adoptionRate / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Segment Comparison ─────────────────────────────────────────────────────────

function SegmentComparison({
  breakdown,
  summary,
  loading,
}: {
  breakdown: SegmentFeature[];
  summary: Summary;
  loading: boolean;
}) {
  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Segment Comparison
            </h3>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
              פרו מול משתמשים חינמיים
            </p>
          </div>
        </div>

        {/* Segment legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Pro ({summary.proUsers})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Free ({summary.freeUsers})
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-white/10" />
        </div>
      ) : (
        <>
          {/* Overall engagement bar */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                Avg Activity Per User (30d)
              </span>
              <span
                className={cn(
                  "text-xs font-black px-3 py-1 rounded-full",
                  summary.segmentGap > 0
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-rose-400 bg-rose-500/10"
                )}
              >
                Gap: {summary.segmentGap > 0 ? "+" : ""}
                {summary.segmentGap}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-blue-400 w-8">Pro</span>
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                    style={{
                      width: `${Math.min(
                        (summary.proAvgActivity /
                          Math.max(summary.proAvgActivity, summary.freeAvgActivity, 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-black text-white w-12 text-left tabular-nums">
                  {summary.proAvgActivity}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-zinc-500 w-8">Free</span>
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-600 to-zinc-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        (summary.freeAvgActivity /
                          Math.max(summary.proAvgActivity, summary.freeAvgActivity, 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-black text-white w-12 text-left tabular-nums">
                  {summary.freeAvgActivity}
                </span>
              </div>
            </div>
          </div>

          {/* Per-feature breakdown */}
          <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
              <span className="flex-1">Feature</span>
              <span className="w-20 text-center">Pro Rate</span>
              <span className="w-20 text-center">Free Rate</span>
              <span className="w-16 text-left">Delta</span>
            </div>
            {breakdown.map((item) => {
              const delta = parseFloat((item.proRate - item.freeRate).toFixed(1));
              return (
                <div
                  key={item.action}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors"
                >
                  <span className="flex-1 text-sm font-bold text-zinc-300 truncate">
                    {formatAction(item.action)}
                  </span>
                  <span className="w-20 text-center text-sm font-black text-blue-400 tabular-nums">
                    {item.proRate}%
                  </span>
                  <span className="w-20 text-center text-sm font-black text-zinc-500 tabular-nums">
                    {item.freeRate}%
                  </span>
                  <span
                    className={cn(
                      "w-16 text-sm font-black tabular-nums text-left",
                      delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-zinc-600"
                    )}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── PostHog Placeholder ────────────────────────────────────────────────────────

function PostHogSection({ connected }: { connected: boolean }) {
  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-600/[0.04] to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <FlaskConical className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            A/B Tests — Live Experiments
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
            PostHog Experiments API
          </p>
        </div>

        <div
          className={cn(
            "ms-auto px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
            connected
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          )}
        >
          {connected ? "Connected" : "Not Connected"}
        </div>
      </div>

      {connected ? (
        <div className="relative p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-black text-white">PostHog API מחובר</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              נתוני ניסויים חיים יופיעו כאן לאחר הטמעת קריאת ה-API בשרת
            </p>
          </div>
        </div>
      ) : (
        <div className="relative space-y-4">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm font-black text-white">
                Connect PostHog Server API Key to view live experiments
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              כדי לצפות בניסויי A/B בזמן אמת, הוסף את משתני הסביבה הבאים לקובץ{" "}
              <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded">.env.local</code>
              :
            </p>

            <div className="space-y-2 font-mono text-xs">
              {[
                {
                  key: "POSTHOG_PERSONAL_API_KEY",
                  desc: "PostHog personal API key (Project Settings → Personal API Keys)",
                },
                {
                  key: "NEXT_PUBLIC_POSTHOG_KEY",
                  desc: "Public PostHog project key (already used for client-side tracking)",
                },
              ].map((env) => (
                <div
                  key={env.key}
                  className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5"
                >
                  <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="text-amber-300 font-black">{env.key}</div>
                    <div className="text-zinc-500 text-[10px] leading-snug">{env.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-600 pt-2">
              API Docs:{" "}
              <a
                href="https://posthog.com/docs/api/experiments"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                posthog.com/docs/api/experiments
              </a>
            </p>
          </div>

          <p className="text-[10px] text-zinc-600 text-center">
            בינתיים, נתוני אימוץ פיצ׳רים מ-Supabase מוצגים למעלה כתחליף מעשי
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ExperimentsPage() {
  const [data, setData] = useState<ExperimentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath("/api/admin/experiments"));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
      }
      const json: ExperimentsData = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Admin Experiments] Failed to load:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) return <PageSkeleton />;

  if (error && !data) {
    return (
      <AdminLayout>
        <div
          className="flex flex-col items-center justify-center py-40 gap-6"
          dir="rtl"
        >
          <div className="p-6 rounded-full bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <p className="text-lg font-black text-white">Experiments Unavailable</p>
            <p className="text-sm text-zinc-500">{error}</p>
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

  const { summary } = data;

  return (
    <AdminLayout>
      <div
        className="space-y-10 animate-in fade-in duration-700 select-none pb-24"
        dir="rtl"
      >
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 px-10 py-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <FlaskConical className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">
                Hybrid — Supabase + PostHog
              </span>
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              Experiments
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-lg">
              ניסויי A/B, אימוץ פיצ׳רים, השוואת סגמנטים — {data.periodDays} ימים אחרונים
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest hover:text-white transition-colors self-end"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            {loading ? "טוען..." : "רענן נתונים"}
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            label="Features Tracked"
            value={summary.featuresTracked.toString()}
            sub={`${data.periodDays}d window`}
            icon={Layers}
            color="blue"
          />
          <SummaryCard
            label="Most Adopted"
            value={
              summary.mostAdopted ? `${summary.mostAdopted.adoptionRate}%` : "—"
            }
            sub={
              summary.mostAdopted
                ? formatAction(summary.mostAdopted.action).slice(0, 20)
                : undefined
            }
            icon={TrendingUp}
            color="emerald"
          />
          <SummaryCard
            label="Least Adopted"
            value={
              summary.leastAdopted ? `${summary.leastAdopted.adoptionRate}%` : "—"
            }
            sub={
              summary.leastAdopted
                ? formatAction(summary.leastAdopted.action).slice(0, 20)
                : undefined
            }
            icon={TrendingDown}
            color="rose"
          />
          <SummaryCard
            label="Segment Gap"
            value={`${summary.segmentGap > 0 ? "+" : ""}${summary.segmentGap}`}
            sub="Pro vs Free avg actions"
            icon={Zap}
            color="amber"
          />
        </div>

        {/* ── Feature Adoption Tracker ── */}
        <FeatureAdoptionTracker
          features={data.featureAdoption}
          loading={loading}
        />

        {/* ── Segment Comparison ── */}
        <SegmentComparison
          breakdown={data.segmentBreakdown}
          summary={summary}
          loading={loading}
        />

        {/* ── Experiment events from activity_logs ── */}
        {data.experimentFeatures.length > 0 && (
          <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Experiment-Related Events
                </h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                  פעולות שמכילות &quot;experiment&quot;, &quot;ab_test&quot;, &quot;feature_flag&quot; או &quot;variant&quot;
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {data.experimentFeatures.map((f) => (
                <div
                  key={f.action}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors"
                >
                  <Circle className="w-2 h-2 text-cyan-500 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-zinc-300">
                    {formatAction(f.action)}
                  </span>
                  <span className="text-sm font-black text-white tabular-nums">
                    {f.distinctUsers} users
                  </span>
                  <span className="text-xs font-black text-cyan-400 tabular-nums">
                    {f.adoptionRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PostHog Section ── */}
        <PostHogSection connected={data.posthogConnected} />

        {/* ── Footer ── */}
        <div className="text-center text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
          Data generated at{" "}
          {new Date(data.generatedAt).toLocaleString("he-IL")}
        </div>
      </div>
    </AdminLayout>
  );
}
