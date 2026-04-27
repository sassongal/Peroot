"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
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

/** Staggered shimmer delays so each chip animates independently */
const SHIMMER_DELAYS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "0s",
  [CapabilityMode.DEEP_RESEARCH]: "0.55s",
  [CapabilityMode.IMAGE_GENERATION]: "1.1s",
  [CapabilityMode.AGENT_BUILDER]: "1.65s",
  [CapabilityMode.VIDEO_GENERATION]: "2.2s",
};

interface ChipColors {
  base: string;
  selected: string;
  shadow: string;
}

const COLOR_CLASSES: Record<string, ChipColors> = {
  sky: {
    base: "border-sky-500/40 bg-sky-500/[0.07] text-sky-600 dark:text-sky-300",
    selected: "border-sky-500/70 bg-sky-500/15 text-sky-500 dark:text-sky-200",
    shadow: "0 0 14px -2px rgba(14,165,233,0.5)",
  },
  emerald: {
    base: "border-emerald-500/40 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-300",
    selected: "border-emerald-500/70 bg-emerald-500/15 text-emerald-500 dark:text-emerald-200",
    shadow: "0 0 14px -2px rgba(16,185,129,0.5)",
  },
  purple: {
    base: "border-purple-500/40 bg-purple-500/[0.07] text-purple-600 dark:text-purple-300",
    selected: "border-purple-500/70 bg-purple-500/15 text-purple-500 dark:text-purple-200",
    shadow: "0 0 14px -2px rgba(168,85,247,0.5)",
  },
  amber: {
    base: "border-amber-500/40 bg-amber-500/[0.07] text-amber-600 dark:text-amber-300",
    selected: "border-amber-500/70 bg-amber-500/15 text-amber-500 dark:text-amber-200",
    shadow: "0 0 14px -2px rgba(245,158,11,0.5)",
  },
  rose: {
    base: "border-rose-500/40 bg-rose-500/[0.07] text-rose-600 dark:text-rose-300",
    selected: "border-rose-500/70 bg-rose-500/15 text-rose-500 dark:text-rose-200",
    shadow: "0 0 14px -2px rgba(244,63,94,0.5)",
  },
};

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
        "flex overflow-x-auto scrollbar-none snap-x snap-mandatory min-w-0",
        compact ? "gap-1.5" : "gap-2",
      )}
    >
      {modes.map((mode) => {
        const config = CAPABILITY_CONFIGS[mode];
        const Icon = ICONS[config.icon];
        const isSelected = value === mode;
        const colors = COLOR_CLASSES[config.color];
        const isComingSoon = COMING_SOON_MODES.has(mode);
        const isLocked = isGuest && mode !== CapabilityMode.STANDARD && !isComingSoon;
        const shimmerDelay = SHIMMER_DELAYS[mode];

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
            style={isSelected && !isComingSoon && !isLocked ? { boxShadow: colors.shadow } : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-full border overflow-hidden snap-start shrink-0",
              "transition-all duration-200 cursor-pointer",
              compact ? "px-3 py-1.5" : "px-4 py-2.5",
              isComingSoon
                ? "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) cursor-not-allowed opacity-50"
                : isLocked
                  ? "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) opacity-60 hover:opacity-80"
                  : isSelected
                    ? cn(colors.selected, "scale-105")
                    : cn(
                        colors.base,
                        isNonStandard && "opacity-60 hover:opacity-90",
                        "hover:scale-[1.03] active:scale-[0.97]",
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
                className="chip-shimmer pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                style={{ animationDelay: shimmerDelay }}
              />
            )}

            <Icon className={cn("relative shrink-0", compact ? "w-4 h-4" : "w-4 h-4")} />
            <span className={cn("relative font-semibold", compact ? "text-sm" : "text-sm")}>
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
