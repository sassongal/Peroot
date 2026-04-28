"use client";

import { BookOpen, Star, Network, FolderOpen, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibraryContext } from "@/context/LibraryContext";
import type { PersonalLibrarySharedState } from "@/components/views/personal-library/types";

interface LibraryBottomNavProps {
  shared: Pick<
    PersonalLibrarySharedState,
    | "effectiveFolder"
    | "folderCounts"
    | "setFolder"
    | "setSidebarOpen"
    | "localViewType"
    | "setLocalViewType"
  >;
}

const FOLDER_TABS = [
  { key: "all", label: "הכל", icon: BookOpen },
  { key: "favorites", label: "מועדפים", icon: Star },
] as const;

export function LibraryBottomNav({ shared }: LibraryBottomNavProps) {
  const {
    effectiveFolder,
    folderCounts,
    setFolder,
    setSidebarOpen,
    localViewType,
    setLocalViewType,
  } = shared;
  const { setViewMode } = useLibraryContext();

  const isGraphActive = localViewType === "graph";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-md border-t border-(--glass-border)"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="ניווט ספרייה"
      dir="rtl"
    >
      <div className="flex items-center justify-around px-2 h-14">
        {/* Folder tabs: הכל + מועדפים */}
        {FOLDER_TABS.map(({ key, label, icon: Icon }) => {
          const isActive = effectiveFolder === key && !isGraphActive;
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
                "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl transition-colors",
                isActive
                  ? "text-amber-500 dark:text-amber-400 bg-amber-500/8"
                  : "text-(--text-muted) hover:text-(--text-secondary)",
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] tabular-nums bg-amber-500 text-black font-bold rounded-full px-1 min-w-[14px] text-center leading-[14px]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}

        {/* Center FAB — new prompt */}
        <button
          onClick={() => setViewMode("home")}
          aria-label="פרומפט חדש"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-yellow-300 hover:bg-yellow-200 active:scale-95 shadow-lg shadow-yellow-400/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 -mt-4"
        >
          <Sparkles className="absolute w-6 h-6 text-yellow-700" />
          <Plus
            className="absolute w-6 h-6 text-black translate-x-0.5 translate-y-0.5"
            strokeWidth={2.5}
          />
        </button>

        {/* Graph view tab */}
        <button
          onClick={() => setLocalViewType(isGraphActive ? "grid" : "graph")}
          aria-pressed={isGraphActive}
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 rounded-xl transition-colors",
            isGraphActive
              ? "text-violet-400 bg-violet-500/10"
              : "text-(--text-muted) hover:text-(--text-secondary)",
          )}
        >
          <Network className="w-5 h-5" />
          <span className="text-[10px] font-medium">גרף</span>
          {isGraphActive && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-violet-400" />
          )}
        </button>

        {/* Folders button — opens sidebar drawer */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center text-(--text-muted) hover:text-(--text-secondary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl transition-colors"
          aria-label="פתח תיקיות"
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium">תיקיות</span>
        </button>
      </div>
    </nav>
  );
}
