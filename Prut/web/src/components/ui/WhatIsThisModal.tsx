"use client";

import Link from "next/link";
import { X, Sparkles, MessageSquare, Globe, Palette, Video, Bot, ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

interface WhatIsThisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODES = [
  { icon: MessageSquare, title: "טקסט", desc: "פרומפטים ל-ChatGPT, Claude, Gemini", color: "text-sky-400", bg: "bg-sky-500/10" },
  { icon: Globe, title: "מחקר מעמיק", desc: "חיפוש ברשת עם מקורות וציטוטים", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Palette, title: "תמונות", desc: "Midjourney, DALL-E, Flux ועוד", color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Video, title: "סרטונים", desc: "Runway, Kling, Sora, Veo ועוד", color: "text-rose-400", bg: "bg-rose-500/10" },
  { icon: Bot, title: "סוכני AI", desc: "בניית GPT מותאמים וסוכנים חכמים", color: "text-amber-400", bg: "bg-amber-500/10" },
];

export function WhatIsThisModal({ isOpen, onClose }: WhatIsThisModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    // Prevent body scroll while open on mobile
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="מה עושים פה?"
        dir="rtl"
        className={[
          // Base
          "fixed z-[81]",
          // Mobile: bottom sheet, slides up from bottom, ~70% height
          "bottom-0 left-0 right-0 max-h-[72vh] rounded-t-3xl",
          // Desktop: centered modal with auto-width
          "md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-full md:max-w-lg md:rounded-3xl md:max-h-[90vh]",
          // Shared appearance
          "bg-zinc-950 border border-white/10 flex flex-col overflow-hidden",
          // Entrance animation
          "animate-in slide-in-from-bottom-8 duration-300 md:slide-in-from-bottom-0 md:zoom-in-95",
        ].join(" ")}
      >
        {/* Swipe handle (mobile hint) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" aria-hidden="true" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain px-5 pb-6 pt-2 md:p-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-serif font-bold text-white">מה עושים פה?</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">פירוט</span> משדרג כל פרומפט שאתם כותבים לרמה מקצועית - בעברית.
            </p>
          </div>

          {/* 5 Modes */}
          <div className="space-y-1.5">
            {MODES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{title}</p>
                  <p className="text-xs text-slate-500 truncate">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-0.5">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              בואו ננסה!
            </button>
            <Link
              href="/features"
              onClick={onClose}
              className="w-full px-6 py-2.5 rounded-2xl border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              כל היכולות שלנו
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
