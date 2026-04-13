"use client";

import { cn } from "@/lib/utils";

/**
 * Small "?" icon that shows an explanatory tooltip on hover.
 * Works in both LTR and RTL layouts.
 *
 * Usage:
 *   <InfoTooltip text="מה שזה מודד..." />
 *   <InfoTooltip text="..." position="left" />
 */
export function InfoTooltip({
  text,
  position = "top",
  className,
}: {
  text: string;
  position?: "top" | "left" | "right" | "bottom";
  className?: string;
}) {
  const posClass = {
    top: "bottom-full mb-2 right-0",
    bottom: "top-full mt-2 right-0",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  }[position];

  return (
    <div className={cn("relative group/tip inline-flex shrink-0", className)}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="מידע נוסף"
        className="w-4 h-4 rounded-full border border-zinc-700 text-zinc-600 hover:border-zinc-400 hover:text-zinc-300 text-[9px] font-black flex items-center justify-center transition-all duration-200 cursor-help leading-none"
      >
        ?
      </button>

      {/* Tooltip bubble */}
      <div
        className={cn(
          "absolute z-50 w-56 p-3 rounded-2xl",
          "bg-zinc-900 border border-white/10 shadow-2xl",
          "text-[10px] font-bold text-zinc-300 leading-relaxed text-right",
          "opacity-0 pointer-events-none group-hover/tip:opacity-100",
          "transition-opacity duration-200",
          posClass
        )}
      >
        {text}
        {/* Arrow */}
        {position === "top" && (
          <div className="absolute top-full right-3 border-4 border-transparent border-t-zinc-900" />
        )}
        {position === "bottom" && (
          <div className="absolute bottom-full right-3 border-4 border-transparent border-b-zinc-900" />
        )}
      </div>
    </div>
  );
}
