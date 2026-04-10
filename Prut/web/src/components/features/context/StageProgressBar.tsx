'use client';
import { motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import type { ProcessingStage } from '@/lib/context/engine/types';

const STAGES: Array<{ id: ProcessingStage; label: string }> = [
  { id: 'uploading',  label: 'מעלה' },
  { id: 'extracting', label: 'קורא' },
  { id: 'enriching',  label: 'מבין' },
  { id: 'ready',      label: 'מוכן' },
];

type PillState = 'pending' | 'active' | 'complete';

function pillState(current: ProcessingStage, pillId: ProcessingStage): PillState {
  const order = STAGES.map((s) => s.id);
  const ci = order.indexOf(current);
  const pi = order.indexOf(pillId);
  if (ci === -1 || pi === -1) return 'pending';
  if (pi < ci) return 'complete';
  if (pi === ci) return 'active';
  return 'pending';
}

export function StageProgressBar({ stage }: { stage: ProcessingStage }) {
  if (stage === 'error') {
    return (
      <div data-testid="stage-error" className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <X className="w-4 h-4" />
        </motion.div>
        <span>לא הצלחנו — נסה שוב?</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      {STAGES.map((s, i) => {
        const state = pillState(stage, s.id);
        return (
          <motion.div
            key={s.id}
            data-testid={`stage-pill-${s.id}`}
            data-state={state}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 500, damping: 25 }}
            className={[
              'relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium overflow-hidden',
              'transition-all duration-500',
              state === 'complete' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
              state === 'active'   && 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/25',
              state === 'pending'  && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500',
            ].filter(Boolean).join(' ')}
          >
            {/* Shimmer sweep on active pill */}
            {state === 'active' && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
              />
            )}
            {state === 'complete' && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              >
                <Check className="w-3 h-3" />
              </motion.span>
            )}
            {state === 'active' && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-3 h-3" />
              </motion.span>
            )}
            <span className="relative z-10">{s.label}</span>
          </motion.div>
        );
      })}

      {/* Connecting line between pills */}
      {stage !== 'ready' && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden />
      )}
    </div>
  );
}

// test stable export
export function _stagePillTestids() {
  return STAGES.map((s) => `stage-pill-${s.id}`);
}

StageProgressBar.displayName = 'StageProgressBar';
