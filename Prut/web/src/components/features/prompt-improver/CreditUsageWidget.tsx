'use client';

import { useI18n } from '@/context/I18nContext';

interface CreditUsageWidgetProps {
  used: number;
  total: number;
  resetDate?: string;
  onUpgrade?: () => void;
}

export default function CreditUsageWidget({ used, total, onUpgrade }: CreditUsageWidgetProps) {
  const t = useI18n();
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

  const barColor =
    percentage >= 100 ? 'bg-red-500' :
    percentage >= 80 ? 'bg-yellow-500' :
    'bg-green-500';

  return (
    <div className="p-3 rounded-lg border border-white/10 space-y-2 bg-black/20">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{t.credits?.usage || 'שימוש בקרדיטים'}</span>
        <span>{used}/{total}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {percentage >= 80 && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-xs text-purple-400 hover:underline min-h-11 flex items-center"
        >
          {percentage >= 100
            ? (t.credits?.upgrade_now || 'שדרג עכשיו')
            : (t.credits?.running_low || `נותרו לך ${total - used} קרדיטים`)}
        </button>
      )}
    </div>
  );
}
