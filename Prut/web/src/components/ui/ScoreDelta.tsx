"use client";

import { TrendingUp, TrendingDown, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreDeltaProps {
  before: number | null;
  after: number;
  className?: string;
  /**
   * When provided, the pill becomes a button. Clicking opens a breakdown
   * drawer showing per-dimension scores, tips, and strengths/gaps.
   */
  onDrillDown?: () => void;
}

export function ScoreDelta({ before, after, className, onDrillDown }: ScoreDeltaProps) {
  const delta = before === null ? null : after - before;
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  const palette = isNegative
    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    : isPositive
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';

  const Inner = (
    <>
      {isNegative ? (
        <TrendingDown className="w-5 h-5" aria-hidden="true" />
      ) : isPositive ? (
        <TrendingUp className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Sparkles className="w-5 h-5" aria-hidden="true" />
      )}
      {before !== null && (
        <>
          <span className="text-xs opacity-50 font-normal">{before}</span>
          <span className="opacity-40 text-sm" aria-hidden="true">→</span>
        </>
      )}
      <span className="text-2xl font-bold leading-none">{after}</span>
      {delta !== null && delta !== 0 && (
        <span className="text-sm font-semibold opacity-90">
          ({delta > 0 ? '+' : ''}{delta})
        </span>
      )}
      {onDrillDown && (
        <Info className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
      )}
    </>
  );

  const classes = cn(
    'inline-flex items-center gap-2 px-4 py-2 rounded-full border',
    palette,
    onDrillDown && 'cursor-pointer hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none transition-opacity',
    className
  );

  if (onDrillDown) {
    return (
      <button
        type="button"
        onClick={onDrillDown}
        className={classes}
        data-testid="score-delta"
        aria-label={`ציון ${after}. לחץ לפירוק מלא`}
      >
        {Inner}
      </button>
    );
  }

  return (
    <div
      data-testid="score-delta"
      className={classes}
    >
      {Inner}
    </div>
  );
}
