"use client";

import { Trash2, History, ArrowRight, Plus, Copy, Search, Filter, Clock } from "lucide-react";
import { HistoryItem } from "@/hooks/useHistory";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// Category color mapping for inline-start border accent stripes (RTL-safe logical property)
const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "border-s-rose-500",
  Sales: "border-s-orange-500",
  CustomerSupport: "border-s-teal-500",
  Product: "border-s-blue-500",
  Operations: "border-s-slate-400",
  HR: "border-s-pink-500",
  Dev: "border-s-emerald-500",
  Education: "border-s-indigo-500",
  Legal: "border-s-gray-400",
  Creative: "border-s-purple-500",
  Social: "border-s-sky-500",
  General: "border-s-amber-500",
  Finance: "border-s-green-500",
  Healthcare: "border-s-red-400",
  Ecommerce: "border-s-yellow-500",
  RealEstate: "border-s-stone-400",
  Strategy: "border-s-violet-500",
  Design: "border-s-fuchsia-500",
  Data: "border-s-cyan-500",
  Automation: "border-s-lime-500",
  Community: "border-s-amber-400",
  Nonprofit: "border-s-emerald-400",
  None: "border-s-white/20",
};

interface HistoryPanelProps {
  history: HistoryItem[];
  isLoaded: boolean;
  onClear: () => void;
  onRestore: (item: HistoryItem) => void;
  onSaveToPersonal: (item: HistoryItem) => void;
  onCopy: (text: string) => void;
  onStartNew?: () => void;
}

export function HistoryPanel({
  history,
  isLoaded,
  onClear,
  onRestore,
  onSaveToPersonal,
  onCopy,
  onStartNew,
}: HistoryPanelProps) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    queueMicrotask(() => setHasHydrated(true));
  }, []);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(history.map(item => item.category));
    return Array.from(cats);
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.original.toLowerCase().includes(q) ||
        item.enhanced.toLowerCase().includes(q) ||
        (item.title?.toLowerCase().includes(q) ?? false);
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [history, searchQuery, selectedCategory]);

  return (
    <div className="glass-card rounded-xl p-6 border-white/10 bg-white/[0.02] flex flex-col h-full">
      <div className="flex flex-col items-center gap-4 mb-6 pt-2">
        <h2 className="text-2xl font-serif text-white tracking-wide">היסטוריה</h2>
        <div className="w-12 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent rounded-full" />
      </div>

      <div className="space-y-4 mb-6 relative z-10">
        <div className="relative group">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="חיפוש בהיסטוריה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pe-10 ps-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40 focus:bg-white/10 transition-all shadow-inner"
            dir="rtl"
          />
        </div>

        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Filter className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pe-9 ps-3 text-xs text-slate-300 appearance-none focus:outline-none focus:border-amber-500/40 transition-all cursor-pointer"
                    dir="rtl"
                >
                    <option value="all">כל הקטגוריות</option>
                    {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                    ))}
                </select>
            </div>

            {history.length > 0 && (
                <button
                    onClick={onClear}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                    title="נקה היסטוריה"
                >
                    <Trash2 className="w-3 h-3" />
                    נקה
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pe-1">
        {/* 5.1 Glass-card skeleton with content placeholder rows */}
        {!isLoaded && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-4 animate-pulse border-s-2 border-s-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-white/10 rounded-full w-16" />
                  <div className="h-3 bg-white/10 rounded w-12" />
                </div>
                <div className="h-3 bg-white/10 rounded w-full mb-2" />
                <div className="h-3 bg-white/10 rounded w-4/5 mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 bg-white/10 rounded-md w-14" />
                  <div className="h-6 bg-white/10 rounded-md w-18" />
                  <div className="h-6 bg-white/10 rounded-md w-16" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* 5.3 Rich empty state with CTA */}
        {isLoaded && history.length === 0 && (
          <div className="flex flex-col items-center gap-4 text-center py-12 glass-card rounded-2xl px-8 animate-in fade-in duration-500" dir="rtl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-500/50" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-300">עוד לא שדרגת פרומפטים</p>
              <p className="text-sm text-slate-500">הפרומפטים המשודרגים שלך יופיעו כאן</p>
            </div>
            {onStartNew && (
              <button
                onClick={onStartNew}
                className="mt-1 px-6 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                נתחיל?
              </button>
            )}
          </div>
        )}

        {isLoaded && history.length > 0 && filteredHistory.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-6">לא נמצאו תוצאות לחיפוש</div>
        )}

        {filteredHistory.map((item, index) => {
          const categoryColor = CATEGORY_COLORS[item.category] || "border-s-white/20";
          const isFirst = index === 0;

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-all border-s-2 cursor-pointer",
                categoryColor,
                isFirst && "border-white/20 bg-white/[0.03]"
              )}
              onClick={() => onRestore(item)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border text-slate-400",
                    isFirst ? "border-amber-500/30 text-amber-400/80" : "border-white/10"
                  )}>
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  {item.source === "extension" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      Extension
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500" suppressHydrationWarning>
                  {hasHydrated ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: he }) : "..."}
                </span>
              </div>
              {item.title && (
                <p className="text-sm font-bold text-white mt-2" dir="rtl">
                  {item.title}
                </p>
              )}
              <p className={cn("text-sm text-slate-200 leading-relaxed max-h-16 overflow-hidden", item.title ? "mt-1 text-xs text-slate-400" : "mt-2")} dir="rtl">
                {item.original}
              </p>
              <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onRestore(item)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md accent-gradient text-black text-xs hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <ArrowRight className="w-3 h-3" />
                  שחזר
                </button>
                <button
                  onClick={() => onSaveToPersonal(item)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Plus className="w-3 h-3" />
                  שמור לאישי
                </button>
                <button
                  onClick={() => onCopy(item.enhanced)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Copy className="w-3 h-3" />
                  העתק פלט
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
