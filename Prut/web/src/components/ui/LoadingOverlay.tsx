"use client";

import Image from "next/image";
import { getAssetPath } from "@/lib/asset-path";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "משפר את הפרומפט שלך..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-sm animate-in fade-in duration-300 overscroll-contain" aria-live="polite">
      <div className="relative flex flex-col items-center gap-6 p-12 rounded-3xl bg-white/90 dark:bg-black/80 border border-[var(--glass-border)] shadow-2xl max-w-sm text-center">

        {/* Animated loading visual */}
        <div className="relative w-28 h-28 flex items-center justify-center">

          {/* Outer morphing ring */}
          <div className="absolute inset-0 rounded-full animate-morph-ring" />

          {/* Orbiting dots - 6 dots in a helix pattern */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-helix-dot"
              style={{
                animationDelay: `${i * -0.5}s`,
                background: `hsl(${35 + i * 8}, 90%, ${60 + i * 5}%)`,
                boxShadow: `0 0 8px hsl(${35 + i * 8}, 90%, 60%)`,
              }}
            />
          ))}

          {/* Center logo with glow pulse */}
          <div className="relative z-10 animate-logo-breathe">
            <div className="absolute inset-0 -m-2 rounded-full bg-amber-400/20 blur-md animate-glow-ring" />
            <Image
              src={getAssetPath("/assets/branding/logo.png")}
              alt="פרוט"
              width={56}
              height={56}
              className="w-14 h-14 relative"
              style={{
                filter: "drop-shadow(0 0 12px rgba(245, 158, 11, 0.6))",
              }}
            />
          </div>

          {/* Spark particles */}
          {[...Array(4)].map((_, i) => (
            <div
              key={`spark-${i}`}
              className="absolute w-1 h-1 rounded-full bg-amber-300 animate-spark"
              style={{
                animationDelay: `${i * 0.8}s`,
                animationDuration: '3.2s',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-xl font-serif text-[var(--text-primary)] font-bold tracking-wide">
            {message}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            ה-AI מנתח, משפר ומדייק את הבקשה שלך...
          </p>
          {/* Animated progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-wave-dot"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
