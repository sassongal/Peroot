"use client";

import { cn } from "@/lib/utils";
import { getAssetPath } from "@/lib/asset-path";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Optimized animated logo component for loading states
 * Uses GPU-accelerated transforms for smooth 60fps animations
 * Transparent background for versatile use
 */
export function AnimatedLogo({ size = "md", className }: AnimatedLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const ringScales = {
    sm: { outer: "w-12 h-12", inner: "w-10 h-10" },
    md: { outer: "w-16 h-16", inner: "w-14 h-14" },
    lg: { outer: "w-24 h-24", inner: "w-20 h-20" },
    xl: { outer: "w-32 h-32", inner: "w-28 h-28" },
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        className
      )}
      style={{ willChange: "transform" }}
    >
      {/* Outer rotating ring - GPU accelerated */}
      <div
        className={cn(
          "absolute rounded-full animate-logo-spin",
          ringScales[size].outer
        )}
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, rgba(147, 197, 253, 0.4) 25%, transparent 50%, rgba(196, 181, 253, 0.4) 75%, transparent 100%)",
          willChange: "transform",
        }}
      />

      {/* Inner pulsing glow ring - uses opacity animation */}
      <div
        className={cn(
          "absolute rounded-full animate-logo-pulse",
          ringScales[size].inner
        )}
        style={{
          background: "radial-gradient(circle, rgba(147, 197, 253, 0.2) 0%, rgba(196, 181, 253, 0.1) 50%, transparent 70%)",
          willChange: "opacity, transform",
        }}
      />

      {/* Logo container */}
      <div className="relative z-10" style={{ willChange: "transform" }}>
        {/* Logo image with subtle float animation */}
        <img
          src={getAssetPath("/assets/branding/logo.png")}
          alt="פרוט"
          className={cn(
            "relative animate-logo-float",
            sizeClasses[size]
          )}
          style={{
            willChange: "transform",
            filter: "drop-shadow(0 0 8px rgba(147, 197, 253, 0.5))",
          }}
        />
      </div>

      {/* Orbiting particles - simplified for performance */}
      <div className={cn("absolute animate-logo-orbit", sizeClasses[size])} style={{ willChange: "transform" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/70"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${i * 120}deg) translateX(${size === "sm" ? 16 : size === "md" ? 24 : size === "lg" ? 32 : 48}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
