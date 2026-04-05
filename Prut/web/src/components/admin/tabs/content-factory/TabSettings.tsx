"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Trash2,
  RefreshCw,
  BarChart2,
  Clock,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Save,
  Bookmark,
} from "lucide-react";
import type { ContentFactoryStats, Preset, CronSettings } from "./types";
import { DAYS_HE, CATEGORY_COLORS } from "./types";
import { SectionTitle } from "./shared";

// ── Tab 4: Settings ───────────────────────────────────────────────────────────

export function TabSettings({ stats }: { stats: ContentFactoryStats | null }) {
  const [cronSettings, setCronSettings] = useState<CronSettings>({
    enabled: false,
    day: 1,
    hour: 9,
    draftExpiryDays: 30,
    categoryTargets: {},
  });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cf_cron");
    if (saved) { try { setCronSettings(JSON.parse(saved)); } catch { /* ignore */ } }
    const savedPresets = localStorage.getItem("cf_presets");
    if (savedPresets) { try { setPresets(JSON.parse(savedPresets)); } catch { /* ignore */ } }
    if (stats?.categories) {
      setCronSettings((prev) => {
        const targets = { ...prev.categoryTargets };
        for (const cat of stats.categories) { if (!(cat in targets)) targets[cat] = 20; }
        return { ...prev, categoryTargets: targets };
      });
    }
  }, [stats]);

  const saveSettings = () => {
    setSaving(true);
    localStorage.setItem("cf_cron", JSON.stringify(cronSettings));
    setTimeout(() => { setSaving(false); toast.success("הגדרות נשמרו"); }, 400);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("cf_presets", JSON.stringify(updated));
    toast.success("פרסט נמחק");
  };

  const maxCategoryCount = Math.max(...(stats?.categoryBalance ?? []).map((c) => c.count), 1);
  const inputCls = "bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500/40 transition-colors";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Cron settings */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-6">
        <SectionTitle icon={Clock} color="blue" title="Cron שבועי" sub="Automatic content generation schedule" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
            <div>
              <p className="text-sm font-black text-white">הפעל ייצור אוטומטי</p>
              <p className="text-[10px] text-zinc-600 font-bold mt-0.5">{cronSettings.enabled ? "פעיל" : "כבוי"}</p>
            </div>
            <button onClick={() => setCronSettings((prev) => ({ ...prev, enabled: !prev.enabled }))} className="text-zinc-400 hover:text-white transition-colors">
              {cronSettings.enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">יום בשבוע</label>
            <select
              value={cronSettings.day}
              onChange={(e) => setCronSettings((prev) => ({ ...prev, day: Number(e.target.value) }))}
              disabled={!cronSettings.enabled}
              className={cn(inputCls, "disabled:opacity-40")}
            >
              {DAYS_HE.map((day, i) => <option key={i} value={i}>יום {day}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">שעה</label>
            <select
              value={cronSettings.hour}
              onChange={(e) => setCronSettings((prev) => ({ ...prev, hour: Number(e.target.value) }))}
              disabled={!cronSettings.enabled}
              className={cn(inputCls, "disabled:opacity-40")}
            >
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">פג תוקף טיוטות (ימים)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={cronSettings.draftExpiryDays}
              onChange={(e) => setCronSettings((prev) => ({ ...prev, draftExpiryDays: Number(e.target.value) }))}
              className={inputCls}
            />
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-black text-[11px] uppercase tracking-widest hover:from-amber-500 hover:to-amber-400 transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-amber-600/20"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "שומר..." : "שמור הגדרות"}
        </button>
      </div>

      {/* Category balance targets */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-6">
        <SectionTitle icon={BarChart2} color="emerald" title="יעדי קטגוריות" sub="Content distribution targets" />
        {(!stats?.categoryBalance || stats.categoryBalance.length === 0) ? (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center py-6">אין קטגוריות זמינות</p>
        ) : (
          <div className="space-y-4">
            {stats.categoryBalance.map((cat, i) => {
              const pct = Math.round((cat.count / maxCategoryCount) * 100);
              const target = cronSettings.categoryTargets[cat.name] ?? cat.target ?? 20;
              const isLow = cat.count < target * 0.5;
              return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="text-sm font-bold text-zinc-300 truncate">{cat.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", CATEGORY_COLORS[i % CATEGORY_COLORS.length])}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-zinc-500 w-8 text-left tabular-nums">{cat.count}</span>
                    <span className="text-zinc-700 text-[11px]">/</span>
                    <input
                      type="number"
                      min={0}
                      value={target}
                      onChange={(e) => setCronSettings((prev) => ({ ...prev, categoryTargets: { ...prev.categoryTargets, [cat.name]: Number(e.target.value) } }))}
                      className="w-16 bg-zinc-900 border border-white/5 text-white rounded-xl px-2 py-1.5 text-[11px] font-black text-center focus:outline-none focus:border-amber-500/40 transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Presets management */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-5">
        <SectionTitle icon={Bookmark} color="amber" title="ניהול פרסטים" sub="Saved generation presets" />
        {presets.length === 0 ? (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center py-6">אין פרסטים שמורים. צור אחד בלשונית יצירה.</p>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{preset.name}</p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                    {preset.type === "blog" ? "פוסט בלוג" : "פרומפטים"}
                    {preset.topic && ` · ${preset.topic}`}
                    {preset.category && ` · ${preset.category}`}
                  </p>
                </div>
                <button onClick={() => deletePreset(preset.id)} className="p-2 rounded-xl text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
