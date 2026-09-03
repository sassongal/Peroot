"use client";

import { Calendar, Flame, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UsageStatsState } from "./settings-types";

const MODE_LABELS: Record<string, string> = {
  standard: "שיפור טקסט",
  deep_research: "מחקר מעמיק",
  image_generation: "יצירת תמונות",
  video_generation: "יצירת וידאו",
  agent_builder: "בניית סוכן",
};

interface SettingsStatsSectionProps {
  usageStats: UsageStatsState | null;
}

/**
 * Four counters, one chart, one breakdown. The counters used to carry four
 * different hues; gold now marks the total only (One Gold), the rest sit in
 * the neutral ramp so both themes read the same.
 */
export function SettingsStatsSection({ usageStats }: SettingsStatsSectionProps) {
  const tiles = usageStats
    ? [
        { icon: Sparkles, value: usageStats.totalEnhancements, label: 'סה"כ שיפורים', gold: true },
        { icon: Calendar, value: usageStats.thisMonth, label: "החודש" },
        { icon: TrendingUp, value: usageStats.thisWeek, label: "השבוע" },
        { icon: Flame, value: usageStats.streak, label: "ימים ברצף" },
      ]
    : [];

  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-stats-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-stats-heading" className="text-xl font-bold">
          סטטיסטיקות שימוש
        </h2>
        <p className="text-sm text-(--text-muted)">כמה שיפרתם, מתי, ובאילו מצבים</p>
      </header>

      {usageStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="p-4 bg-(--glass-bg) rounded-xl border border-(--glass-border) text-center"
              >
                <t.icon
                  className={cn(
                    "w-5 h-5 mx-auto mb-2",
                    t.gold ? "text-amber-500" : "text-(--text-muted)",
                  )}
                  aria-hidden="true"
                />
                <p className="text-2xl font-bold font-mono text-(--text-primary)">{t.value}</p>
                <p className="text-xs text-(--text-muted)">{t.label}</p>
              </div>
            ))}
          </div>

          <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-3">
            <h3 className="font-semibold text-(--text-primary) text-sm">
              פעילות בשבעת הימים האחרונים
            </h3>
            <div
              className="flex items-end gap-2 h-24"
              role="img"
              aria-label={`תרשים פעילות שבעה ימים: ${usageStats.recentDays.map((d) => `${new Date(d.date).toLocaleDateString("he-IL", { weekday: "short" })}: ${d.count}`).join(", ")}`}
            >
              {usageStats.recentDays.map((day) => {
                const maxCount = Math.max(...usageStats.recentDays.map((d) => d.count), 1);
                const height = day.count > 0 ? Math.max(12, (day.count / maxCount) * 100) : 4;
                const dayName = new Date(day.date).toLocaleDateString("he-IL", {
                  weekday: "short",
                });
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-(--text-muted)">
                      {day.count || ""}
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all motion-reduce:transition-none",
                        day.count > 0 ? "bg-amber-500/70" : "bg-(--glass-border)",
                      )}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-(--text-muted)">{dayName}</span>
                  </div>
                );
              })}
            </div>
            {usageStats.thisWeek === 0 ? (
              <p className="text-xs text-(--text-muted)">
                שקט השבוע. שיפור אחד היום כבר מתחיל רצף.
              </p>
            ) : null}
          </div>

          {usageStats.topCategories.length > 0 && (
            <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-3">
              <h3 className="font-semibold text-(--text-primary) text-sm">המצבים שבהם השתמשתם</h3>
              <div className="space-y-2">
                {usageStats.topCategories.map((cat) => {
                  const total = usageStats.totalEnhancements || 1;
                  const pct = Math.round((cat.count / total) * 100);
                  const label = MODE_LABELS[cat.category] || cat.category;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-(--text-secondary)">{label}</span>
                        <span className="text-(--text-muted) text-xs font-mono">
                          {cat.count} ({pct}%)
                        </span>
                      </div>
                      <div
                        className="w-full h-2 bg-(--glass-border) rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${label}: ${pct}%`}
                      >
                        <div
                          className="h-full bg-amber-500/70 rounded-full transition-all motion-reduce:transition-none"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" aria-label="טוען" />
        </div>
      )}
    </section>
  );
}
