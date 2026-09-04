"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "peroot_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't consented yet
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Delay so it doesn't clash with onboarding overlay or splash screen
      const timer = setTimeout(() => setVisible(true), 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    // A returning visitor may carry a persisted opt-out from an earlier
    // decline; accepting must clear it or they stay untracked forever.
    try {
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    } catch {
      /* posthog not initialised (missing env) — nothing to opt into */
    }
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    // The npm posthog-js module never attaches itself to window, so the old
    // `window.posthog?.opt_out_capturing()` guard silently no-op'd and a user
    // who clicked "דחה" was tracked exactly as before (review 2026-09-04).
    // The module import is the real client; opt-out persists in its own
    // storage across visits.
    try {
      posthog.opt_out_capturing();
    } catch {
      /* posthog not initialised — nothing was capturing anyway */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-[60px] md:bottom-0 left-0 right-0 z-90 p-4 animate-in slide-in-from-bottom-4 duration-500",
      )}
      dir="rtl"
      role="dialog"
      aria-label="הסכמה לעוגיות"
    >
      {/* Compact single row (U2.2): the banner must never bury the input box. */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#111] border border-border rounded-xl px-3 py-2 shadow-2xl backdrop-blur-xl flex items-center gap-2">
        <p className="flex-1 min-w-0 text-xs text-muted-foreground leading-snug">
          אנחנו משתמשים בעוגיות לשיפור החוויה.{" "}
          <a
            href="/privacy"
            className="text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 underline underline-offset-2"
          >
            פרטיות
          </a>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-4 py-1.5 min-h-[36px] rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
        >
          מאשר
        </button>
        <button
          onClick={handleDecline}
          className="shrink-0 px-3 py-1.5 min-h-[36px] rounded-lg border border-border text-muted-foreground text-xs hover:bg-secondary transition-colors cursor-pointer"
        >
          דחה
        </button>
        <button
          onClick={handleDecline}
          className="shrink-0 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
