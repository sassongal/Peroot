"use client";

import { cn } from "@/lib/utils";
import { IMAGE_PLATFORMS, ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { IMAGE_PLATFORM_ICONS } from "@/components/ui/PlatformIcons";

const ASPECT_RATIO_OPTIONS = [
  { value: '', label: 'אוטומטי' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
] as const;

interface ImagePlatformSelectorProps {
  selectedPlatform: ImagePlatform;
  onPlatformChange: (platform: ImagePlatform) => void;
  outputFormat: ImageOutputFormat;
  onOutputFormatChange: (format: ImageOutputFormat) => void;
  aspectRatio?: string;
  onAspectRatioChange?: (ratio: string) => void;
  disabled?: boolean;
}

export function ImagePlatformSelector({
  selectedPlatform,
  onPlatformChange,
  outputFormat,
  onOutputFormatChange,
  aspectRatio = '',
  onAspectRatioChange,
  disabled,
}: ImagePlatformSelectorProps) {
  const selectedConfig = IMAGE_PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="text-[11px] text-(--text-muted) uppercase tracking-widest px-1">פלטפורמת תמונה</div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {IMAGE_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          const isEmoji = platform.icon.length <= 2 && /\p{Emoji}/u.test(platform.icon);
          const IconComponent = IMAGE_PLATFORM_ICONS[platform.id];
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
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                  : "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:border-purple-500/30 hover:bg-purple-500/5",
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
                <span className="text-[10px] font-bold font-mono leading-none bg-black/10 dark:bg-white/10 rounded px-1 py-0.5">
                  {platform.icon}
                </span>
              )}
              <span className="text-xs font-medium whitespace-nowrap">{platform.nameHe}</span>
            </button>
          );
        })}
      </div>

      {/* JSON/Text toggle for platforms that support it */}
      {selectedConfig?.supportsJson && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-(--text-muted)">פורמט פלט:</span>
          <div className="flex rounded-md border border-(--glass-border) overflow-hidden">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOutputFormatChange('text')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium transition-colors",
                outputFormat === 'text'
                  ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                  : "text-(--text-muted) hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              רגיל
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOutputFormatChange('json')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium transition-colors",
                outputFormat === 'json'
                  ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                  : "text-(--text-muted) hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              JSON
            </button>
          </div>
        </div>
      )}

      {/* Aspect Ratio selector */}
      {onAspectRatioChange && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-(--text-muted)">יחס תמונה:</span>
          <div className="flex rounded-md border border-(--glass-border) overflow-hidden">
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onAspectRatioChange(option.value)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium transition-colors",
                  aspectRatio === option.value
                    ? "bg-purple-500/20 text-purple-300"
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
