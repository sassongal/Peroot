"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { Activity, Users, Zap, Eye, Server, Pause, Play, RefreshCw, Radio } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedEvent {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  details: string | null;
  createdAt: string;
}

interface ActivePage {
  action: string;
  count: number;
}

interface HeatmapSlot {
  hour: number;
  label: string;
  count: number;
}

interface TopUser {
  userId: string;
  email: string | null;
  displayName: string;
  eventCount: number;
}

interface Counters {
  activeNow: number;
  eventsPerMin: number;
  pagesLastHour: number;
  apiCallsLastHour: number;
}

interface RealtimeData {
  activeSessions: number;
  feed: FeedEvent[];
  activePages: ActivePage[];
  heatmap: HeatmapSlot[];
  topUsers: TopUser[];
  counters: Counters;
  fetchedAt: string;
}

// ── Action colour coding ──────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  create: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
  update: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-500" },
  delete: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-500" },
  view: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-500" },
  login: { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-500" },
  logout: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
  api: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-500" },
  error: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
  generate: { bg: "bg-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-500" },
};

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return (
    ACTION_COLORS[key ?? ""] ?? {
      bg: "bg-zinc-800/50",
      text: "text-zinc-500",
      dot: "bg-zinc-600",
    }
  );
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "עכשיו";
  if (diff < 60) return `לפני ${diff}ש`;
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)}ד`;
  return `לפני ${Math.floor(diff / 3600)}ש`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CounterCard({
  label,
  value,
  icon: Icon,
  color,
  pulse = false,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  pulse?: boolean;
}) {
  const colorMap: Record<string, { icon: string; text: string }> = {
    emerald: {
      icon: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-400",
    },
    blue: {
      icon: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      text: "text-white",
    },
    purple: {
      icon: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      text: "text-white",
    },
    amber: {
      icon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      text: "text-white",
    },
  };
  const c = colorMap[color] ?? colorMap["blue"];

  return (
    <div className="group p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-5 transition-all duration-700 hover:border-white/10 hover:shadow-2xl">
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-2xl border", c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {pulse && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse block" />
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
              Live
            </span>
          </div>
        )}
      </div>
      <div>
        <div
          className={cn(
            "text-4xl font-black tracking-tighter leading-none transition-transform duration-700 group-hover:scale-110 group-hover:-translate-x-1 origin-right",
            c.text,
          )}
        >
          {value}
        </div>
        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mt-2">
          {label}
        </div>
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
  color: string;
  title: string;
  sub: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
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

// ── Tab ──────────────────────────────────────────────────────────────────────

export function RealtimeTab() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(getApiPath("/api/admin/realtime"));
      if (!res.ok) throw new Error("Failed to fetch");
      const json: RealtimeData = await res.json();

      setData(() => {
        // Detect new feed items for animation
        const incoming = new Set(json.feed.map((e) => e.id));
        const fresh = new Set<string>();
        for (const id of incoming) {
          if (!prevIdsRef.current.has(id)) fresh.add(id);
        }
        prevIdsRef.current = incoming;
        setNewIds(fresh);
        // Clear animation flags after 1.2s
        if (fresh.size > 0) {
          setTimeout(() => setNewIds(new Set()), 1200);
        }
        return json;
      });
    } catch (err) {
      logger.error("[Realtime tab] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 seconds when not paused
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchData, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, fetchData]);

  const maxHeat = Math.max(...(data?.heatmap ?? []).map((h) => h.count), 1);
  const maxTopUser = data?.topUsers?.[0]?.eventCount ?? 1;

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-24 select-none" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
              Live Intelligence Layer
            </span>
          </div>
          <h1 className="text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Real-Time Activity
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
            ניטור פעילות בזמן אמת. עדכון אוטומטי כל 10 שניות.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live status pill */}
          <div
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
              paused
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                paused ? "bg-amber-500" : "bg-emerald-500 animate-pulse",
              )}
            />
            {paused ? "מושהה" : "חי"}
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setPaused((p) => !p)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
              paused
                ? "bg-emerald-600 text-white border-transparent hover:bg-emerald-500 shadow-2xl shadow-emerald-600/20"
                : "bg-white/3 border-white/5 text-zinc-400 hover:text-white",
            )}
          >
            {paused ? (
              <>
                <Play className="w-4 h-4" /> המשך
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> השהה
              </>
            )}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            רענן
          </button>
        </div>
      </div>

      {/* ── Counters ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
        <CounterCard
          label="פעילים עכשיו"
          value={data?.counters.activeNow ?? "-"}
          icon={Users}
          color="emerald"
          pulse
        />
        <CounterCard
          label="אירועים/דקה"
          value={data?.counters.eventsPerMin ?? "-"}
          icon={Zap}
          color="blue"
        />
        <CounterCard
          label="דפים (שעה אחרונה)"
          value={data?.counters.pagesLastHour ?? "-"}
          icon={Eye}
          color="purple"
        />
        <CounterCard
          label="API Calls (שעה)"
          value={data?.counters.apiCallsLastHour ?? "-"}
          icon={Server}
          color="amber"
        />
      </div>

      {/* ── Activity heatmap ── */}
      <div className="px-2 space-y-4">
        <SectionTitle
          icon={Activity}
          color="blue"
          title="Activity Heatmap"
          sub="נפח פעילות לפי שעה - 24 שעות אחרונות"
        />
        <div className="p-8 rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl">
          {loading ? (
            <div className="h-16 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500/20" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-1.5 h-16">
                {(data?.heatmap ?? []).map((slot) => {
                  const intensity = slot.count / maxHeat;
                  const heightPct = Math.max(intensity * 100, 4);
                  return (
                    <div
                      key={slot.label}
                      className="flex-1 flex flex-col items-center gap-1 group"
                      title={`${slot.label}: ${slot.count} אירועים`}
                    >
                      <div
                        className="w-full rounded-t-md transition-all duration-700"
                        style={{
                          height: `${heightPct}%`,
                          background: `rgba(59,130,246,${0.1 + intensity * 0.85})`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Hour labels - show every 4 hours */}
              <div className="flex gap-1.5">
                {(data?.heatmap ?? []).map((slot, i) => (
                  <div key={slot.label} className="flex-1 text-center">
                    {i % 4 === 0 && (
                      <span className="text-[8px] font-black text-zinc-700 uppercase">
                        {slot.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2">
        {/* Live feed (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <SectionTitle
            icon={Radio}
            color="emerald"
            title="Live Feed"
            sub="50 האירועים האחרונים בזמן אמת"
          />
          <div className="rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl overflow-hidden">
            {loading && !data ? (
              <div className="flex flex-col items-center gap-4 py-24">
                <RefreshCw className="w-10 h-10 animate-spin text-emerald-500/20" />
                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                  טוען נתוני אמת...
                </span>
              </div>
            ) : (
              <div className="divide-y divide-white/3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {(data?.feed ?? []).map((event) => {
                  const colors = actionColor(event.action);
                  const isNew = newIds.has(event.id);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-start gap-4 px-6 py-4 transition-all duration-500",
                        isNew && "bg-white/4 animate-in slide-in-from-top-1 fade-in",
                      )}
                    >
                      {/* Action dot */}
                      <div className="mt-1.5 shrink-0">
                        <span className={cn("w-2 h-2 rounded-full block", colors.dot)} />
                      </div>

                      {/* Action badge */}
                      <span
                        className={cn(
                          "shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-white/5",
                          colors.bg,
                          colors.text,
                        )}
                      >
                        {event.action.slice(0, 18)}
                      </span>

                      {/* User + details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-400 font-mono">
                            {event.userId}
                          </span>
                          {event.entityType && (
                            <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-wider">
                              {event.entityType}
                            </span>
                          )}
                        </div>
                        {event.details && (
                          <p className="text-[10px] text-zinc-700 truncate mt-0.5 font-medium">
                            {event.details}
                          </p>
                        )}
                      </div>

                      {/* Relative time */}
                      <span className="shrink-0 text-[9px] font-black text-zinc-700 tabular-nums">
                        {relativeTime(event.createdAt)}
                      </span>
                    </div>
                  );
                })}
                {(data?.feed ?? []).length === 0 && (
                  <div className="py-20 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]">
                    אין פעילות להצגה
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active Pages + Top Users */}
        <div className="space-y-6">
          {/* Active pages */}
          <div className="space-y-4">
            <SectionTitle icon={Eye} color="purple" title="Active Actions" sub="השעה האחרונה" />
            <div className="rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl p-6 space-y-3">
              {(data?.activePages ?? []).length === 0 ? (
                <p className="text-[9px] text-zinc-800 font-black uppercase tracking-widest text-center py-6">
                  אין נתונים
                </p>
              ) : (
                (data?.activePages ?? []).map((page) => {
                  const colors = actionColor(page.action);
                  const maxCount = data?.activePages?.[0]?.count ?? 1;
                  return (
                    <div key={page.action} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider w-28 truncate text-center",
                          colors.bg,
                          colors.text,
                        )}
                      >
                        {page.action.slice(0, 14)}
                      </span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            colors.dot,
                          )}
                          style={{
                            width: `${(page.count / maxCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-zinc-600 w-8 text-left tabular-nums">
                        {page.count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top users */}
          <div className="space-y-4">
            <SectionTitle icon={Users} color="amber" title="Top Users" sub="30 דקות אחרונות" />
            <div className="rounded-[36px] bg-zinc-950/80 border border-white/5 backdrop-blur-3xl p-6 space-y-3">
              {(data?.topUsers ?? []).length === 0 ? (
                <p className="text-[9px] text-zinc-800 font-black uppercase tracking-widest text-center py-6">
                  אין משתמשים פעילים
                </p>
              ) : (
                (data?.topUsers ?? []).map((u, i) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-zinc-700 w-4 text-center">
                      {i + 1}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[10px] font-black text-zinc-300 truncate">
                        {u.email ?? u.displayName}
                      </span>
                    </div>
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${(u.eventCount / maxTopUser) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-amber-400 w-8 text-left tabular-nums">
                      {u.eventCount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Last updated ── */}
      {data?.fetchedAt && (
        <div className="text-center text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">
          עודכן לאחרונה: {new Date(data.fetchedAt).toLocaleTimeString("he-IL")}
        </div>
      )}
    </div>
  );
}
