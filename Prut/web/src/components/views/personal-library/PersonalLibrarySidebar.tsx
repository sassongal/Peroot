"use client";

import {
    BookOpen, Star, Plus, Check, X,
    Pin, Folder, FolderOpen, LayoutTemplate
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import type { PersonalLibrarySharedState } from "./types";

interface PersonalLibrarySidebarProps {
  shared: PersonalLibrarySharedState;
  isMobile?: boolean;
}

export function PersonalLibrarySidebar({ shared, isMobile = false }: PersonalLibrarySidebarProps) {
  const ctx = useLibraryContext();
  const {
    personalCategories,
    renamingCategory,
    renameCategoryInput,
    setRenameCategoryInput,
    saveRenameCategory,
    cancelRenameCategory,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
    personalCapabilityCounts,
  } = ctx;

  const {
    effectiveFolder,
    folderCounts,
    allDisplayItems,
    sidebarOpen,
    setSidebarOpen,
    showNewFolderInput,
    setShowNewFolderInput,
    newFolderName,
    setNewFolderName,
    handleAddNewFolder,
    setFolder,
    handleFolderContextMenu,
  } = shared;

  const virtualFolders = [
    { key: "all", label: "כל הפרומפטים", icon: BookOpen },
    { key: "favorites", label: "מועדפים", icon: Star },
    { key: "pinned", label: "מוצמדים", icon: Pin },
    { key: "templates", label: "תבניות", icon: LayoutTemplate },
  ];

  const realFolders = Array.from(new Set([
    PERSONAL_DEFAULT_CATEGORY,
    ...personalCategories,
    ...allDisplayItems.map(p => p.personal_category).filter(Boolean) as string[]
  ]));

  return (
    <div
      className={cn(
        "flex flex-col h-full overflow-y-auto",
        isMobile ? "p-4 bg-[#0A0A0F] min-h-screen" : "p-3"
      )}
      dir="rtl"
    >
      {isMobile && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-[var(--text-primary)]">תיקיות</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Virtual folders */}
      <div className="space-y-0.5 mb-2">
        {virtualFolders.map(({ key, label, icon: Icon }) => {
          const count = folderCounts[key] ?? 0;
          const isActive = effectiveFolder === key;
          return (
            <button
              key={key}
              onClick={() => setFolder(key)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-start focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                isActive
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]")} />
                <span className="truncate">{label}</span>
              </div>
              {count > 0 && (
                <span className={cn("text-xs tabular-nums shrink-0", isActive ? "text-amber-600/70 dark:text-amber-400/70" : "text-slate-600")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-white/8 my-2" />

      {/* Capability Filter */}
      <div className="mb-3 px-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-600 block mb-1.5 px-2">מצב יכולת</span>
        <div className="scale-90 origin-top-right">
          <CapabilityFilter
            value={selectedCapabilityFilter}
            onChange={setSelectedCapabilityFilter}
            counts={personalCapabilityCounts}
          />
        </div>
      </div>

      <div className="h-px bg-white/8 my-2" />

      {/* Real folders */}
      <div className="space-y-0.5 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-600 block mb-1.5 px-3">תיקיות</span>
        {realFolders.map((folder) => {
          const count = folderCounts[folder] ?? 0;
          const isActive = effectiveFolder === folder;
          const isRenaming = renamingCategory === folder;

          return (
            <div key={folder} onContextMenu={(e) => handleFolderContextMenu(e, folder)}>
              {isRenaming ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    dir="rtl"
                    value={renameCategoryInput}
                    onChange={(e) => setRenameCategoryInput(e.target.value)}
                    className="flex-1 bg-black/40 border border-[var(--glass-border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') saveRenameCategory(); if (e.key === 'Escape') cancelRenameCategory(); }}
                    autoFocus
                  />
                  <button onClick={saveRenameCategory} aria-label="שמור" className="p-1 text-green-400 hover:bg-green-500/10 rounded focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"><Check className="w-3 h-3" /></button>
                  <button onClick={cancelRenameCategory} aria-label="ביטול" className="p-1 text-red-400 hover:bg-red-500/10 rounded focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setFolder(folder)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-start focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                    isActive
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      : "text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isActive
                      ? <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      : <Folder className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    }
                    <span className="truncate text-sm">{folder}</span>
                  </div>
                  {count > 0 && (
                    <span className={cn("text-xs tabular-nums shrink-0", isActive ? "text-amber-600/70 dark:text-amber-400/70" : "text-slate-600")}>
                      {count}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New folder */}
      <div className="mt-2 px-1">
        {showNewFolderInput ? (
          <div className="flex items-center gap-1">
            <input
              dir="rtl"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="שם תיקייה..."
              className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-slate-600 outline-none focus:border-amber-500/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNewFolder();
                if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(""); }
              }}
              autoFocus
            />
            <button onClick={handleAddNewFolder} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--glass-bg)] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolderInput(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors border border-dashed border-white/8 hover:border-white/15 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <Plus className="w-3 h-3" />
            תיקייה חדשה
          </button>
        )}
      </div>
    </div>
  );
}
