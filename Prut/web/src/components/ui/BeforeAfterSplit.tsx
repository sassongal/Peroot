"use client";

import { ReactNode, useState } from 'react';
import { Check } from 'lucide-react';
import { ScoreDelta } from './ScoreDelta';
import { cn } from '@/lib/utils';

type Mode = 'tabs' | 'split';

interface BeforeAfterSplitProps {
  original: string;
  enhanced: string;
  /**
   * Optional pre-rendered React node for the "after" view. When provided
   * it replaces the plain-text `enhanced` string in the display, but the
   * string is still used for the score row, export/copy buttons, and the
   * "before" tab fallback. Callers use this to inject styled placeholder
   * chips and filled-value marks without losing copy/export fidelity.
   */
  enhancedNode?: ReactNode;
  mode?: Mode;
  score?: { before: number | null; after: number; improvements?: string[] };
  className?: string;
}

const PANE_BASE =
  'p-6 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto';

export function BeforeAfterSplit({
  original,
  enhanced,
  enhancedNode,
  mode = 'tabs',
  score,
  className,
}: BeforeAfterSplitProps) {
  // Prefer the pre-rendered node when provided (Variables-Panel-aware
  // rendering with chips for placeholders). Otherwise fall back to the
  // plain string, which is what existing call sites and tests expect.
  const enhancedDisplay: ReactNode = enhancedNode ?? enhanced;
  const hasOriginal = original.trim().length > 0;
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');

  return (
    <div className={cn('flex flex-col gap-3', className)} dir="rtl">
      {score && (
        <div className="flex items-center gap-3 flex-wrap">
          <ScoreDelta before={score.before} after={score.after} />
          {score.improvements && score.improvements.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              {score.improvements.slice(0, 3).map((line, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/*
        Visual hierarchy: "אחרי" is the hero (active by default, brand-tinted),
        "לפני" is muted text-only with no background — present but never competing.
        See feedback memory: feedback_before_after_emphasis.md
      */}
      {mode === 'tabs' && hasOriginal && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('after')}
            aria-pressed={activeTab === 'after'}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors',
              activeTab === 'after'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            )}
          >
            אחרי
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('before')}
            aria-pressed={activeTab === 'before'}
            className={cn(
              'px-2 py-1 rounded-full text-[11px] font-normal border transition-colors',
              activeTab === 'before'
                ? 'text-[var(--text-secondary)] border-[var(--glass-border)]'
                : 'text-[var(--text-muted)] border-transparent opacity-70 hover:opacity-100'
            )}
          >
            לפני
          </button>
        </div>
      )}

      {mode === 'split' ? (
        <div
          className={cn(
            'grid gap-3 items-start',
            hasOriginal ? 'grid-cols-1 md:grid-cols-[1fr_2fr]' : 'grid-cols-1'
          )}
        >
          {hasOriginal && (
            <div className="rounded-lg bg-[var(--glass-bg)]/40 opacity-60">
              <div className="px-3 pt-2 text-[9px] font-normal uppercase tracking-wider text-[var(--text-muted)]">
                לפני
              </div>
              <div className={cn(PANE_BASE, 'text-xs text-[var(--text-muted)]')}>
                {original}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] shadow-sm">
            <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              אחרי
            </div>
            <div className={cn(PANE_BASE, 'text-base text-[var(--text-primary)]')}>
              {enhancedDisplay}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-xl transition-all',
            activeTab === 'after'
              ? 'border border-amber-500/30 bg-amber-500/[0.04] shadow-sm'
              : 'border border-[var(--glass-border)] bg-[var(--glass-bg)]/40 opacity-70'
          )}
        >
          <div
            className={cn(
              PANE_BASE,
              activeTab === 'after'
                ? 'text-base text-[var(--text-primary)]'
                : 'text-sm text-[var(--text-muted)]'
            )}
          >
            {hasOriginal && activeTab === 'before' ? original : enhancedDisplay}
          </div>
        </div>
      )}
    </div>
  );
}
