"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, ShieldAlert, Loader, RefreshCw, Archive, BarChart4 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

interface BackupData {
  timestamp: string;
  version: string;
  tables: Record<string, unknown[]>;
}

interface DbStats {
  tableCount: number;
  health: "Healthy" | "Error" | "Checking...";
  rowCounts: Record<string, number>;
  statsLoading: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
        {label}
      </div>
      <div className={cn("text-xl font-bold text-zinc-300", valueColor)}>
        {value}
      </div>
    </div>
  );
}

function ResourceBar({
  label,
  pct,
  color,
  value,
}: {
  label: string;
  pct: number;
  color: string;
  value: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]",
    purple: "bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.4)]",
    emerald: "bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]",
    amber: "bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[10px] font-black text-zinc-700">{value}</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-3000", colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[9px] font-black text-zinc-800 tracking-widest">
        {pct}% OF TOTAL
      </div>
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────────

export function DatabaseTab() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [dbStats, setDbStats] = useState<DbStats>({
    tableCount: 0,
    health: "Checking...",
    rowCounts: {
      profiles: 0,
      personal_library: 0,
      activity_logs: 0,
      api_usage_logs: 0,
      subscriptions: 0,
      credit_ledger: 0,
      newsletter_subscribers: 0,
      prompt_favorites: 0,
      prompt_usage_events: 0,
      prompt_feedback: 0,
      webhook_events: 0,
    },
    statsLoading: true,
  });

  const fetchStats = useCallback(async () => {
    setDbStats((prev) => ({
      ...prev,
      statsLoading: true,
      health: "Checking...",
    }));
    try {
      const res = await fetch(getApiPath("/api/admin/database?action=stats"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setDbStats({
        tableCount: data.tableCount ?? 0,
        health: data.health ?? "Error",
        rowCounts: data.rowCounts ?? {},
        statsLoading: false,
      });
    } catch (err) {
      logger.error("Failed to fetch stats:", err);
      setDbStats((prev) => ({ ...prev, health: "Error", statsLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function createBackup() {
    setBackupLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/database?action=backup"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const backup: BackupData = await res.json();

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `peroot-system-dump-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("System Backup Completed");
    } catch (err) {
      logger.error("Backup failed:", err);
      toast.error("גיבוי נכשל");
    } finally {
      setBackupLoading(false);
    }
  }

  const totalRows = Object.values(dbStats.rowCounts).reduce((s, n) => s + n, 0);
  // Use largest single table as the bar scale max (not total) so bars are meaningful
  const maxSingleTable = Math.max(...Object.values(dbStats.rowCounts), 1);

  const TABLE_COLORS = ["blue","purple","emerald","amber","blue","purple","emerald","amber","blue","purple","emerald"] as const;
  const TABLE_LABELS: Record<string, string> = {
    profiles: "Profiles",
    personal_library: "Personal Library",
    activity_logs: "Activity Logs",
    api_usage_logs: "API Usage Logs",
    subscriptions: "Subscriptions",
    credit_ledger: "Credit Ledger",
    newsletter_subscribers: "Newsletter",
    prompt_favorites: "Favorites",
    prompt_usage_events: "Usage Events",
    prompt_feedback: "Feedback",
    webhook_events: "Webhook Events",
  };

  return (
    <div
      className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none"
      dir="rtl"
    >
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
              Critical Infrastructure Access
            </span>
          </div>
          <h1 className="text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Infra Matrix
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
            ניהול מסד נתונים, גיבויים ותקינות תשתית הענן. כל פעולה כאן משפיעה ישירות
            על ליבת המערכת וזמינות המידע.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="px-6 py-3 rounded-2xl bg-white/3 border border-white/5 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connectivity: Optimal
          </div>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Backup Control */}
        <div className="group relative overflow-hidden rounded-[48px] border border-white/5 bg-zinc-950 p-1 transition-all duration-700 hover:border-white/10 hover:shadow-3xl">
          <div className="relative p-12 rounded-[46px] bg-zinc-950 flex flex-col gap-10">
            <div className="flex justify-between items-start">
              <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 text-blue-500 shadow-2xl group-hover:scale-110 transition-transform">
                <Download className="w-10 h-10" />
              </div>
              <div>
                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                  Safe Operation
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-4xl font-black text-white tracking-tighter">
                Genesis Snapshot
              </h3>
              <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-sm">
                יצירת עותק מקומי מוצפן ושלם של כל מסד הנתונים הנוכחי, כולל הגדרות
                מערכת ופרופילי משתמשים.
              </p>
            </div>

            <button
              onClick={createBackup}
              disabled={backupLoading}
              className="w-full py-6 rounded-[24px] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 shadow-3xl shadow-blue-900/20"
            >
              {backupLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
              <span>
                {backupLoading ? "Building Snapshot..." : "Initiate Global Export"}
              </span>
            </button>

            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
              <Metric
                label="Data Nodes"
                value={dbStats.statsLoading ? "..." : String(dbStats.tableCount)}
              />
              <Metric
                label="Total Rows"
                value={dbStats.statsLoading ? "..." : totalRows.toLocaleString()}
              />
              <Metric
                label="Health"
                value={dbStats.health}
                valueColor={
                  dbStats.health === "Healthy"
                    ? "text-emerald-400"
                    : dbStats.health === "Error"
                    ? "text-rose-400"
                    : "text-zinc-400"
                }
              />
            </div>
          </div>
        </div>

        {/* Refresh Stats */}
        <div className="group relative overflow-hidden rounded-[48px] border border-white/5 bg-zinc-950 p-1 transition-all duration-700 hover:border-white/10 hover:shadow-3xl">
          <div className="relative p-12 rounded-[46px] bg-zinc-950 flex flex-col gap-10">
            <div className="flex justify-between items-start">
              <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 text-emerald-500 shadow-2xl group-hover:scale-110 transition-transform">
                <RefreshCw className="w-10 h-10" />
              </div>
              <div>
                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                  Live Stats
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-4xl font-black text-white tracking-tighter">
                Refresh Stats
              </h3>
              <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-sm">
                עדכון נתוני בסיס הנתונים בזמן אמת: ספירת שורות לכל טבלה, בדיקת
                תקינות ומצב הזיכרון הכולל.
              </p>
            </div>

            <button
              onClick={fetchStats}
              disabled={dbStats.statsLoading}
              className="w-full py-6 rounded-[24px] bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-600/20 font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl"
            >
              <RefreshCw
                className={cn("w-5 h-5", dbStats.statsLoading && "animate-spin")}
              />
              <span>
                {dbStats.statsLoading ? "Fetching Stats..." : "Refresh Database Stats"}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-6 pt-10 border-t border-white/5">
              <Metric
                label="Profiles"
                value={
                  dbStats.statsLoading
                    ? "..."
                    : `${(dbStats.rowCounts.profiles ?? 0).toLocaleString()} rows`
                }
              />
              <Metric
                label="Library Items"
                value={
                  dbStats.statsLoading
                    ? "..."
                    : `${(dbStats.rowCounts.personal_library ?? 0).toLocaleString()} rows`
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global Resource Utilization */}
      <div className="pt-10 mx-2">
        <div className="p-12 rounded-[56px] border border-white/5 bg-zinc-950 relative overflow-hidden group shadow-3xl">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-8">
              <div className="p-6 rounded-[32px] bg-zinc-900 border border-white/5 shadow-2xl">
                <BarChart4 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">
                  Row Distribution
                </h3>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">
                  Live table row counts
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
              {dbStats.statsLoading
                ? "..."
                : `${totalRows.toLocaleString()} Total Rows`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {Object.entries(dbStats.rowCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([table, count], idx) => (
                <ResourceBar
                  key={table}
                  label={TABLE_LABELS[table] ?? table}
                  pct={dbStats.statsLoading ? 0 : Math.round((count / maxSingleTable) * 100)}
                  color={TABLE_COLORS[idx % TABLE_COLORS.length]}
                  value={dbStats.statsLoading ? "..." : `${count.toLocaleString()} ROWS`}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
