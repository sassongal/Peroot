"use client";

import { BookOpen, Star, Pin, FolderOpen, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibraryContext } from "@/context/LibraryContext";
import type { PersonalLibrarySharedState } from "@/components/views/personal-library/types";

interface LibraryBottomNavProps {
  shared: Pick<
    PersonalLibrarySharedState,
    "effectiveFolder" | "folderCounts" | "setFolder" | "setSidebarOpen"
  >;
}

const NAV_TABS = [
  { key: "all", label: "הכל", icon: BookOpen },
  { key: "favorites", label: "מועדפים", icon: Star },
  { key: "pinned", label: "מוצמדים", icon: Pin },
] as const;

export function LibraryBottomNav({ shared }: LibraryBottomNavProps) {
  const { effectiveFolder, folderCounts, setFolder, setSidebarOpen } = shared;
  const { setViewMode } = useLibraryContext();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-md border-t border-(--glass-border)"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="ניווט ספרייה"
      dir="rtl"
    >
      <div className="flex items-center justify-around px-2 h-14">

        {/* Left tabs: הכל + מועדפים */}
        {NAV_TABS.slice(0, 2).map(({ key, label, icon: Icon }) => {
          const isActive = effectiveFolder === key;
          const count = folderCounts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFolder(key)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg transition-colors",
                isActive ? "text-amber-500 dark:text-amber-400" : "text-(--text-muted)",
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
          <Plus className="absolute w-6 h-6 text-black translate-x-0.5 translate-y-0.5" strokeWidth={2.5} />
        </button>

        {/* Right tabs: מוצמדים + תיקיות */}
        {NAV_TABS.slice(2).map(({ key, label, icon: Icon }) => {
          const isActive = effectiveFolder === key;
          const count = folderCounts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFolder(key)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg transition-colors",
                isActive ? "text-amber-500 dark:text-amber-400" : "text-(--text-muted)",
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

        {/* Folders button — opens sidebar drawer */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 min-h-[56px] min-w-[56px] justify-center text-(--text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-lg transition-colors"
          aria-label="פתח תיקיות"
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium">תיקיות</span>
        </button>

      </div>
    </nav>
  );
}
