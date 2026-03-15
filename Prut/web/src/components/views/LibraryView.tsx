"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { CATEGORY_LABELS, PROMPT_COLLECTIONS } from "@/lib/constants";
import { BookOpen, Star, Search, CheckSquare, Square, Plus, Copy, FolderInput, X, Sparkles, ImageIcon, ArrowRight, Lock, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ChevronLeft, ChevronsLeft, ChevronsRight, TrendingUp, Rocket, PenTool, Settings, Code, Sparkles as SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { useState, useEffect, useMemo } from "react";
import { exportPromptAsImage } from "@/lib/export-prompt-image";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { useHistory } from "@/hooks/useHistory";
import { logger } from "@/lib/logger";

const COLLECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Rocket,
  PenTool,
  Settings,
  Code,
  SparklesIcon,
};

const GUEST_FREE_LIMIT = 7;
const ITEMS_PER_PAGE = 10;

interface LibraryViewProps {
  onUsePrompt: (prompt: LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
}

export function LibraryView({ onUsePrompt, onCopyText }: LibraryViewProps) {
  const { user } = useHistory();
  const isGuest = user === null;

  const {
    filteredLibrary,
    libraryQuery,
    setLibraryQuery,
    libraryView,
    setLibraryView,
    librarySort,
    setLibrarySort,
    favoriteLibraryIds,
    handleToggleFavorite,
    setViewMode,
    addPrompt,
    popularityMap,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
    libraryCapabilityCounts,
    personalCategories,
    addPrompts,
    isLibraryFetching
  } = useLibraryContext();

  // -- Local State --
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetMoveCategory, setTargetMoveCategory] = useState("");
  const [isCreatingNewMoveCategory, setIsCreatingNewMoveCategory] = useState(false);
  const [newMoveCategoryInput, setNewMoveCategoryInput] = useState("");
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Active collection filter
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxImage]);

  // Rating state (localStorage-based)
  const [userRatings, setUserRatings] = useState<Record<string, 1 | -1>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('peroot_library_ratings') || '{}');
    } catch { return {}; }
  });

  const handleRate = (promptId: string, rating: 1 | -1) => {
    setUserRatings(prev => {
      const next = { ...prev };
      if (next[promptId] === rating) {
        delete next[promptId];
      } else {
        next[promptId] = rating;
      }
      localStorage.setItem('peroot_library_ratings', JSON.stringify(next));
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addPersonalPromptFromLibrary = async (prompt: LibraryPrompt) => {
    try {
        await addPrompt({
            title: prompt.title,
            prompt: prompt.prompt,
            category: prompt.category,
            personal_category: PERSONAL_DEFAULT_CATEGORY,
            use_case: prompt.use_case,
            source: "library",
            reference: prompt.id,
            prompt_style: undefined,
            tags: []
        });
        toast.success("נשמר לספריה האישית");
    } catch (e) {
        logger.error(e);
        toast.error("שגיאה בשמירה");
    }
  };

  // -- Batch Logic --
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBatchSave = async () => {
    const category = isCreatingNewMoveCategory ? newMoveCategoryInput.trim() : targetMoveCategory;
    if (!category) return;

    const selectedPrompts = filteredLibrary.filter(p => selectedIds.has(p.id));
    if (selectedPrompts.length === 0) return;

    try {
        const itemsToSave = selectedPrompts.map(p => ({
            title: p.title,
            prompt: p.prompt,
            category: p.category,
            personal_category: category,
            use_case: p.use_case,
            source: "library" as const,
            reference: p.id,
            tags: []
        }));

        await addPrompts(itemsToSave);
        toast.success(`${selectedPrompts.length} פרומפטים נשמרו בהצלחה`);
        setShowMoveDialog(false);
        setIsCreatingNewMoveCategory(false);
        setNewMoveCategoryInput("");
        clearSelection();
    } catch (e) {
        logger.error(e);
        toast.error("שגיאה בשמירה קבוצתית");
    }
  };

  // Filter by collection if active
  const collectionFilteredLibrary = useMemo(() => {
    if (!activeCollection) return filteredLibrary;
    const col = PROMPT_COLLECTIONS.find(c => c.id === activeCollection);
    if (!col) return filteredLibrary;
    return filteredLibrary.filter(p => {
      const cat = p.category || "";
      return col.categories.some(c => c.toLowerCase() === cat.toLowerCase() || c === cat);
    });
  }, [filteredLibrary, activeCollection]);

  // Sort
  const sortedPrompts = useMemo(() => {
    return [...collectionFilteredLibrary].sort((a, b) => {
      const aFavorite = favoriteLibraryIds.has(a.id);
      const bFavorite = favoriteLibraryIds.has(b.id);
      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;

      switch (librarySort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "newest":
          return 0;
        case "rating": {
          const aRating = userRatings[a.id] ?? 0;
          const bRating = userRatings[b.id] ?? 0;
          if (aRating !== bRating) return bRating - aRating;
          return (popularityMap[b.id] ?? 0) - (popularityMap[a.id] ?? 0);
        }
        case "popularity":
        default: {
          const aP = popularityMap[a.id] ?? 0;
          const bP = popularityMap[b.id] ?? 0;
          if (aP !== bP) return bP - aP;
          return a.title.localeCompare(b.title);
        }
      }
    });
  }, [collectionFilteredLibrary, librarySort, favoriteLibraryIds, popularityMap, userRatings]);

  const totalCount = sortedPrompts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [libraryQuery, libraryView, selectedCapabilityFilter, activeCollection]);

  const pagePrompts = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return sortedPrompts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedPrompts, safeCurrentPage]);

  // Guest paywall: block after GUEST_FREE_LIMIT globally
  const globalStart = (safeCurrentPage - 1) * ITEMS_PER_PAGE;

  // Unique categories for quick-jump (from current filtered set)
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    collectionFilteredLibrary.forEach(p => {
      const raw = p.category || "General";
      const key = CATEGORY_LABELS[raw] ? raw : (CATEGORY_LABELS[raw.charAt(0).toUpperCase() + raw.slice(1)] ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw);
      cats.add(key);
    });
    return Object.keys(CATEGORY_LABELS).filter(c => cats.has(c));
  }, [collectionFilteredLibrary]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    // Scroll to top of library
    document.getElementById("library-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
      <div id="library-top" className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-full overflow-x-hidden">

        {/* Back Button */}
        <button
          onClick={() => setViewMode("home")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer group w-fit"
          dir="rtl"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </button>

        <div className="glass-card p-3 md:p-5 lg:p-6 rounded-2xl border-white/10 bg-black/40">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-serif text-white">ספריית פרומפטים</h2>
              <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">
                {totalCount} {libraryView === "favorites" ? "מועדפים" : "פרומפטים"}
                {totalPages > 1 && <span className="mx-1">|</span>}
                {totalPages > 1 && `עמוד ${safeCurrentPage} מתוך ${totalPages}`}
              </p>
            </div>

            {/* New Prompt Button */}
            <button
              onClick={() => setViewMode("home")}
              className="group shrink-0 flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg bg-yellow-200 hover:bg-yellow-300 transition-all shadow-md hover:shadow-lg"
            >
              <div className="relative w-5 h-5">
                <Sparkles className="absolute inset-0 w-5 h-5 text-yellow-600" />
                <Plus className="absolute inset-0 w-5 h-5 text-black translate-x-0.5 translate-y-0.5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-black hidden lg:inline">
                פרומפט חדש
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setLibraryView(libraryView === "favorites" ? "all" : "favorites")}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors",
                libraryView === "favorites"
                  ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-200"
                  : "border-white/10 text-slate-300 hover:bg-white/10"
              )}
            >
              <Star className={cn("w-4 h-4", libraryView === "favorites" && "fill-yellow-200 text-yellow-200")} />
              מועדפים
            </button>

            <button
              onClick={() => setViewMode("personal")}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              ספריה אישית
            </button>

            <button
              onClick={() => setSelectionMode(!selectionMode)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all",
                selectionMode ? "bg-purple-600/20 border-purple-500/40 text-purple-300" : "border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/5"
              )}
              title="מצב בחירה מרובה"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden md:inline">ניהול</span>
            </button>
            {selectionMode && (
              <button
                onClick={() => {
                  const allIds = sortedPrompts.map(p => p.id);
                  const allSelected = allIds.every(id => selectedIds.has(id));
                  if (allSelected) setSelectedIds(new Set());
                  else setSelectedIds(new Set(allIds));
                }}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white border border-white/10 hover:bg-white/5"
              >
                בחר הכל ({totalCount})
              </button>
            )}
          </div>

          <div className="mt-3">
            <CapabilityFilter
              value={selectedCapabilityFilter}
              onChange={setSelectedCapabilityFilter}
              counts={libraryCapabilityCounts}
            />
          </div>

          {/* Search + Sort */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                dir="rtl"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="חיפוש פרומפטים..."
                className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 pe-10 ps-3 text-base md:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <select
              value={librarySort}
              onChange={(e) => setLibrarySort(e.target.value as "popularity" | "title" | "newest" | "rating")}
              className="shrink-0 bg-black/30 border border-white/10 rounded-lg py-2.5 px-2.5 min-h-[44px] text-base md:text-sm text-slate-200 focus:outline-none focus:border-white/30"
            >
              <option value="popularity">פופולריות</option>
              <option value="title">א-ב</option>
              <option value="newest">חדש</option>
              <option value="rating">דירוג</option>
            </select>
          </div>

          {/* Category quick-jump chips */}
          {uniqueCategories.length > 0 && (
            <div className="mt-3 flex overflow-x-auto scrollbar-hide flex-nowrap gap-1.5 pb-1">
              {uniqueCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setLibraryQuery(CATEGORY_LABELS[category] ?? category);
                    setCurrentPage(1);
                  }}
                  className="shrink-0 text-[11px] md:text-xs px-3 py-2 min-h-[44px] flex items-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                >
                  {CATEGORY_LABELS[category] ?? category}
                </button>
              ))}
            </div>
          )}

          {/* Collections Strip */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] md:text-xs font-medium text-slate-500">חבילות פרומפטים</span>
              {activeCollection && (
                <button
                  onClick={() => setActiveCollection(null)}
                  className="text-[11px] md:text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  הצג הכל
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {PROMPT_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => setActiveCollection(activeCollection === collection.id ? null : collection.id)}
                  className={cn(
                    "shrink-0 w-32 md:w-44 p-2.5 md:p-3 rounded-xl border transition-all cursor-pointer text-right",
                    activeCollection === collection.id
                      ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                      : "border-white/10 bg-gradient-to-l hover:border-white/20 hover:bg-white/[0.04]",
                    collection.color
                  )}
                  dir="rtl"
                >
                  {(() => { const IconComponent = COLLECTION_ICONS[collection.icon]; return IconComponent ? <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-slate-300 mb-1" /> : null; })()}
                  <p className="text-xs md:text-sm font-semibold text-slate-200 truncate">{collection.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{collection.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt Cards - Paginated flat list */}
        <div className="space-y-2.5 md:space-y-3 relative">
          {pagePrompts.map((prompt, localIdx) => {
            const absoluteIdx = globalStart + localIdx;
            const isBlurred = isGuest && absoluteIdx >= GUEST_FREE_LIMIT;
            const isExpanded = expandedIds.has(prompt.id);
            const isFavorite = favoriteLibraryIds.has(prompt.id);
            const popularityCount = popularityMap[prompt.id] ?? 0;
            const categoryLabel = CATEGORY_LABELS[prompt.category] ?? CATEGORY_LABELS[prompt.category?.charAt(0).toUpperCase() + prompt.category?.slice(1)] ?? prompt.category;

            return (
              <div
                key={prompt.id}
                className={cn(
                  "rounded-xl md:rounded-2xl border border-white/10 bg-black/30 transition-colors relative group",
                  !isBlurred && "hover:bg-white/[0.04]",
                  !isBlurred && (selectedIds.has(prompt.id) || selectionMode) && "ring-2 ring-amber-500/50 bg-amber-500/5",
                  isBlurred && "blur-sm pointer-events-none select-none"
                )}
                aria-hidden={isBlurred ? "true" : undefined}
              >
                {/* Selection Checkbox */}
                {!isBlurred && (
                  <div className={cn(
                    "absolute top-3 left-3 z-10 transition-opacity duration-200",
                    (selectedIds.has(prompt.id) || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }} aria-label={selectedIds.has(prompt.id) ? "בטל בחירה" : "בחר פריט"}>
                      {selectedIds.has(prompt.id)
                        ? <CheckSquare className="w-5 h-5 text-amber-400 fill-amber-500/20" />
                        : <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />}
                    </button>
                  </div>
                )}

                {/* Compact Header - always visible */}
                <button
                  type="button"
                  onClick={() => !isBlurred && toggleExpanded(prompt.id)}
                  className="w-full text-right p-3 md:p-4 flex items-center gap-3 cursor-pointer"
                  dir="rtl"
                >
                  {/* Favorite star */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite("library", prompt.id); }}
                    className={cn(
                      "shrink-0 p-1.5 rounded-full transition-colors",
                      isFavorite ? "text-yellow-400" : "text-slate-600 hover:text-slate-400"
                    )}
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                  >
                    <Star className={cn("w-4 h-4", isFavorite && "fill-yellow-400")} />
                  </button>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm md:text-base text-slate-100 font-semibold leading-tight truncate">{prompt.title}</h4>
                      <CapabilityBadge mode={prompt.capability_mode} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{prompt.use_case}</p>
                  </div>

                  {/* Right side: category + popularity + expand icon */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
                      {categoryLabel}
                    </span>
                    {popularityCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                        {popularityCount > 99 ? '99+' : popularityCount}
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />
                    }
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && !isBlurred && (
                  <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-white/5">
                    {/* Prompt text */}
                    <div className="text-xs md:text-sm text-slate-300 leading-relaxed mt-3 whitespace-pre-wrap max-h-48 overflow-y-auto" dir="rtl">
                      {prompt.prompt}
                    </div>

                    {/* Preview image */}
                    {prompt.preview_image_url && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage({ url: prompt.preview_image_url!, title: prompt.title })}
                        className="relative w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group/img cursor-zoom-in"
                      >
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
                            className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap" dir="rtl">
                      <button
                        onClick={() => onUsePrompt(prompt)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-white text-black text-xs md:text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        השתמש
                      </button>
                      <button
                        onClick={() => addPersonalPromptFromLibrary(prompt)}
                        className="shrink-0 flex items-center gap-1.5 p-2 min-h-[44px] min-w-[44px] justify-center rounded-lg border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors cursor-pointer"
                        title="שמור לספריה אישית"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="hidden md:inline text-sm">שמור</span>
                      </button>
                      <button
                        onClick={async () => { await onCopyText(prompt.prompt); }}
                        className="shrink-0 flex items-center gap-1.5 p-2 min-h-[44px] min-w-[44px] justify-center rounded-lg border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors cursor-pointer"
                        title="העתק"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="hidden md:inline text-sm">העתק</span>
                      </button>
                      <button
                        onClick={() => exportPromptAsImage({
                          title: prompt.title,
                          prompt: prompt.prompt,
                          category: categoryLabel,
                          useCase: prompt.use_case,
                        })}
                        className="shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="ייצא כתמונה"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />

                      <button
                        onClick={() => handleRate(prompt.id, 1)}
                        className={cn(
                          "shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer",
                          userRatings[prompt.id] === 1
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        )}
                        title="מועיל"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRate(prompt.id, -1)}
                        className={cn(
                          "shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer",
                          userRatings[prompt.id] === -1
                            ? "bg-red-500/20 text-red-400"
                            : "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        )}
                        title="לא מועיל"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Guest paywall overlay */}
          {isGuest && globalStart < GUEST_FREE_LIMIT && globalStart + ITEMS_PER_PAGE > GUEST_FREE_LIMIT && (
            <div
              dir="rtl"
              className="flex flex-col items-center justify-center py-10 mt-2 rounded-2xl border border-white/10 bg-gradient-to-t from-black/80 to-black/40"
            >
              <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 mb-1">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-white">
                  רוצה לראות את כל הספריה?
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  הצטרף כמשתמש רשום ושדרג ל-Pro כדי לגלות את כל הפרומפטים
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <a
                    href="/login"
                    className="px-6 py-2.5 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    התחבר
                  </a>
                  <a
                    href="/pricing"
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold text-black transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                    style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                  >
                    שדרג ל-Pro
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 py-3" dir="rtl">
            <button
              onClick={() => goToPage(1)}
              disabled={safeCurrentPage === 1}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="עמוד ראשון"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="עמוד קודם"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>

            {/* Page numbers */}
            {(() => {
              const pages: number[] = [];
              const start = Math.max(1, safeCurrentPage - 2);
              const end = Math.min(totalPages, safeCurrentPage + 2);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={cn(
                    "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    page === safeCurrentPage
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  {page}
                </button>
              ));
            })()}

            <button
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="עמוד הבא"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="עמוד אחרון"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Floating Batch Actions Toolbar */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-white/10 bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 w-[calc(100%-1rem)] md:w-auto max-w-md md:max-w-none">
                <div className="ps-4 pe-3 text-sm font-medium text-white border-e border-white/10">
                    {selectedIds.size} נבחרו
                </div>
                <button onClick={() => setShowMoveDialog(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-purple-600/20 rounded-xl text-purple-300 transition-all font-bold text-sm">
                    <FolderInput className="w-4 h-4" />
                    שמור לאישי
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={clearSelection} className="p-1 hover:bg-white/10 rounded-full text-slate-500" aria-label="סגור">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Save Dialog Overlay */}
        {showMoveDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-xl text-white font-serif mb-4 text-center">שמירת {selectedIds.size} פריטים</h3>
                    <p className="text-slate-400 text-sm mb-6 text-center">בחר לאיזו קטגוריה לשמור בספריה האישית שלך</p>

                    <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                        <button
                            onClick={() => { setIsCreatingNewMoveCategory(true); setTargetMoveCategory(""); }}
                            className={cn(
                                "w-full text-right px-4 py-3 rounded-xl border transition-all text-sm flex items-center justify-between",
                                isCreatingNewMoveCategory ? "bg-purple-600/20 border-purple-500 text-purple-200" : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                            )}
                        >
                            <span>+ קטגוריה חדשה</span>
                            <Plus className="w-4 h-4" />
                        </button>

                        {isCreatingNewMoveCategory && (
                            <div className="p-1 animate-in slide-in-from-top-2 duration-300">
                                <input
                                    dir="rtl"
                                    value={newMoveCategoryInput}
                                    onChange={e => setNewMoveCategoryInput(e.target.value)}
                                    placeholder="שם הקטגוריה..."
                                    className="w-full bg-black/40 border border-purple-500/50 rounded-lg p-3 text-base text-white focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="h-px bg-white/5 my-2" />

                        {[...new Set([...personalCategories, PERSONAL_DEFAULT_CATEGORY])].map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setTargetMoveCategory(cat); setIsCreatingNewMoveCategory(false); }}
                                className={cn(
                                    "w-full text-right px-4 py-3 rounded-xl border transition-all text-sm",
                                    targetMoveCategory === cat && !isCreatingNewMoveCategory ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleBatchSave}
                            disabled={(!targetMoveCategory && !newMoveCategoryInput.trim())}
                            className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-purple-500"
                        >
                            שמור
                        </button>
                        <button
                            onClick={() => { setShowMoveDialog(false); setIsCreatingNewMoveCategory(false); }}
                            className="flex-1 bg-white/5 text-slate-300 py-2.5 rounded-lg"
                        >
                            ביטול
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Skeleton */}
        {isLibraryFetching && totalCount === 0 && (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-white/[0.04] animate-pulse h-16"
              />
            ))}
          </div>
        )}

        {/* Favorites empty state */}
        {!isLibraryFetching && libraryView === "favorites" && totalCount === 0 && (
          <div className="flex flex-col items-center gap-3 text-center py-16" dir="rtl">
            <Star className="w-12 h-12 text-slate-600 mb-2" />
            <p className="text-lg font-semibold text-slate-400">עוד לא סימנת מועדפים</p>
            <p className="text-sm text-slate-500">לחץ על הכוכב כדי לשמור פרומפטים אהובים</p>
          </div>
        )}

        {/* Search no-results empty state */}
        {!isLibraryFetching && libraryView !== "favorites" && totalCount === 0 && (
          <div className="flex flex-col items-center gap-3 text-center py-16" dir="rtl">
            <Search className="w-12 h-12 text-slate-600 mb-2" />
            <p className="text-lg font-semibold text-slate-400">לא נמצאו תוצאות</p>
            <p className="text-sm text-slate-500">נסה מילות חיפוש אחרות</p>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.title}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              aria-label="סגור"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="max-w-4xl max-h-[85vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightboxImage.url}
                alt={`דוגמה: ${lightboxImage.title}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
                loading="lazy"
                decoding="async"
              />
              <p className="text-center text-sm text-slate-400 mt-3 font-medium" dir="rtl">
                {lightboxImage.title}
              </p>
            </div>
          </div>
        )}
      </div>
  );
}
