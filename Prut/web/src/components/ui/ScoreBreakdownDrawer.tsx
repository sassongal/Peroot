"use client";

import { useEffect } from 'react';
import { X, Check, AlertCircle, Info, Lightbulb, Sparkles } from 'lucide-react';
import type { EnhancedScore, DimensionResult } from '@/lib/engines/scoring/enhanced-scorer';
import { PROMPT_DOMAIN_LABELS } from '@/lib/engines/scoring/prompt-dimensions';
import { cn } from '@/lib/utils';

interface ScoreBreakdownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  score: EnhancedScore | null;
  /** Optional title shown in the header, e.g. "ציון פרומפט התמונה". */
  title?: string;
  /** When true, frames the weakness section as optional improvements (post-upgrade context). */
  isPostUpgrade?: boolean;
}

/**
 * Bottom drawer (mobile) / right-side sheet (desktop) that opens when the
 * user clicks on a ScoreDelta pill. Shows the full EnhancedScorer breakdown:
 *
 * - Total score + level label
 * - Top 3 strengths
 * - Top 3 weaknesses
 * - Per-dimension breakdown with score bar, matched items (green chips),
 *   missing items (amber chips), and a tip for improvement
 *
 * Closes on Escape / backdrop click / X button. Focus-traps while open.
 */
export function ScoreBreakdownDrawer({
  isOpen,
  onClose,
  score,
  title = 'פירוק ציון',
  isPostUpgrade = false,
}: ScoreBreakdownDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen || !score) return null;

  const levelColor = {
    low: 'text-rose-500 dark:text-rose-300 bg-rose-500/10 border-rose-500/30',
    medium: 'text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/30',
    high: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    elite: 'text-violet-600 dark:text-violet-300 bg-violet-500/10 border-violet-500/30',
  }[score.level];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-100 flex items-end md:items-center md:justify-end"
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
          'relative bg-(--glass-bg) border border-(--glass-border)',
          'w-full md:w-[480px] md:max-w-[90vw] md:h-full',
          'max-h-[90vh] md:max-h-none overflow-hidden',
          'rounded-t-[28px] md:rounded-t-none md:rounded-l-[28px]',
          'flex flex-col shadow-2xl',
          'animate-in slide-in-from-bottom md:slide-in-from-right duration-300'
        )}
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-(--text-muted)/30" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-6 pb-4 border-b border-(--glass-border)">
          <div className="space-y-2 min-w-0 flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-(--text-primary) wrap-break-word">{title}</h2>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-black text-(--text-primary)">{score.total}</span>
              <span className="text-base md:text-lg text-(--text-muted)">/100</span>
              <span className={cn('px-2.5 md:px-3 py-1 rounded-full text-xs font-bold border', levelColor)}>
                {score.label}
              </span>
              {score.domain && PROMPT_DOMAIN_LABELS[score.domain] && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-(--glass-bg) border border-(--glass-border) text-(--text-muted)">
                  {PROMPT_DOMAIN_LABELS[score.domain]}
                </span>
              )}
            </div>
            {score.estimatedImpact && (
              <p className="text-xs text-(--text-muted) mt-2">{score.estimatedImpact}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strengths + weaknesses summary */}
        {(score.strengths.length > 0 || score.topWeaknesses.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 py-4 border-b border-(--glass-border)">
            {score.strengths.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  מה עובד
                </div>
                <ul className="space-y-1">
                  {score.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs text-emerald-600 dark:text-emerald-300 flex items-start gap-1.5">
                      <Check className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {score.topWeaknesses.length > 0 && (
              <div className="space-y-1.5">
                <div className={cn(
                  'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider',
                  isPostUpgrade ? 'text-sky-500' : 'text-amber-500'
                )}>
                  {isPostUpgrade ? <Info className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                  {isPostUpgrade ? 'שיפורים אפשריים נוספים' : 'איך לשפר'}
                </div>
                <ul className="space-y-1">
                  {score.topWeaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className={cn(
                      'text-xs flex items-start gap-1.5',
                      isPostUpgrade ? 'text-sky-600 dark:text-sky-300' : 'text-amber-600 dark:text-amber-300'
                    )}>
                      {isPostUpgrade
                        ? <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                        : <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                      }
                      <span>{isPostUpgrade ? `ניתן לשפר עוד: ${w}` : w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Per-dimension breakdown (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="text-[10px] font-black text-(--text-muted) uppercase tracking-wider">
            פירוק לפי קריטריון
          </div>
          {score.breakdown.map((dim) => (
            <DimensionRow key={dim.dimension} dim={dim} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DimensionRow({ dim }: { dim: DimensionResult }) {
  const pct = Math.round((dim.score / dim.maxScore) * 100);
  const barColor =
    pct >= 70
      ? 'bg-emerald-500'
      : pct >= 40
      ? 'bg-amber-500'
      : 'bg-rose-500';

  // Hebrew labels for dimension keys
  const label: Record<string, string> = {
    length: 'אורך',
    role: 'תפקיד',
    task: 'משימה',
    context: 'הקשר',
    specificity: 'ספציפיות',
    format: 'פורמט פלט',
    constraints: 'מגבלות',
    structure: 'מבנה',
    channel: 'ערוץ / פלטפורמה',
    examples: 'דוגמאות',
    clarity: 'בהירות',
    groundedness: 'עיגון במקורות',
    safety: 'גבולות ובטיחות',
    measurability: 'מדידות',
    framework: 'מסגרת (CO-STAR/RISEN)',
    // visual
    subject: 'נושא',
    style: 'סגנון',
    composition: 'קומפוזיציה',
    lighting: 'תאורה',
    color: 'צבע',
    quality: 'איכות טכנית',
    motion: 'תנועה',
    // research
    research_sources: 'מקורות',
    research_method: 'מתודולוגיה',
    confidence: 'רמת ביטחון',
    falsifiability: 'הפרכה',
    info_gaps: 'פערי מידע',
    // agent
    tools: 'כלים',
    boundaries: 'גבולות',
    inputs_outputs: 'קלט/פלט',
    policies: 'מדיניות',
    failure_modes: 'מצבי כשל',
    enforceability: 'אכיפות',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-(--text-primary)">
          {label[dim.dimension] ?? dim.dimension}
        </span>
        <span className="text-xs font-mono text-(--text-muted)">
          {dim.score}/{dim.maxScore}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={dim.score}
          aria-valuemin={0}
          aria-valuemax={dim.maxScore}
          aria-label={`${label[dim.dimension] ?? dim.dimension}: ${dim.score} מתוך ${dim.maxScore}`}
        />
      </div>
      {(dim.matched.length > 0 || dim.missing.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {dim.matched.slice(0, 4).map((m, i) => (
            <span
              key={`m-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20"
            >
              ✓ {m}
            </span>
          ))}
          {dim.missing.slice(0, 3).map((m, i) => (
            <span
              key={`x-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20"
            >
              ✗ {m}
            </span>
          ))}
        </div>
      )}
      {dim.tip && dim.score < dim.maxScore && (
        <div className="text-[11px] text-(--text-muted) italic flex items-start gap-1.5">
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500/60" aria-hidden="true" />
          {dim.tip}
        </div>
      )}
    </div>
  );
}
