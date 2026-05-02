"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonalPrompt } from "@/lib/types";
import type { GraphInsights, InsightFilter } from "./graph-utils";

interface GraphInsightOverlayProps {
  insights: GraphInsights;
  dailyPick: PersonalPrompt | null;
  onFilter: (filter: InsightFilter) => void;
  onOpenDailyPick: (p: PersonalPrompt) => void;
  onDismiss: () => void;
}

export function GraphInsightOverlay({
  insights,
  dailyPick,
  onFilter,
  onOpenDailyPick,
  onDismiss,
}: GraphInsightOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-in fade-in duration-300"
      dir="rtl"
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-serif text-white">✨ הספרייה שלך היום</h2>
          <button
            onClick={onDismiss}
            className="p-1 -m-1 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Daily pick */}
        {dailyPick && (
          <button
            onClick={() => {
              onOpenDailyPick(dailyPick);
              onDismiss();
            }}
            className="w-full mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors text-right cursor-pointer"
          >
            <span className="text-xl shrink-0">💎</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-amber-400 font-semibold mb-0.5">
                פרומפט שכדאי לגלות מחדש
              </div>
              <div className="text-sm text-white truncate">{dailyPick.title}</div>
            </div>
          </button>
        )}

        {/* Insight filter cards */}
        <div className="flex flex-col gap-2">
          <InsightCard
            icon="📬"
            count={insights.underusedCount}
            label="פרומפטים שלא השתמשת בהם 30 יום"
            filter="underused"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
          <InsightCard
            icon="🔵"
            count={insights.clusterCount}
            label="אשכולות שגילית בספרייה שלך"
            filter="clusters"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
          <InsightCard
            icon="⚠️"
            count={insights.lowScoreCount}
            label="פרומפטים עם ציון נמוך מ-60"
            filter="low_score"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
          <InsightCard
            icon="🕐"
            count={insights.recentCount}
            label="פרומפטים בהם השתמשת השבוע"
            filter="recent"
            onFilter={onFilter}
            onDismiss={onDismiss}
          />
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full mt-4 py-2.5 rounded-xl border border-white/15 text-sm text-slate-300 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
        >
          צלול לגרף ←
        </button>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  count,
  label,
  filter,
  onFilter,
  onDismiss,
}: {
  icon: string;
  count: number;
  label: string;
  filter: InsightFilter;
  onFilter: (f: InsightFilter) => void;
  onDismiss: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      onClick={() => {
        if (!disabled) {
          onFilter(filter);
          onDismiss();
        }
      }}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-colors w-full",
        disabled
          ? "border-white/8 bg-white/3 opacity-50 cursor-not-allowed"
          : "border-white/12 bg-white/6 hover:bg-white/12 hover:border-white/20 cursor-pointer",
      )}
    >
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">
          <span className="font-bold text-amber-400">{count}</span> {label}
        </span>
      </div>
    </button>
  );
}
