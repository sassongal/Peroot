"use client";

import { CapabilityMode, CAPABILITY_CONFIGS, IconName } from "@/lib/capability-mode";
import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Palette, Bot, Video, Lock, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const ICONS: Record<IconName, LucideIcon> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
};

/** Modes shown in the UI but not yet available */
const COMING_SOON_MODES = new Set<CapabilityMode>([]);

const COLOR_CLASSES: Record<string, { selected: string; default: string }> = {
  sky: {
    selected: "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    default: "hover:border-sky-500/30 hover:bg-sky-500/5",
  },
  emerald: {
    selected: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    default: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
  },
  purple: {
    selected: "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    default: "hover:border-purple-500/30 hover:bg-purple-500/5",
  },
  amber: {
    selected: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    default: "hover:border-amber-500/30 hover:bg-amber-500/5",
  },
  rose: {
    selected: "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    default: "hover:border-rose-500/30 hover:bg-rose-500/5",
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
  const isNonStandard = value !== CapabilityMode.STANDARD;

  // Auto-expand when user has selected a non-standard mode so we never hide their selection.
  const [isExpanded, setIsExpanded] = useState(false);

  const showExpanded = isExpanded || isNonStandard;

  const renderModeButton = (mode: CapabilityMode) => {
    const config = CAPABILITY_CONFIGS[mode];
    const Icon = ICONS[config.icon];
    const isSelected = value === mode;
    const colorClasses = COLOR_CLASSES[config.color];
    const isComingSoon = COMING_SOON_MODES.has(mode);

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
          onChange(mode);
        }}
        className={cn(
          "flex items-center gap-2 rounded-xl border transition-all duration-200 relative",
          "hover:scale-[1.02] active:scale-[0.98] snap-start shrink-0",
          compact ? "px-3 py-2" : "px-4 py-3",
          isComingSoon
            ? "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed opacity-60"
            : isSelected
              ? colorClasses.selected
              : cn(
                  "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)]",
                  colorClasses.default
                ),
          disabled && !isComingSoon && "opacity-50 cursor-not-allowed"
        )}
        aria-pressed={isComingSoon ? false : isSelected}
        title={isComingSoon ? "בקרוב" : config.descriptionHe}
      >
        <Icon className={cn("shrink-0", compact ? "w-4 h-4" : "w-5 h-5")} />
        <span className={cn("font-medium", compact ? "text-sm" : "text-base")}>
          {config.labelHe}
        </span>
        {isComingSoon && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
            <Lock className="w-3 h-3" />
            בקרוב
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={cn(
      "flex overflow-x-auto scrollbar-none snap-x snap-mandatory min-w-0",
      compact ? "gap-1.5" : "gap-3"
    )}>
      {showExpanded ? (
        <>
          {modes.map((mode) => renderModeButton(mode))}
          {/* Collapse button - only show when user manually expanded (non-standard selection keeps it open without a toggle) */}
          {!isNonStandard && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className={cn(
                "flex items-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)]",
                "hover:border-black/20 dark:hover:border-white/20 hover:text-[var(--text-secondary)] transition-all duration-200 shrink-0 snap-start",
                compact ? "px-2.5 py-2 text-sm" : "px-3 py-3 text-base"
              )}
              title="סגור"
              aria-label="סגור מצבים נוספים"
            >
              −
            </button>
          )}
        </>
      ) : (
        <>
          {renderModeButton(CapabilityMode.STANDARD)}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={cn(
              "flex items-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)]",
              "hover:border-black/20 dark:hover:border-white/20 hover:text-[var(--text-primary)] transition-all duration-200 shrink-0 snap-start font-medium",
              compact ? "px-3 py-2 text-sm" : "px-4 py-3 text-base"
            )}
            title="הצג מצבים נוספים"
            aria-label="הצג מצבים נוספים"
          >
            עוד מצבים +
          </button>
        </>
      )}
    </div>
  );
}
