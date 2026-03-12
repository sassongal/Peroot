"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "peroot_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't consented yet
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    // Disable PostHog tracking
    if (typeof window !== 'undefined') {
      const w = window as unknown as { posthog?: { opt_out_capturing: () => void } };
      if (w.posthog) w.posthog.opt_out_capturing();
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-500",
      )}
      dir="rtl"
      role="dialog"
      aria-label="הסכמה לעוגיות"
    >
      <div className="max-w-2xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-slate-300 leading-relaxed">
            אנחנו משתמשים בעוגיות לשיפור חווית השימוש ולניתוח נתונים.{" "}
            <a href="/privacy" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
              מדיניות פרטיות
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAccept}
            className="px-5 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
          >
            מאשר
          </button>
          <button
            onClick={handleDecline}
            className="px-5 py-2 rounded-lg border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-colors cursor-pointer"
          >
            דחה
          </button>
          <button
            onClick={handleDecline}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
