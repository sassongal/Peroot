"use client";

import { useEffect, useRef } from "react";
import { X, LogIn } from "lucide-react";
import Link from "next/link";

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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-md glass-card p-8 rounded-3xl border-white/10 bg-zinc-950/90 shadow-2xl relative animate-in zoom-in-95 duration-300"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-500 hover:text-white transition-colors"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center border border-white/10">
            <img src="/logo.svg" alt="Peroot" className="w-10 h-10 brightness-110" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
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
            <ul className="text-xs text-slate-400 space-y-1.5 text-right">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                יצירת פרומפטים ללא הגבלה
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                שמירת פרומפטים לספריה אישית
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                מועדפים והיסטוריה
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                גישה לספריית פרומפטים מלאה
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 w-full pt-4">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-semibold transition-all shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              התחבר עכשיו
            </Link>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 text-slate-400 hover:text-white text-sm transition-colors"
            >
              אולי מאוחר יותר
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
