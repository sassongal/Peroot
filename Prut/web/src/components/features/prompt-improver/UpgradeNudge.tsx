"use client";

import { useI18n } from "@/context/I18nContext";
import { Crown, Clock, CheckCircle2, X } from "lucide-react";

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

export default function UpgradeNudge({
  type,
  remaining,
  resetDate,
  featureName,
  onUpgrade,
  onDismiss,
}: UpgradeNudgeProps) {
  const t = useI18n();

  if (type === "warning") {
    return (
      <div
        className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between"
        dir="rtl"
      >
        <span className="text-sm text-yellow-300">
          {t.nudge?.remaining || `נותרו לך ${remaining} קרדיטים היום`}
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
      <div className="relative bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-sm mx-4 space-y-5 shadow-xl">
        <button
          onClick={onDismiss}
          aria-label="סגור"
          className="absolute top-2 left-2 text-slate-500 hover:text-slate-200 transition-colors min-h-11 min-w-11 flex items-center justify-center rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
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
              : "הקרדיטים מתחדשים בתוך 24 שעות מהשימוש האחרון"}
          </button>
        </div>
      </div>
    </div>
  );
}
