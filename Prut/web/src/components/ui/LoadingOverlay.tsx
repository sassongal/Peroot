"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Lightbulb } from "lucide-react";
import {
  detectFactLocale,
  getFactsForLocale,
  getNextFactIndex,
  type FactLocale,
} from "@/lib/peroot-facts";
import type { StreamPhase } from "@/hooks/usePromptWorkflow";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  phase?: StreamPhase;
}

const PHASE_SUBTITLE_HE: Record<StreamPhase, string> = {
  idle: "ה-AI מנתח, משפר ומדייק את הבקשה שלך...",
  sending: "שולח את הבקשה שלך...",
  writing: "מדייק ומנסח את הפרומפט המושלם...",
  done: "כמעט סיימנו...",
  interrupted: "מתאושש...",
};

const PHASE_SUBTITLE_EN: Record<StreamPhase, string> = {
  idle: "AI is analyzing, refining, and polishing your request...",
  sending: "Sending your request...",
  writing: "Crafting the perfect prompt...",
  done: "Almost done...",
  interrupted: "Recovering...",
};

export function LoadingOverlay({
  isVisible,
  message,
  phase = "idle",
}: LoadingOverlayProps) {
  const [factIdx, setFactIdx] = useState<number | null>(null);
  const [locale, setLocale] = useState<FactLocale>("he");

  // Initialize locale + first fact when overlay opens
  useEffect(() => {
    if (!isVisible) return;
    const detected = detectFactLocale();
    setLocale(detected);
    setFactIdx(getNextFactIndex(detected));
  }, [isVisible]);

  // Rotate facts every 4.5s while visible
  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => {
      setFactIdx(getNextFactIndex(locale));
    }, 4500);
    return () => clearInterval(id);
  }, [isVisible, locale]);

  if (!isVisible) return null;

  const facts = getFactsForLocale(locale);
  const currentFact = factIdx != null ? facts[factIdx] : null;
  const isHe = locale === "he";

  const headline =
    message ?? (isHe ? "משפר את הפרומפט שלך..." : "Improving your prompt...");
  const subtitle = (isHe ? PHASE_SUBTITLE_HE : PHASE_SUBTITLE_EN)[phase];
  const factLabel = isHe ? "הידעת?" : "Did you know?";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-white/80 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-300 overscroll-contain"
      style={{ minHeight: "100dvh" }}
      dir={isHe ? "rtl" : "ltr"}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="relative flex flex-col items-center gap-6 px-6 sm:px-10 py-10 sm:py-12 rounded-3xl bg-white/95 dark:bg-black/85 border border-[var(--glass-border)] shadow-2xl max-w-md w-full text-center">

        {/* Animated loading visual */}
        <div className="relative w-32 h-32 flex items-center justify-center">

          {/* Outer morphing ring */}
          <div className="absolute inset-0 rounded-full animate-morph-ring" />

          {/* Conic-gradient halo behind logo for premium depth */}
          <div
            className="absolute inset-2 rounded-full animate-logo-spin"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(251, 191, 36, 0.35) 25%, transparent 50%, rgba(245, 158, 11, 0.25) 75%, transparent 100%)",
              willChange: "transform",
            }}
          />

          {/* Orbiting helix dots — 6 dots */}
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

          {/* Center logo with glow pulse — real top-nav wordmark */}
          <div className="relative z-10 animate-logo-breathe flex items-center justify-center">
            <div className="absolute inset-0 -m-3 rounded-full bg-amber-400/20 blur-xl animate-glow-ring" />
            <Image
              src="/images/peroot_logo_pack/logo_dark_240.png"
              alt="Peroot"
              width={240}
              height={240}
              className="relative block dark:hidden h-12 sm:h-14 w-auto"
              style={{
                filter: "drop-shadow(0 0 14px rgba(245, 158, 11, 0.6))",
                willChange: "transform",
              }}
              priority
            />
            <Image
              src="/images/peroot_logo_pack/logo_dark_navbar_2x.png"
              alt="Peroot"
              width={240}
              height={240}
              className="relative hidden dark:block h-12 sm:h-14 w-auto"
              style={{
                filter: "drop-shadow(0 0 14px rgba(245, 158, 11, 0.6))",
                willChange: "transform",
              }}
              priority
            />
          </div>

          {/* Spark particles */}
          {[...Array(4)].map((_, i) => (
            <div
              key={`spark-${i}`}
              className="absolute w-1 h-1 rounded-full bg-amber-300 animate-spark"
              style={{
                animationDelay: `${i * 0.8}s`,
                animationDuration: "3.2s",
              }}
            />
          ))}
        </div>

        {/* Message block */}
        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-xl sm:text-2xl font-serif text-[var(--text-primary)] font-bold tracking-wide">
            {headline}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
          {/* Animated progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-wave-dot"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Rotating Peroot fact — gives the user something to read */}
        <div
          className="w-full border-t border-[var(--glass-border)] pt-5 min-h-[96px] flex items-start gap-3"
          aria-live="off"
        >
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15 mt-0.5">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 tracking-wide uppercase">
              {factLabel}
            </span>
            {currentFact && (
              <p
                key={factIdx}
                className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1 animate-in fade-in slide-in-from-bottom-1 duration-500"
              >
                {currentFact}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
