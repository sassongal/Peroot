"use client";

import { Chrome, X } from "lucide-react";
import { useState, useEffect } from "react";

const CHROME_STORE_URL = "#"; // Replace with actual Chrome Web Store URL when approved

export function ExtensionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check if user already dismissed the banner this session
    if (sessionStorage.getItem("ext-banner-dismissed")) {
      setDismissed(true);
    }
    setLoaded(true);
  }, []);

  if (dismissed || !loaded) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("ext-banner-dismissed", "1");
  };

  return (
    <div className="hidden md:flex items-center justify-center gap-3 px-4 py-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-b border-amber-500/10 text-sm relative">
      <Chrome className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-slate-400">
        תוסף Chrome חדש -
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
        בקרוב
      </span>
      <span className="text-slate-400">
        שדרג טקסטים ישירות מכל אתר
      </span>
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 font-semibold text-xs hover:bg-amber-500/25 transition-colors cursor-pointer"
        onClick={(e) => {
          if (CHROME_STORE_URL === "#") {
            e.preventDefault();
          }
        }}
      >
        הורד תוסף
      </a>
      <button
        onClick={handleDismiss}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-slate-400 transition-colors"
        aria-label="סגור באנר"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
