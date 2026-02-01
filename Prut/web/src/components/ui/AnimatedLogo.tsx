"use client";

import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Animated logo component for loading states
 * Creates a mesmerizing effect with the Peroot logo
 */
export function AnimatedLogo({ size = "md", className }: AnimatedLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer rotating glow ring */}
      <div
        className={cn(
          "absolute rounded-full animate-spin-slow",
          sizeClasses[size]
        )}
        style={{
          background: "conic-gradient(from 0deg, transparent, rgba(147, 197, 253, 0.5), transparent, rgba(196, 181, 253, 0.5), transparent)",
          filter: "blur(8px)",
          animationDuration: "3s",
        }}
      />

      {/* Middle pulsing ring */}
      <div
        className={cn(
          "absolute rounded-full animate-pulse",
          size === "sm" ? "w-6 h-6" : size === "md" ? "w-10 h-10" : size === "lg" ? "w-14 h-14" : "w-20 h-20"
        )}
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
          boxShadow: "0 0 30px rgba(147, 197, 253, 0.3), 0 0 60px rgba(196, 181, 253, 0.2)",
        }}
      />

      {/* Inner breathing glow */}
      <div
        className={cn(
          "absolute rounded-full animate-breathe",
          size === "sm" ? "w-10 h-10" : size === "md" ? "w-14 h-14" : size === "lg" ? "w-20 h-20" : "w-28 h-28"
        )}
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)",
        }}
      />

      {/* Logo container with effects */}
      <div className="relative z-10">
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 overflow-hidden rounded-lg"
          style={{ mixBlendMode: "overlay" }}
        >
          <div
            className="absolute inset-0 animate-shimmer-diagonal"
            style={{
              background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
              backgroundSize: "200% 200%",
            }}
          />
        </div>

        {/* Logo image */}
        <img
          src="/assets/branding/logo.png"
          alt="פרוט"
          className={cn(
            "relative animate-float drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]",
            sizeClasses[size]
          )}
          style={{
            filter: "drop-shadow(0 0 10px rgba(147, 197, 253, 0.4)) drop-shadow(0 0 20px rgba(196, 181, 253, 0.3))",
          }}
        />
      </div>

      {/* Orbiting particles */}
      <div className={cn("absolute", sizeClasses[size])}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-white/60 animate-orbit"
            style={{
              animationDelay: `${i * 1.2}s`,
              animationDuration: "3.6s",
              boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
