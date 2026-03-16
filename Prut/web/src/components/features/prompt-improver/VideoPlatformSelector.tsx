"use client";

import { cn } from "@/lib/utils";
import { VIDEO_PLATFORMS, VideoPlatform } from "@/lib/video-platforms";
import { VIDEO_PLATFORM_ICONS } from "@/components/ui/PlatformIcons";

const ASPECT_RATIO_OPTIONS = [
  { value: '', label: 'אוטומטי' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
] as const;

interface VideoPlatformSelectorProps {
  selectedPlatform: VideoPlatform;
  onPlatformChange: (platform: VideoPlatform) => void;
  aspectRatio?: string;
  onAspectRatioChange?: (ratio: string) => void;
  disabled?: boolean;
}

export function VideoPlatformSelector({
  selectedPlatform,
  onPlatformChange,
  aspectRatio = '',
  onAspectRatioChange,
  disabled,
}: VideoPlatformSelectorProps) {
  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="text-[11px] text-slate-500 uppercase tracking-widest px-1">פלטפורמת וידאו</div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1">
        {VIDEO_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          const isEmoji = platform.icon.length <= 2 && /\p{Emoji}/u.test(platform.icon);
          const IconComponent = VIDEO_PLATFORM_ICONS[platform.id];
          return (
            <button
              key={platform.id}
              type="button"
              disabled={disabled}
              onClick={() => onPlatformChange(platform.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border transition-all duration-200 px-2.5 py-1.5 snap-start shrink-0",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
              title={platform.description}
            >
              {IconComponent ? (
                <IconComponent className="w-4 h-4 shrink-0" />
              ) : isEmoji ? (
                <span className="text-sm">{platform.icon}</span>
              ) : (
                <span className="text-[10px] font-bold font-mono leading-none bg-white/10 rounded px-1 py-0.5">
                  {platform.icon}
                </span>
              )}
              <span className="text-xs font-medium whitespace-nowrap">{platform.nameHe}</span>
            </button>
          );
        })}
      </div>

      {/* Aspect Ratio selector */}
      {onAspectRatioChange && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-slate-500">יחס תמונה:</span>
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onAspectRatioChange(option.value)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium transition-colors",
                  aspectRatio === option.value
                    ? "bg-rose-500/20 text-rose-300"
                    : "text-slate-400 hover:bg-white/5"
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
