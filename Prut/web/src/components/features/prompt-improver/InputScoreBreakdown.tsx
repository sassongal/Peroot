"use client";

import { useEffect, useMemo } from "react";
import { X, Check, AlertCircle, Lightbulb, Sparkles, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InputScore,
  InputScoreDimension,
  InputScoreLevel,
  InputScoreMissing,
} from "@/lib/engines/scoring/input-scorer";
import { analyzeCoverage } from "@/lib/engines/scoring/coverage-analyzer";

interface InputScoreBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  score: InputScore | null;
  /** The raw input text — used for coverage analysis when drawer is open */
  inputText?: string;
}

/**
 * Bottom-sheet (mobile) / right-panel (desktop) drawer that shows the full
 * InputScore breakdown when the user taps the LiveInputScorePill.
 *
 * Contrast rules (explicit, not glass):
 *  - Light mode → solid white panel with dark slate text (WCAG AA).
 *  - Dark  mode → solid slate-900 panel with light slate text.
 * No CSS-variable glass backgrounds inside the panel body, so the drawer
 * remains legible regardless of the underlying page background.
 */
export function InputScoreBreakdown({ isOpen, onClose, score, inputText }: InputScoreBreakdownProps) {
  // Compute coverage lazily — only when drawer is open
  const coverage = useMemo(() => {
    if (!isOpen || !inputText || !score) return null;
    return analyzeCoverage(inputText, score.mode);
  }, [isOpen, inputText, score]);
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

  // Level pill colors — AA contrast in both themes.
  const levelColor: Record<InputScoreLevel, string> = {
    empty:
      "text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700/60 border-slate-300 dark:border-slate-600",
    low:
      "text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40",
    medium:
      "text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40",
    high:
      "text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40",
    elite:
      "text-violet-800 dark:text-violet-200 bg-violet-100 dark:bg-violet-500/20 border-violet-300 dark:border-violet-500/40",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="פירוק ציון לייב"
      className="fixed inset-0 z-100 flex items-end md:items-center md:justify-end"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — solid surface, AA contrast in both themes */}
      <div
        className={cn(
          "relative bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-slate-700",
          "w-full md:w-[480px] md:max-w-[90vw] md:h-full",
          "max-h-[90vh] md:max-h-none overflow-hidden",
          "rounded-t-[28px] md:rounded-t-none md:rounded-s-[28px]",
          "flex flex-col shadow-2xl",
          "animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
        )}
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-50">
                ציון לייב · לפני שדרוג
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 tabular-nums">
                {score.total}
              </span>
              <span className="text-base md:text-lg text-slate-500 dark:text-slate-400">/100</span>
              <span
                className={cn(
                  "px-2.5 md:px-3 py-1 rounded-full text-xs font-bold border",
                  levelColor[score.level]
                )}
              >
                {score.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:outline-none"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Strengths */}
          {score.strengths.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                מה עובד
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {score.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
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
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
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

          {/* Coverage indicator */}
          {coverage && coverage.totalChunks >= 2 && (
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Layers className="w-3 h-3" />
                כיסוי טקסט
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      coverage.coverageRatio >= 0.7 ? "bg-emerald-500" : coverage.coverageRatio >= 0.5 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${Math.round(coverage.coverageRatio * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                  {Math.round(coverage.coverageRatio * 100)}%
                </span>
              </div>
              {coverage.tip && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic flex items-start gap-1.5">
                  <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {coverage.tip}
                </p>
              )}
            </div>
          )}

          {/* Per-dimension breakdown */}
          <div className="px-6 py-4 space-y-4">
            <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
    <li className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30">
      <div className="flex items-start gap-2">
        <AlertCircle
          className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{item.title}</div>
          {item.why && (
            <div className="text-xs text-slate-700 dark:text-slate-300">{item.why}</div>
          )}
          {item.example && (
            <div className="mt-1.5 text-xs text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-500/15 rounded-lg px-2.5 py-1.5 border border-amber-300 dark:border-amber-500/30">
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
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{dim.label}</span>
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
          {dim.score}/{dim.max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
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
              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
            >
              ✓ {m}
            </span>
          ))}
          {dim.missing.slice(0, 3).map((m, i) => (
            <span
              key={`x-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/30"
            >
              ✗ {m}
            </span>
          ))}
        </div>
      )}
      {dim.tip && dim.score < dim.max && (
        <div className="text-[11px] text-slate-600 dark:text-slate-400 italic flex items-start gap-1.5">
          <Lightbulb
            className="w-3 h-3 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          {dim.tip}
        </div>
      )}
    </div>
  );
}
