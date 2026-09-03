"use client";

import { Chrome, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CHROME_STORE_URL } from "@/lib/constants";

export function ExtensionBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (sessionStorage.getItem("ext-banner-dismissed")) {
        setDismissed(true);
      }
    });
  }, []);

  // Until the listing is approved there is nothing to install; the top line
  // of every desktop page is too valuable for "coming soon".
  if (dismissed || !CHROME_STORE_URL) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("ext-banner-dismissed", "1");
  };

  return (
    <div className="hidden md:flex items-center justify-center gap-3 px-4 py-2 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-b border-amber-500/10 text-sm relative">
      <Chrome className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
      <span className="text-(--text-secondary)">תוסף Chrome חדש -</span>
      {CHROME_STORE_URL ? null : (
        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          בקרוב
        </span>
      )}
      <span className="text-(--text-secondary)">שדרוג ישירות בתוך ChatGPT, Claude ו-Gemini</span>
      {CHROME_STORE_URL ? (
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold text-xs hover:bg-amber-500/25 transition-colors"
        >
          התקנת התוסף
        </a>
      ) : (
        <Link
          href="/extension"
          className="px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold text-xs hover:bg-amber-500/25 transition-colors"
        >
          מה זה נותן
        </Link>
      )}
      <button
        onClick={handleDismiss}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-(--text-muted) hover:text-(--text-secondary) transition-colors"
        aria-label="סגור באנר"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
