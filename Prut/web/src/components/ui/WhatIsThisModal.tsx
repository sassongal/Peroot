"use client";

import { X, Sparkles, Target, Globe, Zap } from "lucide-react";

interface WhatIsThisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatIsThisModal({ isOpen, onClose }: WhatIsThisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 overscroll-contain overflow-y-auto">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-white/10 bg-zinc-950/95 p-8 md:p-10 relative" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif font-bold text-white">מה עושים פה?</h2>
            <p className="text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">Peroot</span> הוא כלי AI שמשדרג כל פרומפט שאתם כותבים לרמה מקצועית - בעברית.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Sparkles, title: "שדרוג אוטומטי", desc: "כתבו משפט פשוט וקבלו פרומפט מקצועי ומובנה" },
              { icon: Target, title: "4 מצבי עבודה", desc: "טקסט, מחקר, תמונות וסוכני AI - הכל במקום אחד" },
              { icon: Globe, title: "עברית מושלמת", desc: "בנוי מהיסוד לעברית - לא תרגום, אלא יצירה מקורית" },
              { icon: Zap, title: "תוצאות בשניות", desc: "AI מתקדם שמבין את הכוונה ומייצר פרומפט חד ומדויק" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            >
              בואו ננסה!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
