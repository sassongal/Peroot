"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/**
 * ONE platform picker for image + video modes (U4.3). The two previous
 * selectors were line-for-line duplicates that each invented its own hue
 * (image was indigo, video was rose); this one is colored by the caller
 * with the canonical ENGINE_HUE and never scales on hover (DESIGN.md:
 * transitions only, no translate/scale bounce).
 */

export interface PlatformPickerOption {
  id: string;
  nameHe: string;
  /** Platform id for an SVG icon, or an emoji, or short code text. */
  icon: string;
  description?: string;
  supportsJson?: boolean;
}

interface PlatformPickerProps {
  /** Row label, e.g. "פלטפורמת תמונה". */
  label: string;
  /** Canonical engine hue hex (ENGINE_HUE[mode]). */
  hue: string;
  platforms: readonly PlatformPickerOption[];
  icons: Record<string, ComponentType<{ className?: string }> | undefined>;
  selected: string;
  onSelect: (id: string) => void;
  /** Description of the selected platform, shown under the label when given. */
  selectedDescription?: string;
  aspectRatios?: readonly { value: string; label: string }[];
  aspectRatio?: string;
  onAspectRatioChange?: (ratio: string) => void;
  /** JSON/text output toggle — rendered when the selected platform supports it. */
  outputFormat?: "text" | "json";
  onOutputFormatChange?: (format: "text" | "json") => void;
  disabled?: boolean;
}

export function PlatformPicker({
  label,
  hue,
  platforms,
  icons,
  selected,
  onSelect,
  selectedDescription,
  aspectRatios,
  aspectRatio = "",
  onAspectRatioChange,
  outputFormat,
  onOutputFormatChange,
  disabled,
}: PlatformPickerProps) {
  const selectedConfig = platforms.find((p) => p.id === selected);
  const showJsonToggle = !!selectedConfig?.supportsJson && !!onOutputFormatChange;

  return (
    <div
      className="flex flex-col gap-2"
      dir="rtl"
      style={
        {
          "--pk-border": `${hue}80`,
          "--pk-border-soft": `${hue}4d`,
          "--pk-bg": `${hue}1a`,
          "--pk-bg-soft": `${hue}0d`,
          "--pk-bg-strong": `${hue}33`,
          "--pk-text": hue,
        } as React.CSSProperties
      }
    >
      <div className="text-[11px] text-(--text-muted) uppercase tracking-widest px-1">{label}</div>
      {selectedDescription && (
        <p className="text-[10px] text-(--text-muted) px-1 leading-snug hidden sm:block">
          {selectedDescription}
        </p>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {platforms.map((platform) => {
          const isSelected = selected === platform.id;
          const isEmoji = platform.icon.length <= 2 && /\p{Emoji}/u.test(platform.icon);
          const IconComponent = icons[platform.id];
          return (
            <button
              key={platform.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(platform.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border transition-colors duration-200 px-2.5 py-1.5 min-h-[44px] snap-start shrink-0 cursor-pointer",
                isSelected
                  ? "border-(--pk-border) bg-(--pk-bg) text-(--pk-text)"
                  : "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:border-(--pk-border-soft) hover:bg-(--pk-bg-soft)",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              aria-pressed={isSelected}
              title={platform.description}
            >
              {IconComponent ? (
                <IconComponent className="w-4 h-4 shrink-0" />
              ) : isEmoji ? (
                <span className="text-sm">{platform.icon}</span>
              ) : (
                <span className="text-[10px] font-bold font-mono leading-none bg-black/10 dark:bg-white/10 rounded px-1 py-0.5">
                  {platform.icon}
                </span>
              )}
              <span className="text-xs font-medium whitespace-nowrap">{platform.nameHe}</span>
            </button>
          );
        })}
      </div>

      {showJsonToggle && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-(--text-muted)">פורמט פלט:</span>
          <div className="flex rounded-md border border-(--glass-border) overflow-hidden">
            {(["text", "json"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={disabled}
                onClick={() => onOutputFormatChange?.(fmt)}
                className={cn(
                  "px-2.5 py-1 min-h-[44px] text-[11px] font-medium transition-colors cursor-pointer",
                  outputFormat === fmt
                    ? "bg-(--pk-bg-strong) text-(--pk-text)"
                    : "text-(--text-muted) hover:bg-black/5 dark:hover:bg-white/5",
                )}
              >
                {fmt === "text" ? "רגיל" : "JSON"}
              </button>
            ))}
          </div>
        </div>
      )}

      {onAspectRatioChange && aspectRatios && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-(--text-muted)">יחס תמונה:</span>
          <div className="flex rounded-md border border-(--glass-border) overflow-hidden">
            {aspectRatios.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onAspectRatioChange(option.value)}
                className={cn(
                  "px-2.5 py-1 min-h-[44px] text-[11px] font-medium transition-colors cursor-pointer",
                  aspectRatio === option.value
                    ? "bg-(--pk-bg-strong) text-(--pk-text)"
                    : "text-(--text-muted) hover:bg-black/5 dark:hover:bg-white/5",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
