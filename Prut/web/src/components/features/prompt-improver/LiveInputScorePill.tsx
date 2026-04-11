"use client";

import { useState } from "react";
import { Sparkles, Info, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputScore, InputScoreLevel } from "@/lib/engines/scoring/input-scorer";

const DOMAIN_LABELS: Record<string, string> = {
  technical: '💻 טכני',
  content: '✍️ תוכן',
  creative: '🎨 יצירתי',
  research: '🔍 מחקר',
  instruction: '📋 הוראות',
};

interface LiveInputScorePillProps {
  score: InputScore | null;
  onOpenBreakdown: () => void;
}

const LEVEL_STYLES: Record<InputScoreLevel, { chip: string; ring: string; icon: string }> = {
  empty: {
    chip: "bg-[var(--glass-bg)] text-[var(--text-muted)] border-[var(--glass-border)]",
    ring: "",
    icon: "text-[var(--text-muted)]",
  },
  low: {
    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30",
    ring: "hover:ring-2 hover:ring-rose-500/30",
    icon: "text-rose-500",
  },
  medium: {
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    ring: "hover:ring-2 hover:ring-amber-500/30",
    icon: "text-amber-500",
  },
  high: {
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    ring: "hover:ring-2 hover:ring-emerald-500/30",
    icon: "text-emerald-500",
  },
  elite: {
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    ring: "hover:ring-2 hover:ring-violet-500/30",
    icon: "text-violet-500",
  },
};

/**
 * Compact live-scoring pill rendered next to the Enhance button. Shows:
 *   - 0-100 score + Hebrew level label
 *   - Top missing item (inline)
 *   - Click → opens InputScoreBreakdown drawer
 *
 * Returns null when the prompt is empty (level === 'empty') to avoid
 * cluttering the UI before the user starts typing.
 */
export function LiveInputScorePill({ score, onOpenBreakdown }: LiveInputScorePillProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!score || score.level === "empty") return null;

  const style = LEVEL_STYLES[score.level];
  const topMissing = score.missingTop[0];
  const topStrength = score.strengths[0];
  const tooltipItems = score.missingTop.slice(0, 3);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpenBreakdown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`ציון פרומפט: ${score.total} מתוך 100, ${score.label}. לחץ לפירוק מלא.`}
        className={cn(
          "group inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer",
          "text-xs md:text-sm font-semibold shrink-0 max-w-full",
          "focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
          style.chip,
          style.ring
        )}
        dir="rtl"
      >
      <span className={cn("relative flex items-center justify-center", style.icon)}>
        {score.level === "elite" ? (
          <Sparkles className="w-4 h-4" />
        ) : score.level === "high" ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
      </span>

      <span className="flex items-baseline gap-1.5 shrink-0">
        <span className="font-black tabular-nums text-sm md:text-base">{score.total}</span>
        <span className="opacity-70 text-[10px] md:text-xs">/100</span>
        <span className="opacity-80">· {score.label}</span>
        {score.domain && DOMAIN_LABELS[score.domain] && (
          <span className="hidden md:inline opacity-60 text-[10px] border-s border-current/20 ps-1.5">
            {DOMAIN_LABELS[score.domain]}
          </span>
        )}
      </span>

      {topMissing && (
        <span className="hidden md:inline opacity-80 truncate max-w-[180px] border-s border-current/20 ps-2">
          {topMissing.title}
        </span>
      )}

      {topStrength && !topMissing && (
        <span className="hidden md:inline opacity-80 truncate max-w-[180px] border-s border-current/20 ps-2">
          ✓ {topStrength}
        </span>
      )}

      <Info className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>

      {/* Desktop hover tooltip — top 3 missing items */}
      {showTooltip && tooltipItems.length > 0 && (
        <div
          className="hidden md:block absolute top-full mt-2 left-0 right-0 min-w-[260px] z-50 bg-(--bg-primary) border border-(--glass-border) rounded-xl shadow-lg p-3 space-y-2"
          dir="rtl"
        >
          <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider mb-1">מה ישפר את הציון</p>
          {tooltipItems.map((item) => (
            <div key={item.key} className="text-xs">
              <span className="font-semibold text-(--text-primary)">{item.title}</span>
              {item.why && (
                <span className="text-(--text-muted)"> — {item.why.slice(0, 80)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
