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

const COLOR_CLASSES: Record<string, string> = {
  sky: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

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
  const colors = COLOR_CLASSES[config.color];

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium backdrop-blur-sm shadow-sm",
        colors,
        className
      )}
      title={config.descriptionHe}
    >
      <Icon className="w-3 h-3" />
      {showLabel && <span>{config.labelHe}</span>}
    </div>
  );
}
