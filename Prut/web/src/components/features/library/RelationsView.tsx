"use client";

import { useState } from "react";
import { Crosshair, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonalPrompt } from "@/lib/types";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PromptGraphView } from "./PromptGraphView";
import { PalaceFocusPanel } from "./memory-palace/PalaceFocusPanel";

/**
 * "קשרים" — one screen, two modes.
 *
 * The product shipped two separate implementations of "what relates to what",
 * under three different names, behind six entry points:
 *
 *   - PromptGraphView, "מפת הקשרים" / "תצוגת גרף", reachable only from a
 *     md-only header toggle, an sm-only top-nav button, and a mobile tab that
 *     was buried under the global tab bar. In practice: desktop only.
 *   - MemoryPalace, "קרבה" (and `aria-label="Memory Palace"`), a permanent
 *     320px third column on desktop that squeezed the grid, plus a per-card
 *     drawer on mobile.
 *
 * They are the same idea at two zoom levels, so they are now two modes of one
 * screen with one name: מפה (the whole library) and מיקוד (the neighbourhood of
 * a single prompt). One entry point, available at every width.
 */
export type RelationsMode = "map" | "focus";

interface Props {
  prompts: PersonalPrompt[];
  promptCount: number;
  favoriteIds: Set<string>;
  isLoading?: boolean;
  truncatedAt?: { shown: number; total: number } | null;
  selectedPromptId: string | null;
  lastOpenedPromptId?: string | null;
  onSelectPrompt: (id: string) => void;
  onOpenPrompt: (id: string) => void;
  onUsePrompt: (p: PersonalPrompt) => void;
}

const MODES: { key: RelationsMode; label: string; icon: typeof Network; hint: string }[] = [
  { key: "map", label: "מפה", icon: Network, hint: "כל הספרייה כרשת" },
  { key: "focus", label: "מיקוד", icon: Crosshair, hint: "מה קרוב לפרומפט אחד" },
];

export function RelationsView({
  prompts,
  promptCount,
  favoriteIds,
  isLoading,
  truncatedAt,
  selectedPromptId,
  lastOpenedPromptId,
  onSelectPrompt,
  onOpenPrompt,
  onUsePrompt,
}: Props) {
  const [mode, setMode] = useState<RelationsMode>("map");
  const active = MODES.find((m) => m.key === mode)!;

  return (
    <div dir="rtl" className="flex flex-col">
      {/* Mode switch. Both modes are one tap apart at every width; the focus
          view used to exist only as a desktop column and a per-card drawer. */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="flex items-center rounded-lg border border-(--glass-border) overflow-hidden"
          role="group"
          aria-label="מצב תצוגת קשרים"
        >
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={cn(
                "flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                mode === key
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg)",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <span className="text-xs text-(--text-muted) truncate">{active.hint}</span>
      </div>

      {mode === "map" ? (
        <ErrorBoundary name="RelationsMap">
          <PromptGraphView
            prompts={prompts}
            favoriteIds={favoriteIds}
            onUsePrompt={onUsePrompt}
            isLoading={isLoading}
            truncatedAt={truncatedAt}
          />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary name="RelationsFocus">
          <PalaceFocusPanel
            prompts={prompts}
            promptCount={promptCount}
            selectedPromptId={selectedPromptId}
            lastOpenedPromptId={lastOpenedPromptId}
            onSelectPrompt={onSelectPrompt}
            onOpenPrompt={onOpenPrompt}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
