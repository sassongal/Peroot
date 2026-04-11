"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Factory,
  BarChart2,
  Settings,
  Layers,
  RefreshCw,
} from "lucide-react";
import type { TabKey, ContentFactoryStats, PendingItem } from "./types";
import { InnerTabBtn } from "./shared";
import { TabCreation } from "./TabCreation";
import { TabPerformance } from "./TabPerformance";
import { TabContent } from "./TabContent";
import { TabSettings } from "./TabSettings";

// ── Main Export ───────────────────────────────────────────────────────────────

export function ContentFactoryTab() {
  const [activeTab, setActiveTab] = useState<TabKey>("creation");
  const [stats, setStats] = useState<ContentFactoryStats | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawPendingData, setRawPendingData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(getApiPath("/api/admin/content-factory"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: {
        stats: ContentFactoryStats;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingBlogs: any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingPrompts: any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        history: any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categories: any[];
      } = await res.json();
      setStats(data.stats ?? null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawMap: Record<string, any> = {};
      for (const b of data.pendingBlogs ?? []) rawMap[b.id] = { ...b, _type: "blog" };
      for (const p of data.pendingPrompts ?? []) rawMap[p.id] = { ...p, _type: "prompt" };
      setRawPendingData(rawMap);

      const combinedPending: PendingItem[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(data.pendingBlogs ?? []).map((b: any) => ({ id: b.id, type: "blog" as const, title: b.title, category: b.category ?? "", created_at: b.created_at })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(data.pendingPrompts ?? []).map((p: any) => ({ id: p.id, type: "prompt" as const, title: p.title, category: p.category_id ?? "", created_at: p.created_at })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPending(combinedPending);
    } catch {
      toast.error("שגיאה בטעינת נתוני Content Factory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "creation", label: "יצירה", icon: Factory, badge: pending.length },
    { key: "performance", label: "ביצועים", icon: BarChart2 },
    { key: "content", label: "תוכן", icon: Layers },
    { key: "settings", label: "הגדרות", icon: Settings },
  ];

  return (
    <div dir="rtl" className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-zinc-950/50 p-8 rounded-[40px] border border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-amber-600/4 to-transparent pointer-events-none" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Factory className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Content Factory</span>
          </div>
          <h2 className="text-5xl font-black bg-linear-to-l from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter leading-none">מפעל התוכן</h2>
          <p className="text-zinc-500 font-medium tracking-tight text-base max-w-xl">יצירת תוכן AI אוטומטית · ניהול ואישור פוסטים ופרומפטים · מעקב ביצועים</p>
        </div>
        <div className="relative flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/3 border border-white/5 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all hover:border-white/10"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            רענן
          </button>
        </div>
      </div>

      {/* Inner Tab bar */}
      <div className="flex gap-1.5 p-1.5 bg-zinc-950 border border-white/5 rounded-3xl w-fit">
        {tabs.map((tab) => (
          <InnerTabBtn
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.key}
            badge={tab.badge}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[500px]">
        {loading && activeTab === "creation" ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-amber-500/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">טוען נתונים...</span>
          </div>
        ) : (
          <>
            {activeTab === "creation" && <TabCreation stats={stats} pending={pending} rawPendingData={rawPendingData} onRefresh={loadData} />}
            {activeTab === "performance" && <TabPerformance stats={stats} />}
            {activeTab === "content" && <TabContent />}
            {activeTab === "settings" && <TabSettings stats={stats} />}
          </>
        )}
      </div>
    </div>
  );
}
