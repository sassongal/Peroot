"use client";

import { cn } from "@/lib/utils";
import { LibraryPrompt } from "@/lib/types";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { DateBadge } from "@/components/ui/DateBadge";
import { calculatePromptStrength, getStrengthInfo } from "@/lib/prompt-strength";
import {
  Star, Plus, Copy, BookOpen, ImageIcon,
  ChevronDown, ChevronUp,
  CheckSquare, Square,
} from "lucide-react";
import { useMemo, useState } from "react";

interface PromptCardProps {
  prompt: LibraryPrompt;
  isBlurred?: boolean;
  isFavorite: boolean;
  isExpanded: boolean;
  popularityCount: number;
  categoryLabel: string;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleFavorite: () => void;
  onToggleSelection: () => void;
  onUsePrompt: () => void;
  onSaveToPersonal: () => void;
  onCopy: () => void;
  onExportImage: () => void;
  onImageClick?: (url: string, title: string) => void;
  /** When true, star button copy explains local-only favorites for guests. */
  guestFavoriteHints?: boolean;
}

export function PromptCard({
  prompt,
  isBlurred = false,
  isFavorite,
  isExpanded,
  popularityCount,
  categoryLabel,
  selectionMode,
  isSelected,
  onToggleExpand,
  onToggleFavorite,
  onToggleSelection,
  onUsePrompt,
  onSaveToPersonal,
  onCopy,
  onExportImage,
  onImageClick,
  guestFavoriteHints = false,
}: PromptCardProps) {
  const [hovered, setHovered] = useState(false);

  const strength = useMemo(() => calculatePromptStrength(prompt), [prompt]);
  const strengthInfo = getStrengthInfo(strength.score);

  const variableCount = prompt.variables.length;

  const favStarLabel = guestFavoriteHints
    ? (isFavorite ? "הסר ממועדפים מקומיים" : "הוסף למועדפים במכשיר זה — התחבר לסנכרון בענן")
    : (isFavorite ? "הסר ממועדפים" : "הוסף למועדפים");

  return (
    <div
      className={cn(
        "rounded-xl md:rounded-2xl border border-[var(--glass-border)] bg-black/5 dark:bg-black/30 transition-colors relative group",
        !isBlurred && "hover:bg-white/[0.04]",
        !isBlurred && (isSelected || selectionMode) && "ring-2 ring-amber-500/50 bg-amber-500/5",
        isBlurred && "blur-sm pointer-events-none select-none"
      )}
      aria-hidden={isBlurred ? "true" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection Checkbox */}
      {!isBlurred && (
        <div className={cn(
          "absolute top-3 start-3 z-10 transition-opacity duration-200",
          (isSelected || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <button onClick={(e) => { e.stopPropagation(); onToggleSelection(); }} aria-label={isSelected ? "בטל בחירה" : "בחר פריט"}>
            {isSelected
              ? <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-500/20" />
              : <Square className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />}
          </button>
        </div>
      )}

      {/* Compact Header - always visible */}
      <button
        type="button"
        onClick={() => !isBlurred && onToggleExpand()}
        className="w-full text-right p-3 md:p-4 flex items-center gap-3 cursor-pointer"
        dir="rtl"
      >
        {/* Favorite star */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={cn(
            "shrink-0 p-1.5 rounded-full transition-colors",
            isFavorite ? "text-yellow-400" : "text-slate-600 hover:text-[var(--text-muted)]"
          )}
          aria-pressed={isFavorite}
          title={favStarLabel}
          aria-label={favStarLabel}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-yellow-400")} />
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base text-slate-800 dark:text-slate-100 font-semibold leading-tight truncate">{prompt.title}</h3>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <CapabilityBadge mode={prompt.capability_mode} />
            {/* Strength badge */}
            <span className={cn("text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full border font-medium", strengthInfo.colorClass)}>
              {strength.score}
            </span>
            {/* Variables pill */}
            {variableCount > 0 && (
              <span
                className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium"
                title={prompt.variables.join(", ")}
              >
                {variableCount} משתנים
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{prompt.use_case}</p>
          {prompt.created_at && (
            <DateBadge
              entity={{
                createdAt: prompt.created_at,
                updatedAt: prompt.updated_at || prompt.created_at,
                lastUsedAt: prompt.last_used_at ?? null,
              }}
              mode="compact"
              className="mt-1"
            />
          )}
        </div>

        {/* Quick actions on hover (desktop) */}
        <div className={cn(
          "flex items-center gap-1 shrink-0 transition-opacity duration-150",
          hovered && !isBlurred ? "opacity-100" : "opacity-0 pointer-events-none",
          "max-md:hidden"
        )}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="p-1.5 rounded-md hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="העתק"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUsePrompt(); }}
            className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-medium text-[var(--text-primary)] transition-colors"
          >
            השתמש
          </button>
        </div>

        {/* Right side: category + popularity + expand icon */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded-full border border-[var(--glass-border)] text-[var(--text-muted)]">
            {categoryLabel}
          </span>
          {popularityCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              {popularityCount > 99 ? '99+' : popularityCount}
            </span>
          )}
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          }
        </div>
      </button>

      {/* Mobile quick actions - always visible */}
      {!isBlurred && !isExpanded && (
        <div className="flex items-center gap-1 px-3 pb-2 md:hidden" dir="rtl">
          <button
            onClick={onCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] text-xs hover:bg-white/10 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            העתק
          </button>
          <button
            onClick={onUsePrompt}
            className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg bg-white text-black text-xs hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            השתמש
          </button>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && !isBlurred && (
        <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-[var(--glass-border)]">
          {/* Prompt text */}
          <div className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed mt-3 whitespace-pre-wrap max-h-48 overflow-y-auto" dir="rtl">
            {prompt.prompt}
          </div>

          {/* Preview image */}
          {prompt.preview_image_url && (
            <button
              type="button"
              onClick={() => onImageClick?.(prompt.preview_image_url!, prompt.title)}
              className="relative w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden border border-[var(--glass-border)] group/img cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- library preview URLs vary; lazy native img */}
              <img
                src={prompt.preview_image_url}
                alt={`דוגמה: ${prompt.title}`}
                loading="lazy"
                decoding="async"
                width={400}
                height={300}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
              />
            </button>
          )}

          {/* Variables */}
          {prompt.variables.length > 0 && (
            <div className="flex flex-wrap gap-1.5" dir="rtl">
              {prompt.variables.map((variable) => (
                <span
                  key={variable}
                  className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)]"
                >
                  {variable}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap" dir="rtl">
            <button
              onClick={onUsePrompt}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-white text-black text-xs md:text-sm hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              השתמש
            </button>
            <button
              onClick={onSaveToPersonal}
              className="shrink-0 flex items-center gap-1.5 p-2 min-h-[44px] min-w-[44px] justify-center rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors cursor-pointer"
              title="שמור לספריה אישית"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline text-sm">שמור</span>
            </button>
            <button
              onClick={onCopy}
              className="shrink-0 flex items-center gap-1.5 p-2 min-h-[44px] min-w-[44px] justify-center rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors cursor-pointer"
              title="העתק"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden md:inline text-sm">העתק</span>
            </button>
            <button
              onClick={onExportImage}
              className="shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors cursor-pointer"
              title="ייצא כתמונה"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
