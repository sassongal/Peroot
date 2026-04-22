"use client";

import { useMemo } from "react";
import { useI18n } from "@/context/I18nContext";
import { Crown, Clock, CheckCircle2 } from "lucide-react";

interface UpgradeNudgeProps {
  type: "warning" | "exhausted" | "feature-gate";
  remaining?: number;
  resetDate?: string;
  /** Name of the gated feature - shown for type='feature-gate' */
  featureName?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const PRO_BENEFITS = [
  "150 שיפורים בחודש",
  "מצבי מחקר, תמונה, וידאו וסוכן",
  "שרשראות פרומפטים ומשתנים",
];

/** Minutes until next daily credit reset at 14:00 Israel time (UTC+3 in summer) */
function useTimeUntilReset(): string {
  return useMemo(() => {
    const now = new Date();
    const IL_OFFSET_MS = 3 * 3600_000; // IDT = UTC+3 (Apr–Oct)
    const ilNow = new Date(now.getTime() + IL_OFFSET_MS);

    // Target: 14:00 IL today; roll to tomorrow if already passed
    const reset = new Date(ilNow);
    reset.setUTCHours(14, 0, 0, 0);
    let msLeft = reset.getTime() - ilNow.getTime();
    if (msLeft <= 0) msLeft += 86_400_000;

    const h = Math.floor(msLeft / 3_600_000);
    const m = Math.floor((msLeft % 3_600_000) / 60_000);
    if (h === 0) return `${m} דקות`;
    if (m === 0) return `${h} שעות`;
    return `${h}:${String(m).padStart(2, "0")} שעות`;
  }, []);
}

export default function UpgradeNudge({
  type,
  remaining,
  resetDate,
  featureName,
  onUpgrade,
  onDismiss,
}: UpgradeNudgeProps) {
  const t = useI18n();
  const timeUntilReset = useTimeUntilReset();

  if (type === "warning") {
    return (
      <div
        className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between"
        dir="rtl"
      >
        <span className="text-sm text-yellow-300">
          {t.nudge?.remaining || `נותרו לך ${remaining} קרדיטים החודש`}
        </span>
        <button
          onClick={onDismiss}
          className="text-yellow-500 hover:text-yellow-300 text-xs min-h-11 min-w-11 flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    );
  }

  if (type === "feature-gate") {
    return (
      <div
        className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3"
        dir="rtl"
      >
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
          <button
            onClick={onDismiss}
            className="text-amber-500 hover:text-amber-300 text-xs min-h-11 min-w-11 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // exhausted
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overscroll-contain"
      dir="rtl"
    >
      <div className="bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-sm mx-4 space-y-5 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <Crown className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-white">
            {t.nudge?.exhausted_title || "נגמרו הקרדיטים היומיים"}
          </h3>
          <p className="text-sm text-slate-400">
            שדרג ל-Pro וקבל 150 שיפורים בחודש — ללא הגבלה יומית
          </p>
        </div>

        {/* Pro benefits */}
        <ul className="space-y-2 py-1">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-lg accent-gradient text-black font-bold min-h-11 cursor-pointer border border-amber-400/50"
          >
            {t.nudge?.upgrade_to_pro || "שדרג ל-Pro"}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2 text-slate-500 text-xs hover:text-slate-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3 h-3" />
            {resetDate
              ? `${t.nudge?.wait_for_reset || "המתן לאיפוס"} — ${resetDate}`
              : `האיפוס בעוד ${timeUntilReset}`}
          </button>
        </div>
      </div>
    </div>
  );
}
