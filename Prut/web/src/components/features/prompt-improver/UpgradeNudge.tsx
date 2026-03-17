'use client';

import { useI18n } from '@/context/I18nContext';
import { Crown } from 'lucide-react';

interface UpgradeNudgeProps {
  type: 'warning' | 'exhausted' | 'feature-gate';
  remaining?: number;
  resetDate?: string;
  /** Name of the gated feature - shown for type='feature-gate' */
  featureName?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function UpgradeNudge({ type, remaining, resetDate, featureName, onUpgrade, onDismiss }: UpgradeNudgeProps) {
  const t = useI18n();

  if (type === 'warning') {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between" dir="rtl">
        <span className="text-sm text-yellow-300">
          {t.nudge?.remaining || `נותרו לך ${remaining} קרדיטים החודש`}
        </span>
        <button onClick={onDismiss} className="text-yellow-500 hover:text-yellow-300 text-xs min-h-11 min-w-11 flex items-center justify-center">
          ✕
        </button>
      </div>
    );
  }

  if (type === 'feature-gate') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3" dir="rtl">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-300">
            תכונה זו זמינה למשתמשי Pro
            {featureName && <span className="text-amber-400 font-semibold"> - {featureName}</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onUpgrade}
            className="px-3 py-1.5 rounded-lg accent-gradient text-black text-xs font-bold cursor-pointer border border-amber-400/50"
          >
            שדרג ל-Pro
          </button>
          <button onClick={onDismiss} className="text-amber-500 hover:text-amber-300 text-xs min-h-11 min-w-11 flex items-center justify-center">
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overscroll-contain">
      <div className="bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-sm mx-4 space-y-4 shadow-xl">
        <h3 className="text-lg font-semibold text-center text-white" dir="rtl">
          {t.nudge?.exhausted_title || 'הקרדיטים נגמרו'}
        </h3>
        <p className="text-sm text-slate-400 text-center" dir="rtl">
          {t.nudge?.exhausted_message || 'שדרג ל-Pro או המתן לאיפוס החודשי'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-lg accent-gradient text-black font-bold min-h-11 cursor-pointer border border-amber-400/50"
          >
            {t.nudge?.upgrade_to_pro || 'שדרג ל-Pro'}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm min-h-11 cursor-pointer"
          >
            {resetDate
              ? `${t.nudge?.wait_for_reset || 'המתן לאיפוס'} - ${resetDate}`
              : (t.nudge?.wait_for_reset || 'המתן לאיפוס')}
          </button>
        </div>
      </div>
    </div>
  );
}
