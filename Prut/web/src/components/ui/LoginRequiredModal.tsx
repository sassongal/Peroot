"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, LogIn } from "lucide-react";
import Link from "next/link";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

export function LoginRequiredModal({
  isOpen,
  onClose,
  title = "נדרשת התחברות",
  message = "כדי להשתמש בתכונה זו, יש להתחבר לחשבון שלך.",
  feature,
}: LoginRequiredModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  useScrollLock(isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overscroll-contain overflow-y-auto">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
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
            <Image src="/images/peroot_logo_pack/logo_dark_240.png" alt="לוגו פרוט" width={40} height={40} className="block dark:hidden w-10 h-10" style={{ width: 'auto', height: 'auto' }} />
            <Image src="/images/peroot_logo_pack/logo_dark_navbar_2x.png" alt="לוגו פרוט" width={40} height={40} className="hidden dark:block w-10 h-10" style={{ width: 'auto', height: 'auto' }} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-(--text-primary)">{title}</h2>
            <p className="text-(--text-muted) text-sm leading-relaxed">
              {message}
            </p>
            {feature && (
              <p className="text-xs text-slate-500 mt-2">
                תכונה: {feature}
              </p>
            )}
          </div>

          <div className="w-full space-y-3 pt-2">
            <p className="text-xs text-slate-500">
              משתמשים מחוברים נהנים מ:
            </p>
            <ul className="text-xs text-(--text-muted) space-y-1.5 text-right">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                פרומפט חינמי כל יום
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                שמירת פרומפטים לספריה אישית
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                מועדפים והיסטוריה
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                גישה לספריית פרומפטים מלאה
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 w-full pt-4">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-linear-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 rounded-xl text-white font-semibold transition-all shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              התחבר עכשיו
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3 px-5 text-(--text-muted) hover:text-(--text-primary) text-sm transition-colors"
            >
              אולי מאוחר יותר
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
