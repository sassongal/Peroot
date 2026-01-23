"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
import { cn } from "@/lib/utils";
import { LayoutGrid, MessageSquare, Globe, Palette, Bot, LucideIcon } from "lucide-react";

const ICONS: Record<IconName, LucideIcon> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
};

const COLOR_CLASSES: Record<string, { selected: string; default: string }> = {
  sky: {
    selected: "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_10px_-2px_rgba(14,165,233,0.3)]",
    default: "hover:bg-sky-500/10 hover:text-sky-200 hover:border-sky-500/20",
  },
  emerald: {
    selected: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_-2px_rgba(16,185,129,0.3)]",
    default: "hover:bg-emerald-500/10 hover:text-emerald-200 hover:border-emerald-500/20",
  },
  purple: {
    selected: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_-2px_rgba(168,85,247,0.3)]",
    default: "hover:bg-purple-500/10 hover:text-purple-200 hover:border-purple-500/20",
  },
  amber: {
    selected: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_-2px_rgba(245,158,11,0.3)]",
    default: "hover:bg-amber-500/10 hover:text-amber-200 hover:border-amber-500/20",
  },
};

interface CapabilityFilterProps {
  value: CapabilityMode | null;
  onChange: (mode: CapabilityMode | null) => void;
  counts?: Partial<Record<CapabilityMode, number>>;
  className?: string;
}

export function CapabilityFilter({ 
  value, 
  onChange, 
  counts = {}, 
  className 
}: CapabilityFilterProps) {
  const modes = Object.values(CapabilityMode);
  
  // Total count across all specific capabilities (excluding null/all for now, or just sum logic elsewhere)
  // For UI simplicity we won't show "All" count unless provided
  
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        onClick={() => onChange(null)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200",
          value === null
            ? "bg-white/10 text-white border-white/20 shadow-sm"
            : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>הכל</span>
      </button>
      
      <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

      {modes.map((mode) => {
        const config = CAPABILITY_CONFIGS[mode];
        const Icon = ICONS[config.icon];
        const isSelected = value === mode;
        const colorClasses = COLOR_CLASSES[config.color];
        const count = counts[mode] || 0;

        return (
          <button
            key={mode}
            onClick={() => onChange(isSelected ? null : mode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200",
              isSelected
                ? colorClasses.selected
                : cn("bg-transparent text-slate-400 border-transparent", colorClasses.default)
            )}
            title={config.descriptionHe}
          >
            <Icon className="w-4 h-4" />
            <span>{config.labelHe}</span>
            {count > 0 && (
              <span className={cn(
                "ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/20",
                isSelected ? "text-current opacity-80" : "text-slate-500"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
