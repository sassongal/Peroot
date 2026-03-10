"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Palette, Bot, LucideIcon } from "lucide-react";

const ICONS: Record<IconName, LucideIcon> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
};

const COLOR_CLASSES: Record<string, { selected: string; default: string }> = {
  sky: {
    selected: "border-sky-500/50 bg-sky-500/10 text-sky-300",
    default: "hover:border-sky-500/30 hover:bg-sky-500/5",
  },
  emerald: {
    selected: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    default: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
  },
  purple: {
    selected: "border-purple-500/50 bg-purple-500/10 text-purple-300",
    default: "hover:border-purple-500/30 hover:bg-purple-500/5",
  },
  amber: {
    selected: "border-amber-500/50 bg-amber-500/10 text-amber-300",
    default: "hover:border-amber-500/30 hover:bg-amber-500/5",
  },
};

interface CapabilitySelectorProps {
  value: CapabilityMode;
  onChange: (mode: CapabilityMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function CapabilitySelector({ 
  value, 
  onChange, 
  disabled,
  compact = false,
}: CapabilitySelectorProps) {
  const modes = Object.values(CapabilityMode);

  return (
    <div className={cn(
      "flex overflow-x-auto scrollbar-none snap-x snap-mandatory min-w-0",
      compact ? "gap-1.5" : "gap-3"
    )}>
      {modes.map((mode) => {
        const config = CAPABILITY_CONFIGS[mode];
        const Icon = ICONS[config.icon];
        const isSelected = value === mode;
        const colorClasses = COLOR_CLASSES[config.color];
        const isComingSoon = mode === CapabilityMode.AGENT_BUILDER;

        return (
          <button
            key={mode}
            type="button"
            disabled={disabled || isComingSoon}
            onClick={() => !isComingSoon && onChange(mode)}
            className={cn(
              "flex items-center gap-2 rounded-xl border transition-all duration-200 relative",
              "hover:scale-[1.02] active:scale-[0.98] snap-start shrink-0",
              compact ? "px-3 py-2" : "px-4 py-3",
              isComingSoon
                ? "opacity-50 cursor-not-allowed border-white/10 bg-white/[0.02] text-slate-500"
                : isSelected
                  ? colorClasses.selected
                  : cn(
                      "border-white/10 bg-white/[0.02] text-slate-400",
                      colorClasses.default
                    ),
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-pressed={isSelected}
            title={isComingSoon ? "בקרוב" : config.descriptionHe}
          >
            <Icon className={cn("shrink-0", compact ? "w-4 h-4" : "w-5 h-5")} />
            <span className={cn("font-medium", compact ? "text-sm" : "text-base")}>
              {config.labelHe}
            </span>
            {isComingSoon && (
              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                בקרוב
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
