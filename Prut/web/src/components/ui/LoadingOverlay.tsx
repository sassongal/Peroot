"use client";

import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "משפר את הפרומפט שלך..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center gap-8 p-16 rounded-3xl bg-black/60 border border-white/10 shadow-2xl max-w-md text-center">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl rounded-full animate-pulse" />

        {/* Animated Logo */}
        <AnimatedLogo size="xl" />

        <div className="relative z-10 flex flex-col gap-3">
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
