"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveryTip } from "@/hooks/useFeatureDiscovery";

interface FeatureDiscoveryTooltipProps {
  visible: boolean;
  tip: DiscoveryTip | null;
  currentIndex: number;
  totalTips: number;
  onNext: () => void;
  onDismiss: () => void;
  onCtaClick?: (action: string) => void;
}

export function FeatureDiscoveryTooltip({
  visible,
  tip,
  currentIndex,
  totalTips,
  onNext,
  onDismiss,
  onCtaClick,
}: FeatureDiscoveryTooltipProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible && tip) {
      // Trigger animation
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
    }
  }, [visible, tip]);

  if (!visible || !tip) return null;

  const isLast = currentIndex >= totalTips - 1;

  return (
    <div
      className={cn(
        "fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:max-w-sm z-50",
        "transition-all duration-500 ease-out",
        show
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative bg-[#1a1a2e] border border-amber-500/20 rounded-2xl p-4 shadow-2xl shadow-amber-500/10">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 end-3 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          aria-label="סגור טיפים"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2" dir="rtl">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-bold text-amber-400 tracking-wide">הידעת?</span>
          {totalTips > 1 && (
            <span className="text-[10px] text-slate-500 mr-auto">
              {currentIndex + 1} מתוך {totalTips}
            </span>
          )}
        </div>

        {/* Tip content */}
        <div className="pr-0 md:pr-0" dir="rtl">
          <p className="text-sm text-slate-200 leading-relaxed mb-3">
            <span className="text-lg ml-1.5">{tip.emoji}</span>
            {tip.text}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* CTA button */}
            {tip.cta && tip.ctaAction && (
              <button
                onClick={() => {
                  onCtaClick?.(tip.ctaAction!);
                  onNext();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                {tip.cta}
              </button>
            )}

            {/* Next / Got it button */}
            <button
              onClick={onNext}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                isLast
                  ? "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isLast ? (
                "הבנתי"
              ) : (
                <>
                  הבא
                  <ChevronLeft className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        {totalTips > 1 && (
          <div className="flex items-center justify-center gap-1 mt-3">
            {Array.from({ length: totalTips }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === currentIndex ? "bg-amber-400" : "bg-slate-600"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
