"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  Mail,
  MailX,
  Users,
  RefreshCw,
  AlertTriangle,
  Zap,
  BellOff,
  ShoppingBag,
  Megaphone,
} from "lucide-react";

interface EmailAutomation {
  onboarding: boolean;
  reengagement: boolean;
  lemonsqueezyLifecycle: boolean;
  newsletterBroadcast: boolean;
}

interface UnsubStats {
  sequenceUnsubscribed: number;
  sequenceActive: number;
  newsletterUnsubscribed: number;
  newsletterActive: number;
}

interface UnsubEntry {
  email: string;
  source: "onboarding" | "newsletter";
  date: string;
}

interface UnsubData {
  automation: EmailAutomation;
  stats: UnsubStats;
  recentUnsubscribes: UnsubEntry[];
}

function AutomationPill({
  label,
  active,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  icon: React.ElementType;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold",
        active
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
          : "bg-zinc-900 border-white/8 text-zinc-500"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span>{label}</span>
      <span className="mr-auto font-black text-[10px] uppercase tracking-wide">
        {active ? "פעיל" : "כבוי"}
      </span>
    </div>
  );
}

export function EmailsTab() {
  const [data, setData] = useState<UnsubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath("/api/admin/unsubscribes"));
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData({
        automation: json.automation ?? {
          onboarding: false,
          reengagement: false,
          lemonsqueezyLifecycle: true,
          newsletterBroadcast: false,
        },
        stats: json.stats,
        recentUnsubscribes: json.recentUnsubscribes ?? [],
      });
    } catch (err) {
      logger.error("[EmailsTab] Error:", err);
      setError("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-red-400">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-bold">{error}</span>
      </div>
    );
  }

  const { stats, recentUnsubscribes, automation } = data;
  const introMuted =
    !automation.onboarding && !automation.reengagement && !automation.newsletterBroadcast;

  return (
    <div className="space-y-8 px-2">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-3",
          introMuted
            ? "bg-zinc-900/50 border-white/10"
            : "bg-amber-500/5 border-amber-500/20"
        )}
      >
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Zap className="w-4 h-4 text-amber-400" />
          מצב משלוח מיילים
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          כאן רואים מה נשלח אוטומטית מהשרת של Peroot. מיילים מ-Lemon Squeezy (חשבוניות,
          אישורי מנוי) נשלחים מהספק ומתועדים בלוגים — לא דרך זרימת האונבורדינג.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <AutomationPill
            label="אונבורדינג (ברוכים הבאים)"
            active={automation.onboarding}
            icon={Mail}
          />
          <AutomationPill
            label="ריאנגייג׳מנט (כבוי כברירת מחדל)"
            active={automation.reengagement}
            icon={BellOff}
          />
          <AutomationPill
            label="מנוי / Churn (Lemon Squeezy)"
            active={automation.lemonsqueezyLifecycle}
            icon={ShoppingBag}
          />
          <AutomationPill
            label="ניוזלטר אוטומטי"
            active={automation.newsletterBroadcast}
            icon={Megaphone}
          />
        </div>
        {!automation.onboarding && (
          <p className="text-[11px] text-amber-200/80 font-bold">
            כדי להפעיל ברוכים הבאים: הגדירו ב-Vercel{" "}
            <code className="text-amber-300/90">ONBOARDING_EMAILS_ENABLED=true</code>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="רצפי אונבורדינג פעילים"
          value={stats.sequenceActive}
          color="blue"
        />
        <StatCard
          icon={MailX}
          label="הסירו מאונבורדינג"
          value={stats.sequenceUnsubscribed}
          color="red"
        />
        <StatCard
          icon={Mail}
          label="מנויי ניוזלטר פעילים"
          value={stats.newsletterActive}
          color="green"
        />
        <StatCard
          icon={MailX}
          label="הסירו מניוזלטר"
          value={stats.newsletterUnsubscribed}
          color="red"
        />
      </div>

      <div className="rounded-2xl border border-white/5 bg-zinc-950 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-white">הסרות אחרונות</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wide">
              אונבורדינג או ניוזלטר · ממוין לפי תאריך
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            aria-label="רענון"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
          </button>
        </div>

        {recentUnsubscribes.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-600 text-sm">
            אין רשומות הסרה עדיין
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {recentUnsubscribes.map((entry, i) => (
              <div
                key={`${entry.source}-${entry.email}-${entry.date}-${i}`}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MailX className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm text-zinc-300 truncate" dir="ltr">
                    {entry.email}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      entry.source === "newsletter"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-blue-500/10 text-blue-400"
                    )}
                  >
                    {entry.source === "newsletter" ? "ניוזלטר" : "אונבורדינג"}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums" dir="ltr">
                    {new Date(entry.date).toLocaleString("he-IL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "red" | "green";
}) {
  const colors = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-950 p-5 space-y-3">
      <div className={cn("inline-flex p-2 rounded-xl border", colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-2xl font-black text-white tabular-nums">{value}</div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mt-1 leading-snug">
          {label}
        </div>
      </div>
    </div>
  );
}
