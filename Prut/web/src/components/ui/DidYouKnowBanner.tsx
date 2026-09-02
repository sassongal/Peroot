"use client";

import { useState, useEffect } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  detectFactLocale,
  getFactsForLocale,
  getNextFactIndex,
  type FactLocale,
} from "@/lib/peroot-facts";

const SESSION_KEY = "peroot_fun_fact_dismissed";
const LAST_SHOWN_KEY = "peroot_fun_fact_last_shown";
const DAY_MS = 24 * 60 * 60 * 1000;

function isDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

// At most one fact a day (one-overlay law, UX plan U2.2).
function shownWithinLastDay(): boolean {
  try {
    const raw = localStorage.getItem(LAST_SHOWN_KEY);
    return !!raw && Date.now() - Number(raw) < DAY_MS;
  } catch {
    return false;
  }
}

export function DidYouKnowBanner() {
  const [factIndex, setFactIndex] = useState<number | null>(null);
  const [locale, setLocale] = useState<FactLocale>("he");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session or shown today
    if (isDismissedThisSession() || shownWithinLastDay()) return;

    const detectedLocale = detectFactLocale();
    queueMicrotask(() => {
      setLocale(detectedLocale);
      setFactIndex(getNextFactIndex(detectedLocale));
    });
    // Small delay for smooth entrance
    const timer = setTimeout(() => {
      setVisible(true);
      try {
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  if (factIndex === null || !visible) return null;

  const facts = getFactsForLocale(locale);
  const label = locale === "en" ? "Did you know?" : "הידעת?";

  return (
    <div
      className={cn(
        "w-full transition-all duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
      )}
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <div className="relative flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/6 border border-amber-500/15 group">
        {/* Icon */}
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15 mt-0.5">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-amber-400 tracking-wide">{label}</span>
          <p className="text-sm text-(--text-secondary) leading-relaxed mt-0.5">
            {facts[factIndex]}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="shrink-0 p-2 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--glass-bg) transition-colors"
          aria-label={locale === "en" ? "Close" : "סגור"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
