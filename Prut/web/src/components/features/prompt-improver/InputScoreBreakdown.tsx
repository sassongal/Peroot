"use client";

import { useEffect } from "react";
import { X, Check, AlertCircle, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InputScore,
  InputScoreDimension,
  InputScoreLevel,
  InputScoreMissing,
} from "@/lib/engines/scoring/input-scorer";

interface InputScoreBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  score: InputScore | null;
}

/**
 * Bottom-sheet (mobile) / right-panel (desktop) drawer that shows the full
 * InputScore breakdown when the user taps the LiveInputScorePill. Replicates
 * the layout shell of `ScoreBreakdownDrawer.tsx` but is typed to `InputScore`
 * — which has a mode-dynamic set of dimensions that the post-enhancement
 * drawer doesn't support.
 */
export function InputScoreBreakdown({ isOpen, onClose, score }: InputScoreBreakdownProps) {
  // Escape-to-close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen || !score) return null;

  const levelColor: Record<InputScoreLevel, string> = {
    empty: "text-[var(--text-muted)] bg-[var(--glass-bg)] border-[var(--glass-border)]",
    low: "text-rose-600 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
    medium: "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
    high: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    elite: "text-violet-600 dark:text-violet-300 bg-violet-500/10 border-violet-500/30",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="פירוק ציון לייב"
      className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-end"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative bg-[var(--glass-bg)] border border-[var(--glass-border)]",
          "w-full md:w-[480px] md:max-w-[90vw] md:h-full",
          "max-h-[90vh] md:max-h-none overflow-hidden",
          "rounded-t-[28px] md:rounded-t-none md:rounded-s-[28px]",
          "flex flex-col shadow-2xl",
          "animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
        )}
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/30" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-6 pb-4 border-b border-[var(--glass-border)]">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" aria-hidden="true" />
              <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">
                ציון לייב · לפני שדרוג
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tabular-nums">
                {score.total}
              </span>
              <span className="text-base md:text-lg text-[var(--text-muted)]">/100</span>
              <span className={cn("px-2.5 md:px-3 py-1 rounded-full text-xs font-bold border", levelColor[score.level])}>
                {score.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Strengths */}
          {score.strengths.length > 0 && (
            <div className="px-6 py-4 border-b border-[var(--glass-border)] space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                מה עובד
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {score.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing top (hero section) */}
          {score.missingTop.length > 0 && (
            <div className="px-6 py-4 border-b border-[var(--glass-border)] space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-wider">
                <Lightbulb className="w-3 h-3" />
                איך לשפר עכשיו
              </div>
              <ul className="space-y-2">
                {score.missingTop.map((m) => (
                  <MissingCard key={m.key} item={m} />
                ))}
              </ul>
            </div>
          )}

          {/* Per-dimension breakdown */}
          <div className="px-6 py-4 space-y-4">
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
              פירוק לפי קריטריון
            </div>
            {score.breakdown.map((dim) => (
              <DimensionRow key={dim.key} dim={dim} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissingCard({ item }: { item: InputScoreMissing }) {
  return (
    <li className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
        <div className="flex-1 space-y-1 min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)]">{item.title}</div>
          {item.why && <div className="text-xs text-[var(--text-muted)]">{item.why}</div>}
          {item.example && (
            <div className="mt-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg px-2.5 py-1.5 border border-amber-500/20">
              {item.example}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function DimensionRow({ dim }: { dim: InputScoreDimension }) {
  const pct = dim.max > 0 ? Math.round((dim.score / dim.max) * 100) : 0;
  const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{dim.label}</span>
        <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
          {dim.score}/{dim.max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={dim.score}
          aria-valuemin={0}
          aria-valuemax={dim.max}
          aria-label={`${dim.label}: ${dim.score} מתוך ${dim.max}`}
        />
      </div>
      {(dim.matched.length > 0 || dim.missing.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {dim.matched.slice(0, 4).map((m, i) => (
            <span
              key={`m-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
            >
              ✓ {m}
            </span>
          ))}
          {dim.missing.slice(0, 3).map((m, i) => (
            <span
              key={`x-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
            >
              ✗ {m}
            </span>
          ))}
        </div>
      )}
      {dim.tip && dim.score < dim.max && (
        <div className="text-[11px] text-[var(--text-muted)] italic flex items-start gap-1.5">
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500/60" aria-hidden="true" />
          {dim.tip}
        </div>
      )}
    </div>
  );
}
