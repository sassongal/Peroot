"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Optimized animated logo component for loading states.
 * Uses the real Peroot top-nav wordmark (light/dark variants).
 * GPU-accelerated transforms for smooth 60fps animations.
 *
 * Layout note: the outer container is sized by the logo height so the
 * component behaves like an inline icon inside buttons. Rings and orbiting
 * particles are absolutely positioned and extend beyond the container's
 * box — parents should not clip with overflow:hidden.
 */
export function AnimatedLogo({ size = "md", className }: AnimatedLogoProps) {
  // Container sized to the logo — keeps the component compact inside buttons.
  // Rings and particles overflow this box via absolute positioning.
  const containerSize = {
    sm: "w-8 h-5",
    md: "w-12 h-7",
    lg: "w-16 h-10",
    xl: "w-24 h-14",
  } as const;

  const logoHeight = {
    sm: "h-5",
    md: "h-7",
    lg: "h-10",
    xl: "h-14",
  } as const;

  const ringScales = {
    sm: { outer: "w-12 h-12", inner: "w-10 h-10" },
    md: { outer: "w-16 h-16", inner: "w-14 h-14" },
    lg: { outer: "w-24 h-24", inner: "w-20 h-20" },
    xl: { outer: "w-32 h-32", inner: "w-28 h-28" },
  } as const;

  const orbitRadius = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  } as const;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        containerSize[size],
        className
      )}
      style={{ willChange: "transform" }}
    >
      {/* Outer rotating ring */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-logo-spin",
          ringScales[size].outer
        )}
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(251, 191, 36, 0.45) 25%, transparent 50%, rgba(245, 158, 11, 0.35) 75%, transparent 100%)",
          willChange: "transform",
        }}
      />

      {/* Inner pulsing glow ring */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-logo-pulse",
          ringScales[size].inner
        )}
        style={{
          background:
            "radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.1) 50%, transparent 70%)",
          willChange: "opacity, transform",
        }}
      />

      {/* Real Peroot wordmark — light/dark variants matching TopNavBar */}
      <div
        className="relative z-10 flex items-center justify-center animate-logo-float"
        style={{
          willChange: "transform",
          filter: "drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))",
        }}
      >
        <Image
          src="/images/peroot_logo_pack/logo_dark_240.png"
          alt="Peroot"
          width={240}
          height={240}
          className={cn("block dark:hidden w-auto", logoHeight[size])}
          priority
        />
        <Image
          src="/images/peroot_logo_pack/logo_dark_navbar_2x.png"
          alt="Peroot"
          width={240}
          height={240}
          className={cn("hidden dark:block w-auto", logoHeight[size])}
          priority
        />
      </div>

      {/* Orbiting particles */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-logo-orbit",
          ringScales[size].outer
        )}
        style={{ willChange: "transform" }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-300/80"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${i * 120}deg) translateX(${orbitRadius[size]}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
