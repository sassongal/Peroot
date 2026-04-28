"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
import { getAccent } from "@/lib/capability-palette";
import { cn } from "@/lib/utils";
import { LayoutGrid, MessageSquare, Globe, Palette, Bot, Video, LucideIcon } from "lucide-react";

const ICONS: Record<IconName, LucideIcon> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
};

function getFilterVars(
  colorKey: string,
  isSelected: boolean,
): React.CSSProperties & { "--chip-accent": string } {
  const { accent, shadowRgb } = getAccent(colorKey);
  return {
    "--chip-accent": accent,
    boxShadow: isSelected ? `0 0 10px -2px rgba(${shadowRgb},0.4)` : undefined,
  };
}

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
  className,
}: CapabilityFilterProps) {
  const modes = Object.values(CapabilityMode);

  // Total count across all specific capabilities (excluding null/all for now, or just sum logic elsewhere)
  // For UI simplicity we won't show "All" count unless provided

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-1",
        className,
      )}
    >
      <button
        onClick={() => onChange(null)}
        className={cn(
          "shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium border transition-all duration-200",
          value === null
            ? "bg-white/10 text-white border-white/20 shadow-sm"
            : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200",
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span>הכל</span>
      </button>

      <div className="w-px h-5 bg-white/10 shrink-0 hidden sm:block" />

      {modes.map((mode) => {
        const config = CAPABILITY_CONFIGS[mode];
        const Icon = ICONS[config.icon];
        const isSelected = value === mode;
        const count = counts[mode] || 0;

        return (
          <button
            key={mode}
            onClick={() => onChange(isSelected ? null : mode)}
            style={getFilterVars(config.color, isSelected)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium border transition-all duration-200",
              isSelected
                ? cn(
                    "[background-color:color-mix(in_oklab,var(--chip-accent)_55%,transparent)]",
                    "[border-color:var(--chip-accent)]",
                    "[color:color-mix(in_oklab,var(--chip-accent)_45%,black)]",
                    "dark:[color:color-mix(in_oklab,var(--chip-accent)_55%,white)]",
                  )
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5",
            )}
            title={config.descriptionHe}
          >
            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>{config.labelHe}</span>
            {count > 0 && (
              <span
                className={cn(
                  "ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/20",
                  isSelected ? "text-current opacity-80" : "text-slate-500",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
