"use client";

import { Calendar, Loader2, Sparkles, TrendingUp, Zap } from "lucide-react";
import type { UsageStatsState } from "./settings-types";

const MODE_LABELS: Record<string, string> = {
  standard: "שיפור טקסט",
  deep_research: "מחקר מעמיק",
  image_generation: "יצירת תמונות",
  agent_builder: "בניית סוכן",
};

interface SettingsStatsSectionProps {
  usageStats: UsageStatsState | null;
}

export function SettingsStatsSection({ usageStats }: SettingsStatsSectionProps) {
  return (
    <section className="space-y-6 animate-in fade-in duration-300" aria-labelledby="settings-stats-heading">
      <header className="space-y-1">
        <h2 id="settings-stats-heading" className="text-xl font-bold">
          סטטיסטיקות שימוש
        </h2>
        <p className="text-sm text-slate-500">מעקב אחר הפעילות שלך</p>
      </header>

      {usageStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
              <Sparkles className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{usageStats.totalEnhancements}</p>
              <p className="text-xs text-slate-400">סה&quot;כ שיפורים</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
              <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{usageStats.thisMonth}</p>
              <p className="text-xs text-slate-400">החודש</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
              <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{usageStats.thisWeek}</p>
              <p className="text-xs text-slate-400">השבוע</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
              <Zap className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{usageStats.streak}</p>
              <p className="text-xs text-slate-400">ימים ברצף</p>
            </div>
          </div>

          <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-3">
            <h3 className="font-semibold text-white text-sm">פעילות ב-7 ימים אחרונים</h3>
            <div className="flex items-end gap-2 h-24">
              {usageStats.recentDays.map((day) => {
                const maxCount = Math.max(...usageStats.recentDays.map((d) => d.count), 1);
                const height = day.count > 0 ? Math.max(12, (day.count / maxCount) * 100) : 4;
                const dayName = new Date(day.date).toLocaleDateString("he-IL", { weekday: "short" });
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{day.count || ""}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${day.count > 0 ? "bg-amber-500/60" : "bg-white/10"}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-slate-500">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {usageStats.topCategories.length > 0 && (
            <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <h3 className="font-semibold text-white text-sm">מצבים פופולריים</h3>
              <div className="space-y-2">
                {usageStats.topCategories.map((cat) => {
                  const total = usageStats.totalEnhancements || 1;
                  const pct = Math.round((cat.count / total) * 100);
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{MODE_LABELS[cat.category] || cat.category}</span>
                        <span className="text-slate-500 text-xs">
                          {cat.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      )}
    </section>
  );
}
