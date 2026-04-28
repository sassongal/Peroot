"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
import { getAccent } from "@/lib/capability-palette";
import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Palette, Bot, Video, Lock, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ICONS: Record<IconName, LucideIcon> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
};

/** Modes shown in the UI but not yet available */
const COMING_SOON_MODES = new Set<CapabilityMode>([]);

/** Staggered shimmer delays so each chip animates independently (7s cycle, evenly spread) */
const SHIMMER_DELAYS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "0s",
  [CapabilityMode.DEEP_RESEARCH]: "1.4s",
  [CapabilityMode.IMAGE_GENERATION]: "2.8s",
  [CapabilityMode.AGENT_BUILDER]: "4.2s",
  [CapabilityMode.VIDEO_GENERATION]: "5.6s",
};

type ChipVars = React.CSSProperties & {
  "--chip-accent": string;
};

function getChipVars(colorKey: string, isSelected: boolean): ChipVars {
  const { accent, shadowRgb } = getAccent(colorKey);
  return {
    "--chip-accent": accent,
    boxShadow: isSelected ? `0 0 16px -3px rgba(${shadowRgb},0.45)` : undefined,
  };
}

interface CapabilitySelectorProps {
  value: CapabilityMode;
  onChange: (mode: CapabilityMode) => void;
  disabled?: boolean;
  compact?: boolean;
  /** @deprecated Modes are now open to all registered users. Kept for back-compat. */
  isPro?: boolean;
  /** Guest (unauthenticated) users are locked to STANDARD. */
  isGuest?: boolean;
}

export function CapabilitySelector({
  value,
  onChange,
  disabled,
  compact = false,
  isGuest = false,
}: CapabilitySelectorProps) {
  const router = useRouter();
  const modes = Object.values(CapabilityMode);

  useEffect(() => {
    if (isGuest && value !== CapabilityMode.STANDARD) {
      onChange(CapabilityMode.STANDARD);
    }
  }, [isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNonStandard = value !== CapabilityMode.STANDARD;

  return (
    <div
      className={cn(
        "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory min-w-0 px-0.5",
        compact ? "gap-1.5" : "gap-2",
      )}
    >
      {modes.map((mode) => {
        const config = CAPABILITY_CONFIGS[mode];
        const Icon = ICONS[config.icon];
        const isSelected = value === mode;
        const isComingSoon = COMING_SOON_MODES.has(mode);
        const isLocked = isGuest && mode !== CapabilityMode.STANDARD && !isComingSoon;
        const shimmerDelay = SHIMMER_DELAYS[mode];
        const usePastel = !isComingSoon && !isLocked;
        const pastelVars = usePastel ? getChipVars(config.color, isSelected) : undefined;

        return (
          <button
            key={mode}
            type="button"
            disabled={disabled || isComingSoon}
            onClick={() => {
              if (isComingSoon) {
                toast("מנוע הסרטונים בדרך! נעדכן אותך כשיהיה מוכן", { icon: "🎬" });
                return;
              }
              if (isLocked) {
                toast("התחבר כדי להשתמש במצב זה", { icon: "🔒" });
                router.push("/login");
                return;
              }
              onChange(mode);
            }}
            style={pastelVars}
            className={cn(
              "relative flex items-center gap-2 rounded-full border overflow-hidden snap-start shrink-0",
              "transition-all duration-200 cursor-pointer",
              compact ? "px-3 py-1.5" : "px-4 py-2.5",
              isComingSoon
                ? "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) cursor-not-allowed opacity-50"
                : isLocked
                  ? "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) opacity-60 hover:opacity-80"
                  : isSelected
                    ? cn(
                        "scale-105",
                        "[background-color:color-mix(in_oklab,var(--chip-accent)_60%,transparent)]",
                        "[border-color:var(--chip-accent)]",
                        "[color:color-mix(in_oklab,var(--chip-accent)_45%,black)]",
                        "dark:[color:color-mix(in_oklab,var(--chip-accent)_55%,white)]",
                      )
                    : cn(
                        isNonStandard && "opacity-60 hover:opacity-90",
                        "hover:scale-[1.03] active:scale-[0.97]",
                        "[background-color:color-mix(in_oklab,var(--chip-accent)_25%,transparent)]",
                        "[border-color:color-mix(in_oklab,var(--chip-accent)_55%,transparent)]",
                        "[color:color-mix(in_oklab,var(--chip-accent)_40%,black)]",
                        "dark:[color:color-mix(in_oklab,var(--chip-accent)_60%,white)]",
                      ),
              disabled && !isComingSoon && !isLocked && "opacity-40 cursor-not-allowed",
            )}
            aria-pressed={isComingSoon || isLocked ? false : isSelected}
            title={
              isComingSoon ? "בקרוב" : isLocked ? "התחבר כדי להשתמש במצב זה" : config.descriptionHe
            }
          >
            {/* shimmer sweep — disabled via CSS when prefers-reduced-motion */}
            {!isComingSoon && !isLocked && (
              <span
                aria-hidden
                className="chip-shimmer pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                style={{ animationDelay: shimmerDelay }}
              />
            )}

            <Icon className={cn("relative shrink-0", compact ? "w-4 h-4" : "w-5 h-5")} />
            <span className={cn("relative font-semibold", compact ? "text-sm" : "text-base")}>
              {config.labelHe}
            </span>

            {isComingSoon && (
              <span className="relative flex items-center gap-1 text-[10px] text-(--text-muted) bg-(--glass-bg) px-1.5 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                בקרוב
              </span>
            )}
            {isLocked && (
              <span className="relative flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                התחבר
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
