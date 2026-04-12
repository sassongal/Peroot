"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { scoreInput } from "@/lib/engines/scoring/input-scorer";
import { CapabilityMode } from "@/lib/capability-mode";
import {
  BarChart3,
  RefreshCw,
  Layers,
  Zap,
  PieChart,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CountEntry {
  value: string;
  count: number;
}

interface SamplePrompt {
  original: string;
  capability_mode: CapabilityMode | null;
}

interface DailyEntry {
  date: string;
  count: number;
}

interface ScoringData {
  total: number;
  byMode: CountEntry[];
  bySource: CountEntry[];
  byInputSource: CountEntry[];
  recentSample: SamplePrompt[];
  daily: DailyEntry[];
}

interface ScoredSample {
  total: number;
  level: string;
  mode: CapabilityMode;
  missingTop: Array<{ title: string }>;
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  STANDARD: "רגיל",
  DEEP_RESEARCH: "מחקר מעמיק",
  IMAGE_GENERATION: "יצירת תמונה",
  VIDEO_GENERATION: "יצירת וידאו",
  AGENT_BUILDER: "בניית סוכן",
  unknown: "לא צוין",
};

const SOURCE_LABELS: Record<string, string> = {
  web: "אתר",
  extension: "תוסף",
  api: "API",
  unknown: "לא ידוע",
};

const INPUT_SOURCE_LABELS: Record<string, string> = {
  text: "טקסט",
  file: "קובץ",
  url: "לינק",
  image: "תמונה",
};

const LEVEL_LABELS: Record<string, string> = {
  empty: "ריק",
  low: "חלש",
  medium: "סביר",
  high: "טוב",
  elite: "מצוין",
};

const LEVEL_COLORS: Record<string, string> = {
  empty: "bg-slate-500/20 text-slate-400",
  low: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-emerald-500/20 text-emerald-400",
  elite: "bg-blue-500/20 text-blue-400",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function ScoringAnalyticsTab() {
  const [data, setData] = useState<ScoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath("/api/admin/scoring-stats"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      logger.error("[ScoringAnalyticsTab]", err);
      setError("טעינת נתוני ציון נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side scoring of the sample — single pass for all derived stats
  const scoredSamples: ScoredSample[] = useMemo(() => {
    if (!data?.recentSample) return [];
    return data.recentSample.map((s) => {
      const mode = s.capability_mode || CapabilityMode.STANDARD;
      const result = scoreInput(s.original || "", mode);
      return { total: result.total, level: result.level, mode, missingTop: result.missingTop };
    });
  }, [data?.recentSample]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const dist: Record<string, number> = { empty: 0, low: 0, medium: 0, high: 0, elite: 0 };
    for (const s of scoredSamples) dist[s.level] = (dist[s.level] || 0) + 1;
    return dist;
  }, [scoredSamples]);

  // Average score
  const avgScore = useMemo(() => {
    const nonEmpty = scoredSamples.filter((s) => s.level !== "empty");
    if (nonEmpty.length === 0) return 0;
    return Math.round(nonEmpty.reduce((sum, s) => sum + s.total, 0) / nonEmpty.length);
  }, [scoredSamples]);

  // Most missing dimensions — derived from scoredSamples (no double scoring)
  const topMissing = useMemo(() => {
    const dimCounts: Record<string, number> = {};
    for (const s of scoredSamples) {
      for (const m of s.missingTop) {
        dimCounts[m.title] = (dimCounts[m.title] || 0) + 1;
      }
    }
    return Object.entries(dimCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));
  }, [scoredSamples]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-(--text-muted)" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-red-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p>{error || "אין נתונים"}</p>
        <button onClick={fetchData} className="mt-3 text-sm underline text-(--text-muted)">נסה שוב</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-(--text-primary)">ניתוח ציונים</h2>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-white/10 text-(--text-muted) transition-colors"
          title="רענן"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Layers} label="סה״כ שיפורים" value={data.total.toLocaleString()} />
        <KpiCard icon={Zap} label="ציון ממוצע (50 אחרונים)" value={`${avgScore}/100`} />
        <KpiCard icon={PieChart} label="מצבים פעילים" value={data.byMode.length.toString()} />
        <KpiCard icon={TrendingUp} label="היום" value={(data.daily.at(-1)?.count ?? 0).toString()} />
      </div>

      {/* Score Distribution */}
      <Section title="התפלגות ציונים (50 אחרונים)">
        <div className="flex items-end gap-2 h-24">
          {Object.entries(scoreDistribution).map(([level, count]) => {
            const maxCount = Math.max(...Object.values(scoreDistribution), 1);
            const pct = (count / maxCount) * 100;
            return (
              <div key={level} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-(--text-muted)">{count}</span>
                <div
                  className={cn("w-full rounded-t-md transition-all", LEVEL_COLORS[level] || "bg-slate-500/20")}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
                <span className="text-[9px] text-(--text-muted)">{LEVEL_LABELS[level] || level}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Most Missing Dimensions */}
      <Section title="ממדים חסרים הכי נפוצים">
        {topMissing.length === 0 ? (
          <p className="text-sm text-(--text-muted)">אין נתונים</p>
        ) : (
          <div className="space-y-2">
            {topMissing.map(({ title, count }) => (
              <div key={title} className="flex items-center justify-between">
                <span className="text-sm text-(--text-secondary)">{title}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/50 rounded-full"
                      style={{ width: `${(count / (data.recentSample?.length || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-(--text-muted) w-8 text-left">{count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* By Mode / By Source / By Input Source */}
      <div className="grid md:grid-cols-3 gap-4">
        <Section title="לפי מצב">
          <BreakdownList items={data.byMode} labels={MODE_LABELS} />
        </Section>
        <Section title="לפי מקור">
          <BreakdownList items={data.bySource} labels={SOURCE_LABELS} />
        </Section>
        <Section title="לפי סוג קלט">
          <BreakdownList items={data.byInputSource} labels={INPUT_SOURCE_LABELS} />
        </Section>
      </div>

      {/* Daily chart */}
      <Section title="שיפורים יומיים (30 יום)">
        {data.daily.length === 0 ? (
          <p className="text-sm text-(--text-muted)">אין נתונים</p>
        ) : (
          <div className="flex items-end gap-[2px] h-20">
            {data.daily.map(({ date, count }) => {
              const maxDaily = Math.max(...data.daily.map((d) => d.count), 1);
              return (
                <div
                  key={date}
                  className="flex-1 bg-amber-500/30 hover:bg-amber-500/50 rounded-t-sm transition-colors cursor-default"
                  style={{ height: `${Math.max((count / maxDaily) * 100, 2)}%` }}
                  title={`${date}: ${count}`}
                />
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--glass-border) bg-black/5 dark:bg-black/30 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-(--text-muted)">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-(--text-primary)">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-(--glass-border) bg-black/5 dark:bg-black/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-(--text-primary)">{title}</h3>
      {children}
    </div>
  );
}

function BreakdownList({ items, labels }: { items: CountEntry[]; labels: Record<string, string> }) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  const sorted = [...items].sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-1.5">
      {sorted.map(({ value, count }) => (
        <div key={value} className="flex items-center justify-between text-xs">
          <span className="text-(--text-secondary)">{labels[value] || value}</span>
          <div className="flex items-center gap-2">
            <span className="text-(--text-muted)">{Math.round((count / total) * 100)}%</span>
            <span className="text-(--text-muted) w-6 text-left">{count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
