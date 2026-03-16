"use client";

import { cn } from "@/lib/utils";
import { IMAGE_PLATFORMS, ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";

interface ImagePlatformSelectorProps {
  selectedPlatform: ImagePlatform;
  onPlatformChange: (platform: ImagePlatform) => void;
  outputFormat: ImageOutputFormat;
  onOutputFormatChange: (format: ImageOutputFormat) => void;
  disabled?: boolean;
}

export function ImagePlatformSelector({
  selectedPlatform,
  onPlatformChange,
  outputFormat,
  onOutputFormatChange,
  disabled,
}: ImagePlatformSelectorProps) {
  const selectedConfig = IMAGE_PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="text-[11px] text-slate-500 uppercase tracking-widest px-1">פלטפורמת תמונה</div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1">
        {IMAGE_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          const isEmoji = platform.icon.length <= 2 && /\p{Emoji}/u.test(platform.icon);
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
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-purple-500/30 hover:bg-purple-500/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
              title={platform.description}
            >
              {isEmoji ? (
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

      {/* SD JSON/Text toggle */}
      {selectedConfig?.supportsJson && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-slate-500">פורמט פלט:</span>
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOutputFormatChange('text')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium transition-colors",
                outputFormat === 'text'
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-slate-400 hover:bg-white/5"
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
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-slate-400 hover:bg-white/5"
              )}
            >
              JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
