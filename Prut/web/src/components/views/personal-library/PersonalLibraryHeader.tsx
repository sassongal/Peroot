"use client";

import Link from "next/link";
import {
    BookOpen, Plus, Star, Pin, LayoutTemplate,
    CheckSquare, Upload, History,
    Sparkles, Menu, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibraryContext } from "@/context/LibraryContext";
import { SearchAutosuggest } from "@/components/features/library/SearchAutosuggest";
import { ActiveFilterChips } from "@/components/features/library/ActiveFilterChips";
import type { PersonalLibrarySharedState, PersonalLibraryViewProps } from "./types";

interface PersonalLibraryHeaderProps {
  shared: PersonalLibrarySharedState;
  viewProps: Pick<PersonalLibraryViewProps, "handleImportHistory" | "historyLength">;
}

export function PersonalLibraryHeader({ shared, viewProps }: PersonalLibraryHeaderProps) {
  const { handleImportHistory, historyLength } = viewProps;
  const ctx = useLibraryContext();
  const {
    user,
    setViewMode,
    filteredPersonalLibrary,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
  } = ctx;

  const {
    activeFolderLabel,
    usedTotalCount,
    currentSort,
    localSearch,
    selectionMode,
    setSelectionMode,
    displayItems,
    selectAllVisible,
    effectiveFolder,
    folderCounts,
    setSidebarOpen,
    importFileRef,
    handleSearchChange,
    handleSortChange,
    handleImportFile,
    setFolder,
  } = shared;

  // Mobile quick tabs — surface favorites + virtual folders inline so
  // users don't need to open the drawer. Horizontally scrollable.
  const mobileQuickTabs = [
    { key: "all", label: "הכל", icon: BookOpen },
    { key: "favorites", label: "מועדפים", icon: Star },
    { key: "pinned", label: "מוצמדים", icon: Pin },
    { key: "templates", label: "תבניות", icon: LayoutTemplate },
  ] as const;

  return (
    <div className="glass-card px-4 md:px-6 py-4 rounded-2xl border border-[var(--glass-border)] bg-black/40 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="פתח תפריט"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl md:text-3xl font-serif text-[var(--text-primary)]">ספריה אישית</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {usedTotalCount} פרומפטים · {activeFolderLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Full library — hidden on mobile; surfaced as a chip in the mobile tabs row below */}
          <button
            onClick={() => setViewMode("library")}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] transition-colors text-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden lg:inline">ספרייה מלאה</span>
          </button>
          {/* New prompt button */}
          <button
            onClick={() => setViewMode("home")}
            className="group flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-yellow-200 hover:bg-yellow-300 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none shrink-0"
            aria-label="פרומפט חדש"
          >
            <div className="relative w-4 h-4 md:w-5 md:h-5">
              <Sparkles className="absolute inset-0 w-full h-full text-yellow-600" />
              <Plus className="absolute inset-0 w-full h-full text-black translate-x-0.5 translate-y-0.5" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-black hidden sm:inline">חדש</span>
            <span className="text-sm font-semibold text-black hidden lg:inline">פרומפט חדש</span>
          </button>
        </div>
      </div>

      {!user && (
        <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          <span className="font-medium text-amber-800 dark:text-amber-200">מצב אורח: </span>
          הפרומפטים האישיים נשמרים במכשיר זה בלבד; פריטים ישנים עלולים להיעלם אחרי כשבוע.
          {" "}
          <Link href="/login" className="text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-200">
            התחברו
          </Link>
          {" "}לסנכרון בענן וגיבוי קבוע.
        </div>
      )}

      {user && effectiveFolder === "favorites" && localSearch.trim() !== "" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-[var(--text-muted)]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" aria-hidden />
          <span>
            בתיקיית מועדפים החיפוש הוא לפי התאמת טקסט (לא חיפוש &quot;דמיון&quot; כמו ב&quot;כל הפרומפטים&quot;).
          </span>
        </div>
      )}

      {/* Mobile quick tabs — virtual folders + "full library" chip.
          Horizontally scrollable, never wraps, hidden on md+. */}
      <div className="md:hidden -mx-4 px-4 mb-3 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 w-max">
          {mobileQuickTabs.map(({ key, label, icon: Icon }) => {
            const isActive = effectiveFolder === key;
            const count = folderCounts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setFolder(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-9 shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  isActive
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-200 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                    : "bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] border border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                )}
                aria-pressed={isActive}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-amber-500/20 text-amber-800 dark:text-amber-100" : "bg-black/10 dark:bg-white/10 text-[var(--text-muted)]"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="w-px h-6 bg-[var(--glass-border)] mx-1 shrink-0" />
          <button
            onClick={() => setViewMode("library")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] transition-colors min-h-9 shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>ספרייה מלאה</span>
          </button>
        </div>
      </div>

      {/* Search + Sort + Actions: full width search; on mobile toolbar scrolls horizontally */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <SearchAutosuggest
          value={localSearch}
          onChange={handleSearchChange}
          prompts={filteredPersonalLibrary}
          placeholder="חיפוש..."
          className="w-full md:flex-1 md:min-w-[180px]"
        />

        <div className="flex items-center gap-2 -mx-1 px-1 overflow-x-auto scrollbar-hide pb-0.5 md:overflow-visible md:flex-wrap md:pb-0 md:mx-0 md:px-0">
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="shrink-0 bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-black/15 dark:border-white/30 min-h-[44px]"
          >
            <option value="recent">עודכן לאחרונה</option>
            <option value="title">אלפביתי</option>
            <option value="usage">בשימוש גבוה</option>
            <option value="custom">סדר ידני</option>
            <option value="last_used">שימוש אחרון</option>
            <option value="performance">ביצועים</option>
          </select>

          <button
            onClick={() => setSelectionMode(!selectionMode)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
              selectionMode
                ? "bg-blue-600 border-blue-500 text-[var(--text-primary)] shadow-lg shadow-blue-900/30"
                : "border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
            )}
            title="ניהול פריטים"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ניהול פריטים</span>
          </button>

          <button
            onClick={() => importFileRef.current?.click()}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            title="ייבוא"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ייבוא</span>
          </button>
          <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />

          <button
            onClick={handleImportHistory}
            disabled={historyLength === 0}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
              historyLength === 0 ? "border-[var(--glass-border)] text-slate-600 cursor-not-allowed" : "border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden md:inline">מהיסטוריה</span>
          </button>

          {selectionMode && (
            <button
              onClick={selectAllVisible}
              className="shrink-0 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              בחר הכל ({displayItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        searchQuery={localSearch}
        onClearSearch={() => handleSearchChange("")}
        capabilityFilter={selectedCapabilityFilter}
        onClearCapability={() => setSelectedCapabilityFilter(null)}
        favoritesMode={effectiveFolder === "favorites"}
        onClearFavorites={() => setFolder("all")}
        className="mt-1"
      />
    </div>
  );
}
