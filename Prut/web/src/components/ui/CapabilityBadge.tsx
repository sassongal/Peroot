"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
import { getAccent } from "@/lib/capability-palette";
import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Palette, Bot, Video, LucideIcon } from "lucide-react";

const ICONS: Record<IconName, LucideIcon> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
};

function getBadgeVars(colorKey: string): React.CSSProperties & { "--chip-accent": string } {
  return { "--chip-accent": getAccent(colorKey).accent };
}

interface CapabilityBadgeProps {
  mode?: CapabilityMode;
  className?: string;
  showLabel?: boolean;
}

export function CapabilityBadge({ 
  mode = CapabilityMode.STANDARD,
  className,
  showLabel = true
}: CapabilityBadgeProps) {
  const config = CAPABILITY_CONFIGS[mode] || CAPABILITY_CONFIGS[CapabilityMode.STANDARD];
  const Icon = ICONS[config.icon];

  return (
    <div
      style={getBadgeVars(config.color)}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium backdrop-blur-sm shadow-sm",
        "[background-color:color-mix(in_oklab,var(--chip-accent)_25%,transparent)]",
        "[border-color:color-mix(in_oklab,var(--chip-accent)_50%,transparent)]",
        "[color:color-mix(in_oklab,var(--chip-accent)_40%,black)]",
        "dark:[color:color-mix(in_oklab,var(--chip-accent)_60%,white)]",
        className,
      )}
      title={config.descriptionHe}
    >
      <Icon className="w-3 h-3" />
      {showLabel && <span>{config.labelHe}</span>}
    </div>
  );
}
