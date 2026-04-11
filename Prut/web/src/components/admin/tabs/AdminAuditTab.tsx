"use client";

import { useState, useEffect, useCallback } from "react";

import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  Shield,
  RefreshCw,
  Search,
  Calendar,
  Activity,
  Users,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
}

interface ActionsByDay {
  date: string;
  count: number;
}

interface ActionsByType {
  action: string;
  count: number;
}

interface AdminActivity {
  user_id: string;
  email: string;
  display_name: string;
  count: number;
}

interface AuditSummary {
  totalActions: number;
  uniqueAdmins: number;
  mostCommonAction: string;
  actionsToday: number;
}

interface AuditData {
  logs: AuditLogEntry[];
  summary: AuditSummary;
  byDay: ActionsByDay[];
  byType: ActionsByType[];
  topAdmins: AdminActivity[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultFrom(): string {
  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });
}

const DONUT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// ── Sub-components ────────────────────────────────────────────────────────────

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
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="group p-7 rounded-[36px] bg-zinc-950/80 border border-white/5 flex flex-col gap-5 transition-all duration-500 hover:border-white/10 hover:shadow-2xl backdrop-blur-sm">
      <div className={cn("p-3 rounded-2xl border self-start transition-all duration-500", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter leading-none truncate">
          {value}
        </div>
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
          {label}
        </div>
        {sub && (
          <div className="text-[9px] text-zinc-700 font-bold">{sub}</div>
        )}
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
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
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

// SVG donut chart - pure CSS/SVG, no external charting lib
function DonutChart({ data }: { data: ActionsByType[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-48 text-zinc-700 text-[10px] font-black uppercase tracking-widest">
      No data
    </div>
  );

  const top8 = data.slice(0, 8);
  const radius = 60;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  // reduce instead of let-accumulator-in-map — keeps the computation
  // pure so React 19 Strict Mode's double render doesn't corrupt offsets.
  const segments = top8.reduce<Array<typeof top8[number] & { dashArray: number; dashOffset: number; color: string }>>(
    (acc, item, idx) => {
      const prevOffset = acc.reduce((sum, s) => sum + s.dashArray / circumference, 0);
      const pct = item.count / total;
      const dashArray = pct * circumference;
      const dashOffset = circumference - prevOffset * circumference;
      acc.push({ ...item, dashArray, dashOffset, color: DONUT_COLORS[idx] });
      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center">
        <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
          {/* background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-3 group">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors truncate flex-1">
              {seg.action}
            </span>
            <span className="text-[10px] font-black text-zinc-600 tabular-nums">
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar chart - rendered in pure CSS
function BarChart({ data }: { data: ActionsByDay[] }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-700 text-[10px] font-black uppercase tracking-widest">
        No data in range
      </div>
    );
  }

  return (
    <div className="h-48 flex items-end gap-1.5">
      {data.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group min-w-0">
          <div className="w-full relative flex items-end" style={{ height: "140px" }}>
            <div
              className="w-full bg-linear-to-t from-purple-700 to-purple-500 rounded-t-lg transition-all duration-700 group-hover:from-purple-500 group-hover:to-white group-hover:shadow-[0_0_16px_rgba(168,85,247,0.4)]"
              style={{
                height: `${(day.count / maxVal) * 100}%`,
                minHeight: day.count > 0 ? "4px" : "0",
              }}
            />
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-zinc-800 text-white text-[10px] font-black px-2 py-1 rounded-md border border-white/10 pointer-events-none whitespace-nowrap shadow-2xl z-10">
              {day.count}
            </div>
          </div>
          <div className="text-[8px] font-black text-zinc-700 group-hover:text-zinc-400 transition-colors uppercase truncate w-full text-center">
            {fmtDateShort(day.date)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminAuditTab() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayISO());
  const [actionSearch, setActionSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (actionSearch) params.set("action", actionSearch);
      const res = await fetch(getApiPath(`/api/admin/audit?${params}`));
      if (!res.ok) throw new Error("Failed to fetch audit data");
      const json: AuditData = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Audit Page] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [from, to, actionSearch]);

  useEffect(() => {
    fetchAudit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply() {
    fetchAudit();
  }

  function exportCSV() {
    if (!data?.logs?.length) return;
    const BOM = "\uFEFF";
    const headers = ["Timestamp", "Admin", "Email", "Action", "Details"];
    const rows = data.logs.map((l) => [
      new Date(l.created_at).toLocaleString("he-IL"),
      l.admin_name ?? "",
      l.admin_email ?? "",
      l.action,
      l.details ? JSON.stringify(l.details) : "",
    ]);
    const csv =
      BOM +
      [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin_audit_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = data?.summary;

  return (
    
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">
                Security Intelligence Layer
              </span>
            </div>
            <h1 className="text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              Admin Audit
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
              מעקב אחר כל פעולות האדמין במערכת - מי עשה מה ומתי
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={!data?.logs?.length}
              className="px-5 py-3 bg-white/3 border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2 rounded-2xl disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={fetchAudit}
              disabled={loading}
              className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-2xl"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard
            label="Total Admin Actions"
            value={loading ? "-" : (summary?.totalActions ?? 0).toLocaleString()}
            sub="בטווח הנבחר"
            icon={Activity}
            color="purple"
          />
          <SummaryCard
            label="Unique Admins"
            value={loading ? "-" : (summary?.uniqueAdmins ?? 0).toString()}
            sub="אדמינים פעילים"
            icon={Users}
            color="blue"
          />
          <SummaryCard
            label="Most Common Action"
            value={loading ? "-" : (summary?.mostCommonAction ?? "-")}
            sub="פעולה נפוצה"
            icon={Zap}
            color="amber"
          />
          <SummaryCard
            label="Actions Today"
            value={loading ? "-" : (summary?.actionsToday ?? 0).toString()}
            sub="היום"
            icon={Clock}
            color="emerald"
          />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-4 p-6 bg-zinc-950/50 rounded-[36px] border border-white/5 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-48">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              Search Action
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                placeholder="e.g. grant-admin, ban-user..."
                className="w-full bg-zinc-900 border border-white/5 text-white rounded-2xl pr-10 pl-4 py-2.5 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/40 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActionSearch("");
                setFrom(defaultFrom());
                setTo(todayISO());
              }}
              className="px-5 py-2.5 bg-white/5 border border-white/5 text-zinc-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-8 py-2.5 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
              Apply
            </button>
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Bar chart - actions per day */}
          <div className="lg:col-span-2 rounded-[36px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-8 shadow-2xl space-y-6">
            <SectionTitle
              icon={Activity}
              color="purple"
              title="פעילות יומית"
              sub="Admin Actions Per Day"
            />
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-500/20" />
              </div>
            ) : (
              <BarChart data={data?.byDay ?? []} />
            )}
          </div>

          {/* Donut - actions by type */}
          <div className="rounded-[36px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-8 shadow-2xl space-y-6">
            <SectionTitle
              icon={Zap}
              color="blue"
              title="לפי סוג פעולה"
              sub="Actions by Type"
            />
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500/20" />
              </div>
            ) : (
              <DonutChart data={data?.byType ?? []} />
            )}
          </div>
        </div>

        {/* ── Top Admins ── */}
        <div className="rounded-[36px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-8 shadow-2xl space-y-6">
          <SectionTitle
            icon={Users}
            color="emerald"
            title="אדמינים הפעילים ביותר"
            sub="Most Active Admins in Range"
          />
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500/20" />
            </div>
          ) : (data?.topAdmins ?? []).length === 0 ? (
            <p className="text-center text-zinc-700 font-black uppercase tracking-widest text-[9px] py-12">
              No admin activity in this period
            </p>
          ) : (
            <div className="space-y-4">
              {(data?.topAdmins ?? []).map((admin, i) => {
                const maxCount = data!.topAdmins[0].count || 1;
                return (
                  <div key={admin.user_id} className="flex items-center gap-5 group">
                    <span className="text-[9px] font-black text-zinc-700 w-4 text-center">
                      {i + 1}
                    </span>
                    <div className="w-44 shrink-0">
                      <div className="text-xs font-black text-zinc-300 truncate group-hover:text-white transition-colors">
                        {admin.display_name !== "Unknown" ? admin.display_name : admin.email}
                      </div>
                      <div className="text-[9px] text-zinc-700 font-bold truncate">
                        {admin.email}
                      </div>
                    </div>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${(admin.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-emerald-400 font-black text-sm tabular-nums w-16 text-left shrink-0">
                      {admin.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Audit Log Table ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <SectionTitle
              icon={Calendar}
              color="purple"
              title="לוג פעולות אדמין"
              sub="Recent Admin Action Log"
            />
            {data?.logs?.length !== undefined && (
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                {data.logs.length} records
              </span>
            )}
          </div>

          <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Timestamp", "Admin", "Action", "Details"].map((h) => (
                      <th
                        key={h}
                        className="px-8 py-7 text-right text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-4 py-7 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCw className="w-10 h-10 animate-spin text-purple-500/20" />
                          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                            Loading Audit Stream...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (data?.logs ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-8 py-24 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]"
                      >
                        No admin actions found in this period
                      </td>
                    </tr>
                  ) : (
                    (data?.logs ?? []).map((log) => {
                      const isExpanded = expandedRow === log.id;
                      const hasDetails =
                        log.details && Object.keys(log.details).length > 0;
                      return (
                        <>
                          <tr
                            key={log.id}
                            className={cn(
                              "group transition-all duration-300",
                              isExpanded
                                ? "bg-white/3"
                                : "hover:bg-white/2",
                              hasDetails && "cursor-pointer"
                            )}
                            onClick={() =>
                              hasDetails &&
                              setExpandedRow(isExpanded ? null : log.id)
                            }
                          >
                            {/* Timestamp */}
                            <td className="px-8 py-5 text-zinc-500 font-bold text-xs tabular-nums whitespace-nowrap">
                              {fmtDateTime(log.created_at)}
                            </td>

                            {/* Admin */}
                            <td className="px-8 py-5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-black text-zinc-300 group-hover:text-white transition-colors">
                                  {log.admin_name !== "Unknown Admin"
                                    ? log.admin_name
                                    : "Admin"}
                                </span>
                                <span className="text-[10px] text-zinc-700 font-bold truncate max-w-[180px]">
                                  {log.admin_email}
                                </span>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="px-8 py-5">
                              <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                {log.action}
                              </span>
                            </td>

                            {/* Details summary */}
                            <td className="px-8 py-5 max-w-xs">
                              {log.details ? (
                                <span className="text-zinc-600 font-medium text-xs truncate block">
                                  {Object.entries(log.details)
                                    .filter(([k]) => k !== "is_admin" && k !== "timestamp")
                                    .slice(0, 2)
                                    .map(([k, v]) => `${k}: ${String(v)}`)
                                    .join(" · ") || "-"}
                                </span>
                              ) : (
                                <span className="text-zinc-800 text-xs">-</span>
                              )}
                            </td>

                            {/* Expand toggle */}
                            <td className="px-4 py-5">
                              {hasDetails ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedRow(isExpanded ? null : log.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 text-zinc-600 hover:text-zinc-300 transition-all"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : null}
                            </td>
                          </tr>

                          {/* Expanded details row */}
                          {isExpanded && hasDetails && (
                            <tr key={`${log.id}-details`} className="bg-white/1.5">
                              <td colSpan={5} className="px-8 py-5">
                                <pre className="text-[10px] font-mono text-zinc-500 bg-black/30 rounded-2xl p-4 border border-white/5 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        {data?.generatedAt && (
          <p className="text-center text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">
            Updated:{" "}
            {new Date(data.generatedAt).toLocaleString("he-IL")}
          </p>
        )}
      </div>
    
  );
}
