"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, LogIn, Sparkles, Clock } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import { CountdownTimer } from "./CountdownTimer";

interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** "guest": prompt-to-register flow · "free": prompt-to-upgrade flow */
  variant: "guest" | "free";
  /** ISO string / Date — when the rolling window refreshes */
  refreshAt: string | Date | null;
}

export function QuotaExhaustedModal({
  isOpen,
  onClose,
  variant,
  refreshAt,
}: QuotaExhaustedModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  useScrollLock(isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isGuest = variant === "guest";
  const title = isGuest ? "הפרומפט היומי שלך מוצה" : "המכסה היומית הסתיימה";
  const body = isGuest
    ? "אורחים מקבלים פרומפט אחד ביום. הירשם בחינם כדי לקבל 2 פרומפטים וגישה לכל המנועים — מחקר, תמונה, וידאו ובניית סוכנים."
    : "ניצלת את 2 הפרומפטים היומיים. שדרג ל-Pro ל-150 פרומפטים בחודש, ללא הגבלת מנועים.";
  const primaryHref = isGuest ? "/login" : "/pricing";
  const primaryLabel = isGuest ? "הירשם בחינם" : "שדרג ל-Pro";
  const PrimaryIcon = isGuest ? LogIn : Sparkles;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overscroll-contain overflow-y-auto">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quota-exhausted-title"
        tabIndex={-1}
        className="w-full max-w-md glass-card p-8 rounded-3xl border-(--glass-border) bg-white/95 dark:bg-zinc-950/90 shadow-2xl relative animate-in zoom-in-95 duration-300"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 start-4 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-(--text-muted) hover:text-(--text-primary) transition-colors"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center border border-(--glass-border)">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h2 id="quota-exhausted-title" className="text-2xl font-bold text-(--text-primary)">
              {title}
            </h2>
            <p className="text-(--text-muted) text-sm leading-relaxed">{body}</p>
          </div>

          {refreshAt && (
            <div className="w-full flex flex-col items-center gap-2 py-4 px-4 rounded-2xl bg-(--glass-surface) border border-(--glass-border)">
              <span className="text-xs text-(--text-muted)">חידוש המכסה בעוד</span>
              <CountdownTimer refreshAt={refreshAt} />
            </div>
          )}

          <div className="flex flex-col gap-3 w-full pt-2">
            <Link
              href={primaryHref}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-linear-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 rounded-xl text-white font-semibold transition-all shadow-lg"
            >
              <PrimaryIcon className="w-5 h-5" />
              {primaryLabel}
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3 px-5 text-(--text-muted) hover:text-(--text-primary) text-sm transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
