"use client";

import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreDeltaProps {
  before: number | null;
  after: number;
  className?: string;
}

export function ScoreDelta({ before, after, className }: ScoreDeltaProps) {
  const delta = before === null ? null : after - before;
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  // Visual hierarchy: the "after" number is the hero. "before" stays small + dimmed.
  const palette = isNegative
    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    : isPositive
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';

  return (
    <div
      data-testid="score-delta"
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full border',
        palette,
        className
      )}
    >
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
    </div>
  );
}
