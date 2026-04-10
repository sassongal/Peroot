"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputScore } from "@/lib/engines/scoring/input-scorer";

interface QuickImprovementChipsProps {
  score: InputScore | null;
  onInsert: (text: string) => void;
  className?: string;
}

/**
 * Shows up to 3 contextual chips from the top missing scoring dimensions.
 * Clicking a chip appends the example template to the prompt input.
 */
export function QuickImprovementChips({ score, onInsert, className }: QuickImprovementChipsProps) {
  if (!score || score.level === "empty" || score.level === "elite") return null;

  const chips = score.missingTop
    .filter((m) => m.insertText)
    .slice(0, 3);

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)} dir="rtl">
      <Lightbulb className="w-3 h-3 text-amber-500/60 shrink-0" />
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onInsert(chip.insertText!)}
          className={cn(
            "text-[10px] md:text-xs px-2.5 py-1 rounded-lg",
            "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
            "hover:bg-amber-500/20 hover:border-amber-500/30 transition-colors",
            "cursor-pointer whitespace-nowrap"
          )}
          title={chip.why}
        >
          + {chip.title}
        </button>
      ))}
    </div>
  );
}
