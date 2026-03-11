'use client';

import { useI18n } from '@/context/I18nContext';

interface UpgradeNudgeProps {
  type: 'warning' | 'exhausted';
  remaining?: number;
  resetDate?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function UpgradeNudge({ type, remaining, resetDate, onUpgrade, onDismiss }: UpgradeNudgeProps) {
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
