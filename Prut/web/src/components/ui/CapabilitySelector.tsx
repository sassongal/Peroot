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

/** Staggered shimmer delays so each chip animates independently (7s cycle, evenly spread) */
const SHIMMER_DELAYS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "0s",
  [CapabilityMode.DEEP_RESEARCH]: "1.4s",
  [CapabilityMode.IMAGE_GENERATION]: "2.8s",
  [CapabilityMode.AGENT_BUILDER]: "4.2s",
  [CapabilityMode.VIDEO_GENERATION]: "5.6s",
};

interface ChipColors {
  base: string;
  selected: string;
  shadow: string;
}

const COLOR_CLASSES: Record<string, ChipColors> = {
  sky: {
    base: "border-sky-300/50 bg-sky-100/20 text-sky-600 dark:border-sky-400/25 dark:bg-sky-300/[0.06] dark:text-sky-300",
    selected: "border-sky-400/60 bg-sky-200/35 text-sky-700 dark:border-sky-400/50 dark:bg-sky-300/15 dark:text-sky-200",
    shadow: "0 0 16px -3px rgba(56,189,248,0.35)",
  },
  emerald: {
    base: "border-emerald-300/50 bg-emerald-100/20 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-300/[0.06] dark:text-emerald-300",
    selected: "border-emerald-400/60 bg-emerald-200/35 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-300/15 dark:text-emerald-200",
    shadow: "0 0 16px -3px rgba(52,211,153,0.35)",
  },
  purple: {
    base: "border-violet-300/50 bg-violet-100/20 text-violet-600 dark:border-violet-400/25 dark:bg-violet-300/[0.06] dark:text-violet-300",
    selected: "border-violet-400/60 bg-violet-200/35 text-violet-700 dark:border-violet-400/50 dark:bg-violet-300/15 dark:text-violet-200",
    shadow: "0 0 16px -3px rgba(167,139,250,0.35)",
  },
  amber: {
    base: "border-amber-300/50 bg-amber-100/20 text-amber-600 dark:border-amber-400/25 dark:bg-amber-300/[0.06] dark:text-amber-300",
    selected: "border-amber-400/60 bg-amber-200/35 text-amber-700 dark:border-amber-400/50 dark:bg-amber-300/15 dark:text-amber-200",
    shadow: "0 0 16px -3px rgba(251,191,36,0.35)",
  },
  rose: {
    base: "border-pink-300/50 bg-pink-100/20 text-pink-600 dark:border-pink-400/25 dark:bg-pink-300/[0.06] dark:text-pink-300",
    selected: "border-pink-400/60 bg-pink-200/35 text-pink-700 dark:border-pink-400/50 dark:bg-pink-300/15 dark:text-pink-200",
    shadow: "0 0 16px -3px rgba(249,168,212,0.35)",
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
        "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory min-w-0",
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
            style={
              isSelected && !isComingSoon && !isLocked ? { boxShadow: colors.shadow } : undefined
            }
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
