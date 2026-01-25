"use client";

import { Trash2, History, ArrowRight, Plus, Copy, Search, Filter } from "lucide-react";
import { HistoryItem } from "@/hooks/useHistory";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  history: HistoryItem[];
  isLoaded: boolean;
  onClear: () => void;
  onRestore: (item: HistoryItem) => void;
  onSaveToPersonal: (item: HistoryItem) => void; // Fixed: passing item directly
  onCopy: (text: string) => void;
}

export function HistoryPanel({
  history,
  isLoaded,
  onClear,
  onRestore,
  onSaveToPersonal,
  onCopy
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
      const matchesSearch = 
        item.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.enhanced.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [history, searchQuery, selectedCategory]);

  return (
    <div className="glass-card rounded-xl p-6 border-white/10 bg-white/[0.02] flex flex-col h-full">
      <div className="flex flex-col items-center gap-4 mb-6 pt-2">
        <h2 className="text-2xl font-serif text-white tracking-wide">היסטוריה</h2>
        <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
      </div>

      <div className="space-y-4 mb-6 relative z-10">
        <div className="relative group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
          <input
            type="text"
            placeholder="חיפוש בהיסטוריה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all shadow-inner"
            dir="rtl"
          />
        </div>

        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pr-9 pl-3 text-xs text-slate-300 appearance-none focus:outline-none focus:border-amber-500/30 transition-all cursor-pointer"
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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-medium"
                    title="נקה היסטוריה"
                >
                    <Trash2 className="w-3 h-3" />
                    נקה
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 opacity-0 h-0 overflow-hidden">
          <History className="w-3 h-3" />
          היסטוריה
        </div>
        {!isLoaded && (
          <div className="text-xs text-slate-500 text-center py-6">טוען היסטוריה...</div>
        )}
        {isLoaded && history.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-6">אין פרומפטים בהיסטוריה</div>
        )}
        {isLoaded && history.length > 0 && filteredHistory.length === 0 && (
           <div className="text-xs text-slate-500 text-center py-6">לא נמצאו תוצאות לחיפוש</div>
        )}
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
              <span className="text-[10px] text-slate-500" suppressHydrationWarning>
                {hasHydrated ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: he }) : "..."}
              </span>
            </div>
            <p className="text-sm text-slate-200 mt-2 leading-relaxed max-h-16 overflow-hidden" dir="rtl">
              {item.original}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onRestore(item)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white text-black text-xs hover:bg-slate-200 transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                שחזר
              </button>
              <button
                onClick={() => onSaveToPersonal(item)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                שמור לאישי
              </button>
              <button
                onClick={() => onCopy(item.enhanced)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors"
              >
                <Copy className="w-3 h-3" />
                העתק פלט
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
