"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CapabilityMode, CAPABILITY_CONFIGS } from "@/lib/capability-mode";

interface ActiveFilterChipsProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  capabilityFilter?: CapabilityMode | null;
  onClearCapability?: () => void;
  favoritesMode?: boolean;
  onClearFavorites?: () => void;
  activeCollection?: string | null;
  activeCollectionLabel?: string;
  onClearCollection?: () => void;
  className?: string;
}

export function ActiveFilterChips({
  searchQuery,
  onClearSearch,
  capabilityFilter,
  onClearCapability,
  favoritesMode,
  onClearFavorites,
  activeCollection,
  activeCollectionLabel,
  onClearCollection,
  className,
}: ActiveFilterChipsProps) {
  const hasAny = !!(searchQuery?.trim()) || !!capabilityFilter || favoritesMode || !!activeCollection;
  if (!hasAny) return null;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)} dir="rtl">
      <span className="text-[10px] text-(--text-muted) shrink-0">פילטרים:</span>

      {searchQuery?.trim() && (
        <Chip label={`חיפוש: ${searchQuery.trim()}`} onRemove={onClearSearch} />
      )}

      {capabilityFilter && (
        <Chip
          label={CAPABILITY_CONFIGS[capabilityFilter]?.labelHe || capabilityFilter}
          onRemove={onClearCapability}
          color="purple"
        />
      )}

      {favoritesMode && (
        <Chip label="מועדפים" onRemove={onClearFavorites} color="yellow" />
      )}

      {activeCollection && activeCollectionLabel && (
        <Chip label={activeCollectionLabel} onRemove={onClearCollection} color="amber" />
      )}
    </div>
  );
}

function Chip({
  label,
  onRemove,
  color = "default",
}: {
  label: string;
  onRemove?: () => void;
  color?: "default" | "purple" | "yellow" | "amber";
}) {
  const colorClasses = {
    default: "bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)]",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-300",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors",
      colorClasses[color]
    )}>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label={`הסר פילטר ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
