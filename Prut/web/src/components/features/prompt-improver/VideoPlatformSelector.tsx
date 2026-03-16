"use client";

import { cn } from "@/lib/utils";
import { VIDEO_PLATFORMS, VideoPlatform } from "@/lib/video-platforms";

interface VideoPlatformSelectorProps {
  selectedPlatform: VideoPlatform;
  onPlatformChange: (platform: VideoPlatform) => void;
  disabled?: boolean;
}

export function VideoPlatformSelector({
  selectedPlatform,
  onPlatformChange,
  disabled,
}: VideoPlatformSelectorProps) {
  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="text-[11px] text-slate-500 uppercase tracking-widest px-1">פלטפורמת וידאו</div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1">
        {VIDEO_PLATFORMS.map((platform) => {
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
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/5",
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
    </div>
  );
}
