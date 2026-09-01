"use client";

import { BookOpen, FolderOpen, Network, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePersonalLibraryFolders,
  usePersonalLibrarySidebar,
  usePersonalLibraryViewPrefs,
} from "./context/PersonalLibraryContext";

/**
 * The library's own scope controls on mobile: which slice you are looking at
 * (all / favorites / relations) and a way into the folder drawer.
 *
 * This replaces LibraryBottomNav, which was a SECOND `fixed bottom-0 z-40`
 * element rendered alongside the global MobileTabBar. Both were md:hidden and
 * both sat at the same z-index, and because the tab bar mounts later in the
 * tree it painted on top — so every control in here (folders, favorites, the
 * graph tab) was buried and unreachable on a phone.
 *
 * View-scoped controls belong with the view, not in the global navigation
 * chrome, so they now live in the header where the desktop equivalents already
 * are. One fixed bottom bar on any screen, which is the rule the collision
 * broke.
 */
export function LibraryScopeBar() {
  const { effectiveFolder, folderCounts, setFolder } = usePersonalLibraryFolders();
  const { setSidebarOpen } = usePersonalLibrarySidebar();
  const { localViewType, setLocalViewType } = usePersonalLibraryViewPrefs();

  const isRelations = localViewType === "graph";

  const scopes = [
    { key: "all" as const, label: "הכל", icon: BookOpen },
    { key: "favorites" as const, label: "מועדפים", icon: Star },
  ];

  return (
    <div
      className="md:hidden flex items-center gap-1.5 -mx-1 px-1 overflow-x-auto scrollbar-hide"
      role="group"
      aria-label="תצוגת הספרייה"
    >
      {scopes.map(({ key, label, icon: Icon }) => {
        const isActive = effectiveFolder === key && !isRelations;
        const count = folderCounts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => {
              setFolder(key);
              setLocalViewType("grid");
            }}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium min-h-[44px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              isActive
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "border-(--glass-border) text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg)",
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count > 0 && (
              <span className="tabular-nums text-[10px] text-(--text-muted)">{count}</span>
            )}
          </button>
        );
      })}

      {/* Relations: the whole-library view had NO mobile entry point at all
          before this (the header toggle is md-only and the bottom-nav tab was
          buried), so the graph was desktop-only in practice. */}
      <button
        onClick={() => setLocalViewType(isRelations ? "grid" : "graph")}
        aria-pressed={isRelations}
        className={cn(
          "shrink-0 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium min-h-[44px] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
          isRelations
            ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
            : "border-(--glass-border) text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg)",
        )}
      >
        <Network className="w-4 h-4" />
        <span>קשרים</span>
      </button>

      <button
        onClick={() => setSidebarOpen(true)}
        className="shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-(--glass-border) text-xs font-medium text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg) min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        aria-label="פתח תיקיות"
      >
        <FolderOpen className="w-4 h-4" />
        <span>תיקיות</span>
      </button>
    </div>
  );
}
