"use client";

import { Loader2, Sparkles } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "משפר את הפרומפט שלך..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center gap-6 p-12 rounded-3xl bg-black/80 border border-white/10 shadow-2xl max-w-sm text-center">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
        
        <div className="relative z-10 p-4 rounded-full bg-white/5 border border-white/10">
          <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
          <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-2xl font-serif text-white font-bold tracking-wide">
            {message}
          </h3>
          <p className="text-sm text-slate-400">
            ה-AI מנתח, משפר ומדייק את הבקשה שלך...
          </p>
        </div>
      </div>
    </div>
  );
}
