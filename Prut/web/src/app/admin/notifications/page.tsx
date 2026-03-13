"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Activity,
  Clock,
  TrendingUp,
  Heart,
  Zap,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = "critical" | "warning" | "info";

interface NotificationMetric {
  label: string;
  current: number | string;
  baseline: number | string;
  unit?: string;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  metric?: NotificationMetric;
}

interface Summary {
  critical: number;
  warning: number;
  info: number;
  healthScore: number;
  generatedAt: string;
}

interface ApiResponse {
  notifications: Notification[];
  summary: Summary;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nexus_admin_acked_notifications";
const AUTO_REFRESH_INTERVAL = 60_000; // 60 seconds

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAcked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveAcked(acked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(acked)));
  } catch {
    // ignore storage errors
  }
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function healthLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: "תקין לחלוטין", color: "text-emerald-400" };
  if (score >= 70) return { text: "תקין", color: "text-emerald-400" };
  if (score >= 50) return { text: "תשומת לב נדרשת", color: "text-amber-400" };
  if (score >= 25) return { text: "בעיות קריטיות", color: "text-rose-400" };
  return { text: "מצב חירום", color: "text-rose-500" };
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: React.ElementType;
    border: string;
    bg: string;
    badge: string;
    iconColor: string;
    label: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    badge: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    iconColor: "text-rose-400",
    label: "קריטי",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    iconColor: "text-amber-400",
    label: "אזהרה",
  },
  info: {
    icon: Info,
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    iconColor: "text-blue-400",
    label: "מידע",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  value,
  label,
  color,
  sub,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  sub: string;
}) {
  const colorMap: Record<string, string> = {
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  };
  return (
    <div className="group p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-5 transition-all duration-500 hover:border-white/10">
      <div className={cn("p-3.5 rounded-2xl border w-fit", colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter leading-none">
          {value}
        </div>
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
          {label}
        </div>
        <div className="text-[9px] text-zinc-800 font-bold">{sub}</div>
      </div>
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const { text, color } = healthLabel(score);
  const strokeDasharray = 226; // circumference of r=36
  const strokeDashoffset = strokeDasharray - (score / 100) * strokeDasharray;
  const gaugeColor =
    score >= 70
      ? "#10b981"
      : score >= 50
      ? "#f59e0b"
      : "#f43f5e";

  return (
    <div className="group p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-5 transition-all duration-500 hover:border-white/10">
      <div className="p-3.5 rounded-2xl border w-fit text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
        <Heart className="w-5 h-5" />
      </div>
      <div className="flex items-center gap-6">
        {/* SVG Gauge */}
        <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={gaugeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
          />
        </svg>
        <div className="space-y-1">
          <div className="text-4xl font-black text-white tracking-tighter leading-none">
            {score}
          </div>
          <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            System Health Score
          </div>
          <div className={cn("text-xs font-black", color)}>{text}</div>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  acknowledged,
  onAcknowledge,
}: {
  notification: Notification;
  acknowledged: boolean;
  onAcknowledge: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "relative rounded-[28px] border p-6 transition-all duration-300",
        acknowledged
          ? "border-white/5 bg-zinc-950/40 opacity-50"
          : cn(cfg.border, cfg.bg)
      )}
    >
      {/* Severity stripe */}
      <div
        className={cn(
          "absolute start-0 top-6 bottom-6 w-1 rounded-full",
          notification.type === "critical"
            ? "bg-rose-500"
            : notification.type === "warning"
            ? "bg-amber-500"
            : "bg-blue-500"
        )}
      />

      <div className="ps-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-xl border mt-0.5",
                acknowledged
                  ? "text-zinc-600 bg-zinc-800/50 border-zinc-700/50"
                  : cn(cfg.badge)
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-tight">
                  {notification.title}
                </h3>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider",
                    acknowledged
                      ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-600"
                      : cfg.badge
                  )}
                >
                  {acknowledged ? "נסגר" : cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-zinc-700 text-[10px] font-bold">
                <Clock className="w-3 h-3" />
                {fmtDateTime(notification.timestamp)}
              </div>
            </div>
          </div>

          {/* Acknowledge button */}
          {!acknowledged && (
            <button
              onClick={() => onAcknowledge(notification.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all shrink-0"
            >
              <CheckCircle className="w-3 h-3" />
              סגור
            </button>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-zinc-400 font-medium leading-relaxed">
          {notification.message}
        </p>

        {/* Metric pill */}
        {notification.metric && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/30 border border-white/5">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
              <div className="flex items-center gap-1.5 text-[10px] font-black">
                <span className="text-zinc-600 uppercase tracking-wider">
                  {notification.metric.label}:
                </span>
                <span className="text-white">{notification.metric.current}</span>
                <span className="text-zinc-700">vs</span>
                <span className="text-zinc-500">{notification.metric.baseline}</span>
                {notification.metric.unit && (
                  <span className="text-zinc-700 normal-case font-bold">
                    {notification.metric.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL / 1000);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [showAcked, setShowAcked] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate acked from localStorage on mount
  useEffect(() => {
    setAcked(getAcked());
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/notifications"));
      if (!res.ok) throw new Error("Failed to fetch");
      const json: ApiResponse = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setCountdown(AUTO_REFRESH_INTERVAL / 1000);
    } catch (err) {
      logger.error("[Notifications] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    fetchData();

    refreshRef.current = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return AUTO_REFRESH_INTERVAL / 1000;
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function handleAcknowledge(id: string) {
    const next = new Set(acked);
    next.add(id);
    setAcked(next);
    saveAcked(next);
  }

  function handleClearAll() {
    const allIds = new Set(
      (data?.notifications ?? []).map((n) => n.id)
    );
    const next = new Set([...acked, ...allIds]);
    setAcked(next);
    saveAcked(next);
  }

  function handleRestoreAll() {
    const emptyAcked = new Set<string>();
    setAcked(emptyAcked);
    saveAcked(emptyAcked);
  }

  const notifications = data?.notifications ?? [];
  const summary = data?.summary;

  const unacked = notifications.filter((n) => !acked.has(n.id));
  const ackedList = notifications.filter((n) => acked.has(n.id));

  const criticals = unacked.filter((n) => n.type === "critical");
  const warnings = unacked.filter((n) => n.type === "warning");
  const infos = unacked.filter((n) => n.type === "info");

  const displayedNotifications = showAcked ? notifications : unacked;

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">
                Anomaly Detection Layer
              </span>
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              Notification Center
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-base max-w-xl">
              זיהוי אנומליות אוטומטי: עומסי תנועה, חריגות עלות, גלי הרשמות, ומעקב אחר משתמשי Pro.
            </p>

            {/* Auto-refresh indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/5">
                <Zap className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">
                  רענון אוטומטי בעוד
                </span>
                <span className="text-[10px] font-black text-emerald-400 tabular-nums">
                  {countdown}s
                </span>
              </div>
              {lastRefresh && (
                <div className="flex items-center gap-1.5 text-zinc-700 text-[10px] font-bold">
                  <Clock className="w-3 h-3" />
                  עודכן: {fmtTime(lastRefresh.toISOString())}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 self-start md:self-auto">
            {unacked.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <X className="w-3.5 h-3.5" />
                סגור הכל
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh Now
            </button>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <SummaryCard
              icon={AlertCircle}
              value={summary.critical}
              label="התראות קריטיות"
              color="rose"
              sub="Critical alerts"
            />
            <SummaryCard
              icon={AlertTriangle}
              value={summary.warning}
              label="אזהרות"
              color="amber"
              sub="Warning alerts"
            />
            <SummaryCard
              icon={Info}
              value={summary.info}
              label="הודעות מידע"
              color="blue"
              sub="Informational"
            />
            <HealthGauge score={summary.healthScore} />
          </div>
        )}

        {/* ── Notification Feed ─────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Feed header + toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border text-amber-400 bg-amber-500/10 border-amber-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Anomaly Feed
                </h2>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                  {loading
                    ? "טוען נתונים..."
                    : `${unacked.length} פעילים · ${ackedList.length} סגורים`}
                </p>
              </div>
            </div>

            {ackedList.length > 0 && (
              <button
                onClick={() => setShowAcked((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300 text-[9px] font-black uppercase tracking-wider transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {showAcked ? "הסתר סגורים" : `הצג סגורים (${ackedList.length})`}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 rounded-[36px] border border-white/5 bg-zinc-950/50">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-500/30" />
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                Analyzing System Anomalies...
              </span>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 rounded-[36px] border border-emerald-500/20 bg-emerald-500/5">
              <ShieldCheck className="w-12 h-12 text-emerald-500/40" />
              <span className="text-sm font-black text-emerald-600">
                כל ההתראות נסגרו
              </span>
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                No active notifications
              </span>
              {ackedList.length > 0 && (
                <button
                  onClick={handleRestoreAll}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300 text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  שחזר הכל
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Critical section */}
              {criticals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.25em]">
                        Critical — {criticals.length}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-rose-500/10" />
                  </div>
                  {criticals.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      acknowledged={acked.has(n.id)}
                      onAcknowledge={handleAcknowledge}
                    />
                  ))}
                </div>
              )}

              {/* Warning section */}
              {warnings.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.25em]">
                        Warnings — {warnings.length}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-amber-500/10" />
                  </div>
                  {warnings.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      acknowledged={acked.has(n.id)}
                      onAcknowledge={handleAcknowledge}
                    />
                  ))}
                </div>
              )}

              {/* Info section */}
              {infos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.25em]">
                        Informational — {infos.length}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-blue-500/10" />
                  </div>
                  {infos.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      acknowledged={acked.has(n.id)}
                      onAcknowledge={handleAcknowledge}
                    />
                  ))}
                </div>
              )}

              {/* Acknowledged items (when showAcked is true) */}
              {showAcked && ackedList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-600" />
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                        Acknowledged — {ackedList.length}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  {ackedList.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      acknowledged={true}
                      onAcknowledge={handleAcknowledge}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Last generated ────────────────────────────────────────────────── */}
        {summary && (
          <div className="flex items-center justify-center gap-2 text-[9px] font-black text-zinc-800 uppercase tracking-widest pt-4">
            <CheckCircle className="w-3 h-3" />
            ניתוח אנומליות נוצר ב: {fmtDateTime(summary.generatedAt)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
