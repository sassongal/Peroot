"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
    BookOpen, Star, Plus, Search,
    ChevronDown, ChevronLeft, ChevronRight, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { GlowingEdgeCard } from "@/components/ui/GlowingEdgeCard";
import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { useChains } from "@/hooks/useChains";
import { ChainsSection } from "@/components/features/chains/ChainsSection";
import { PersonalLibraryPromptCard } from "./PersonalLibraryPromptCard";
import type { PersonalLibrarySharedState, PersonalLibraryViewProps } from "./types";

interface PersonalLibraryGridProps {
  shared: PersonalLibrarySharedState;
  viewProps: Pick<PersonalLibraryViewProps, "onUsePrompt" | "onCopyText">;
}

export function PersonalLibraryGrid({ shared, viewProps }: PersonalLibraryGridProps) {
  const { onUsePrompt } = viewProps;
  const ctx = useLibraryContext();
  const {
    personalQuery,
    setPersonalQuery,
    setViewMode,
    handleToggleFavorite,
    libraryFavorites,
    personalLibrary,
    handlePersonalDropToEnd,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
  } = ctx;

  const { chains, addChain, updateChain, deleteChain, incrementChainUseCount, duplicateChain, exportChain, importChain } = useChains();

  const {
    displayItems,
    effectiveFolder,
    isLoading,
    localSearch,
    chainsExpanded,
    setChainsExpanded,
    handleSearchChange,
    addPersonalPromptFromLibrary,
    // Pagination
    usedPage,
    usedPageSize,
    usedTotalCount,
    totalPages,
    handlePageChange,
    getPaginationPages,
  } = shared;

  // Listen for shared-chain imports dispatched by HomeClient after it
  // decodes a `?chain=<base64>` query param on mount. We import via the
  // same path as manual import so dedupe/validation stays in one place.
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<{ json: string }>).detail;
      if (!detail?.json) return;
      try {
        await importChain(detail.json);
        setChainsExpanded(true);
        toast.success('שרשרת משותפת נוספה לספריה שלך');
      } catch {
        toast.error('ייבוא השרשרת נכשל');
      }
    };
    window.addEventListener('peroot:import-shared-chain', handler);
    return () => window.removeEventListener('peroot:import-shared-chain', handler);
  }, [importChain, setChainsExpanded]);

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  const renderSkeleton = () => (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="h-12 rounded-xl border border-(--glass-border) bg-(--glass-bg) animate-pulse flex items-center gap-3 px-4">
          <div className="w-4 h-4 rounded bg-white/8 shrink-0" />
          <div className="h-3 bg-white/8 rounded flex-1 max-w-xs" />
          <div className="h-2 bg-(--glass-bg) rounded w-16 ms-auto" />
        </div>
      ))}
    </div>
  );

  // ─── Pagination ────────────────────────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = getPaginationPages();
    const startItem = (usedPage - 1) * usedPageSize + 1;
    const endItem = Math.min(usedPage * usedPageSize, usedTotalCount);

    return (
      <div className="mt-6 flex flex-col items-center gap-3" dir="rtl">
        <p className="text-xs text-(--text-muted)">
          מציג {startItem}-{endItem} מתוך {usedTotalCount}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(usedPage - 1)}
            disabled={usedPage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-(--glass-border) text-xs text-(--text-secondary) hover:bg-black/5 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <ChevronRight className="w-3.5 h-3.5" /> הקודם
          </button>

          <div className="flex items-center gap-0.5">
            {pages.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-xs text-slate-600">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                    usedPage === p
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold"
                      : "text-(--text-muted) hover:bg-black/5 dark:bg-white/10 border border-transparent hover:border-(--glass-border)"
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => handlePageChange(usedPage + 1)}
            disabled={usedPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-(--glass-border) text-xs text-(--text-secondary) hover:bg-black/5 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            הבא <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 min-w-0 space-y-4">

      {/* Chains section (collapsible) */}
      <div data-chains-section className="rounded-xl border border-white/8 bg-(--glass-bg) overflow-hidden">
        <button
          onClick={() => setChainsExpanded(!chainsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-(--glass-bg) transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-(--text-secondary)">שרשראות</span>
            <span className="text-xs text-(--text-muted) bg-(--glass-bg) px-2 py-0.5 rounded-full">
              {chains.length}
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-(--text-muted) transition-transform duration-200", chainsExpanded && "rotate-180")} />
        </button>
        {chainsExpanded && (
          <div className="px-3 pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <ChainsSection
              chains={chains}
              personalPrompts={personalLibrary}
              onAddChain={addChain}
              onUpdateChain={updateChain}
              onDeleteChain={deleteChain}
              onIncrementUseCount={incrementChainUseCount}
              onDuplicateChain={duplicateChain}
              onExportChain={exportChain}
              onImportChain={importChain}
              onUseStep={(text) =>
                onUsePrompt({
                  id: '',
                  title: '',
                  prompt: text,
                  category: '',
                  personal_category: null,
                  use_case: '',
                  created_at: 0,
                  updated_at: 0,
                  use_count: 0,
                  source: 'manual',
                })
              }
            />
          </div>
        )}
      </div>

      {/* Library favorites (when in favorites folder) */}
      {effectiveFolder === "favorites" && libraryFavorites.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-(--glass-bg) p-4 space-y-3">
          <h3 className="text-sm font-semibold text-(--text-secondary) flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            מועדפים מהספריה הציבורית
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {libraryFavorites.map(p => (
              <GlowingEdgeCard key={p.id} className="rounded-xl" contentClassName="p-3 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block mb-1">
                      ספרייה ציבורית
                    </span>
                    <h4 className="text-sm text-(--text-primary) font-medium truncate">{p.title}</h4>
                  </div>
                  <button onClick={() => handleToggleFavorite("library", p.id)} className="shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded">
                    <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  </button>
                </div>
                <p className="text-xs text-(--text-muted) line-clamp-2" dir="rtl">{p.use_case}</p>
                <div className="flex gap-2">
                  <button onClick={() => onUsePrompt(p)} className="flex-1 bg-white text-black py-1.5 rounded text-xs font-bold focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">השתמש</button>
                  <button onClick={() => addPersonalPromptFromLibrary(p)} className="flex-1 border border-(--glass-border) text-(--text-secondary) py-1.5 rounded text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">שמור עותק</button>
                </div>
              </GlowingEdgeCard>
            ))}
          </div>
        </div>
      )}

      {/* Prompt list */}
      <div className="space-y-1.5">

        {/* Loading skeleton */}
        {isLoading && renderSkeleton()}

        {/* Empty states */}
        {!isLoading && displayItems.length === 0 && (localSearch.trim() || personalQuery.trim()) && (
          <div className="text-center py-12 rounded-xl border border-white/8 bg-(--glass-bg)" dir="rtl">
            <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-(--text-muted) text-sm">לא נמצאו תוצאות עבור &quot;{localSearch || personalQuery}&quot;</p>
            <button
              onClick={() => { handleSearchChange(""); setPersonalQuery(""); }}
              className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:text-amber-300 transition-colors"
            >
              נקה חיפוש
            </button>
          </div>
        )}

        {!isLoading && displayItems.length === 0 && !localSearch.trim() && !personalQuery.trim() && selectedCapabilityFilter && (
          <div className="text-center py-10 rounded-xl border border-white/8 bg-(--glass-bg)" dir="rtl">
            <p className="text-(--text-muted) text-sm">אין פרומפטים במצב זה</p>
            <button onClick={() => setSelectedCapabilityFilter(null)} className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:text-amber-300 transition-colors">
              הצג הכל
            </button>
          </div>
        )}

        {!isLoading && displayItems.length === 0 && !localSearch.trim() && !personalQuery.trim() && !selectedCapabilityFilter && (
          <div className="flex flex-col items-center gap-4 text-center py-16 rounded-xl border border-white/8 bg-(--glass-bg) px-8 animate-in fade-in duration-500" dir="rtl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-amber-500/50" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-(--text-secondary)">
                {effectiveFolder === "favorites" ? "עוד לא סימנת מועדפים" :
                 effectiveFolder === "pinned" ? "אין פרומפטים מוצמדים" :
                 "הספרייה האישית שלך ריקה"}
              </p>
              <p className="text-sm text-(--text-muted) max-w-xs mx-auto">
                {effectiveFolder === "all"
                  ? "שדרג פרומפט ושמור אותו כאן כדי לבנות את האוסף שלך"
                  : "לחץ על הכוכב כדי לשמור מועדפים"}
              </p>
            </div>
            {effectiveFolder === "all" && (
              <button
                onClick={() => setViewMode("home")}
                className="px-6 py-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                שדרג פרומפט עכשיו
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {!isLoading && displayItems.length > 0 && (
          <div
            className="space-y-1.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handlePersonalDropToEnd(e, effectiveFolder === "all" ? PERSONAL_DEFAULT_CATEGORY : (effectiveFolder ?? PERSONAL_DEFAULT_CATEGORY))}
          >
            {displayItems.map(prompt => (
              <PersonalLibraryPromptCard
                key={prompt.id}
                prompt={prompt}
                shared={shared}
                viewProps={viewProps}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && renderPagination()}

    </main>
  );
}
