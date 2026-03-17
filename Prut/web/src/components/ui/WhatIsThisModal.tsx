"use client";

import Link from "next/link";
import { X, Sparkles, MessageSquare, Globe, Palette, Video, Bot, ArrowLeft } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 overscroll-contain overflow-y-auto">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-white/10 bg-zinc-950/95 p-6 md:p-8 relative" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif font-bold text-white">מה עושים פה?</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">פירוט</span> משדרג כל פרומפט שאתם כותבים לרמה מקצועית — בעברית.
            </p>
          </div>

          {/* 5 Modes */}
          <div className="space-y-2">
            {MODES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-500 truncate">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
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
    </div>
  );
}
