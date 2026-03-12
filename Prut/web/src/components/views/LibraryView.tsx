"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { CATEGORY_LABELS, PROMPT_COLLECTIONS } from "@/lib/constants";
import { BookOpen, Star, Search, CheckSquare, Square, Plus, Copy, FolderInput, X, Sparkles, ImageIcon, ArrowRight, Lock, ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { useState } from "react";
import { exportPromptAsImage } from "@/lib/export-prompt-image";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { useHistory } from "@/hooks/useHistory";
import { logger } from "@/lib/logger";

const GUEST_FREE_LIMIT = 7;

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
        delete next[promptId]; // toggle off
      } else {
        next[promptId] = rating;
      }
      localStorage.setItem('peroot_library_ratings', JSON.stringify(next));
      return next;
    });
  };

  // Active collection filter
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

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

  const grouped = filteredLibrary.reduce<Record<string, LibraryPrompt[]>>((acc, prompt) => {
    const raw = prompt.category || "General";
    // Normalize to PascalCase to match CATEGORY_LABELS keys (Supabase stores lowercase)
    const key = CATEGORY_LABELS[raw] ? raw : (CATEGORY_LABELS[raw.charAt(0).toUpperCase() + raw.slice(1)] ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw);
    if (!acc[key]) acc[key] = [];
    acc[key].push(prompt);
    return acc;
  }, {});

  // If a collection is active, filter the grouped prompts to only show matching categories
  const activeCollectionData = PROMPT_COLLECTIONS.find(c => c.id === activeCollection);
  const effectiveGrouped = activeCollection && activeCollectionData
    ? Object.fromEntries(
        Object.entries(grouped).filter(([key]) =>
          activeCollectionData.categories.some(cat =>
            cat.toLowerCase() === key.toLowerCase() || cat === key
          )
        )
      )
    : grouped;

  const orderedCategories = Object.keys(CATEGORY_LABELS).filter((cat) => effectiveGrouped[cat]?.length);
  const totalCount = activeCollection
    ? Object.values(effectiveGrouped).flat().length
    : filteredLibrary.length;

  // Tracks how many items have been rendered across all category sections
  // so the paywall CTA is inserted exactly after the 7th item globally.
  let globalItemIndex = 0;
  let paywallInserted = false;

  return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Back Button */}
        <button
          onClick={() => setViewMode("home")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer group w-fit"
          dir="rtl"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </button>

        <div className="glass-card p-6 rounded-xl border-white/10 bg-black/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif text-white">ספריית פרומפטים</h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {totalCount} {libraryView === "favorites" ? "פרומפטים מועדפים" : "פרומפטים זמינים"} · מיון לפי פופולריות · חיפוש לפי מילים, שימוש או קטגוריה
                </p>
              </div>
              
              {/* New Prompt Button */}
              <button
                onClick={() => setViewMode("home")}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-200 hover:bg-yellow-300 transition-all shadow-md hover:shadow-lg"
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setLibraryView(libraryView === "favorites" ? "all" : "favorites")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 md:px-6 md:py-3 rounded-lg border text-sm md:text-base transition-colors min-h-[44px]",
                  libraryView === "favorites"
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-200"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className={cn("w-5 h-5", libraryView === "favorites" && "fill-yellow-200 text-yellow-200")} />
                מועדפים
              </button>

              <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

              <button
                onClick={() => setViewMode("personal")}
                className="flex items-center gap-2 px-3 py-2.5 md:px-6 md:py-3 rounded-lg border border-white/10 text-sm md:text-base text-slate-300 hover:bg-white/10 transition-colors min-h-[44px]"
              >
                <BookOpen className="w-5 h-5" />
                ספריה אישית
              </button>
              
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 ms-2">
                  <button 
                    onClick={() => setSelectionMode(!selectionMode)}
                    className={cn("px-3 py-2 rounded-md transition-all text-xs font-bold flex items-center gap-2", selectionMode ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40" : "text-slate-500 hover:text-slate-300")}
                    title="מצב בחירה מרובה"
                  >
                      <CheckSquare className="w-4 h-4" />
                      <span className="hidden md:inline">ניהול פריטים</span>
                  </button>
                  {selectionMode && (
                      <button 
                         onClick={() => {
                             const allIds = filteredLibrary.map(p => p.id);
                             const allSelected = allIds.every(id => selectedIds.has(id));
                             if (allSelected) setSelectedIds(new Set());
                             else setSelectedIds(new Set(allIds));
                         }}
                         className="px-3 py-2 rounded-md text-xs font-bold text-slate-300 hover:text-white"
                      >
                          בחר הכל ({totalCount})
                      </button>
                  )}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <CapabilityFilter
              value={selectedCapabilityFilter}
              onChange={setSelectedCapabilityFilter}
              counts={libraryCapabilityCounts}
            />
          </div>

          <div className="relative mt-5">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              dir="rtl"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="חפש/י רעיון לפרומפט לפי מילים, קטגוריה או שימוש..."
              className="w-full bg-black/30 border border-white/10 rounded-lg py-3.5 md:py-3 pe-10 ps-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
            />
          </div>

          {orderedCategories.length > 0 && (
            <div className="mt-4 flex overflow-x-auto scrollbar-hide flex-nowrap gap-2 pb-1">
              {orderedCategories.map((category) => (
                <a
                  key={category}
                  href={`#category-${category}`}
                  className="shrink-0 text-xs px-3 py-1 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  suppressHydrationWarning
                >
                  {CATEGORY_LABELS[category] ?? category}
                </a>
              ))}
            </div>
          )}

          {/* Collections Strip */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-slate-500">חבילות פרומפטים</span>
              {activeCollection && (
                <button
                  onClick={() => setActiveCollection(null)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  הצג הכל
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {PROMPT_COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => setActiveCollection(activeCollection === collection.id ? null : collection.id)}
                  className={cn(
                    "shrink-0 w-48 md:w-56 p-4 rounded-xl border transition-all cursor-pointer text-right",
                    activeCollection === collection.id
                      ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                      : "border-white/10 bg-gradient-to-l hover:border-white/20 hover:bg-white/[0.04]",
                    collection.color
                  )}
                  dir="rtl"
                >
                  <span className="text-2xl mb-2 block">{collection.icon}</span>
                  <p className="text-sm font-semibold text-slate-200">{collection.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{collection.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {orderedCategories.map((category) => {
          const sortedPrompts = [...effectiveGrouped[category]].sort((a, b) => {
            const aFavorite = favoriteLibraryIds.has(a.id);
            const bFavorite = favoriteLibraryIds.has(b.id);
            if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
            const aPopularity = popularityMap[a.id] ?? 0;
            const bPopularity = popularityMap[b.id] ?? 0;
            if (aPopularity !== bPopularity) return bPopularity - aPopularity;
            return a.title.localeCompare(b.title);
          });

          // Determine which items in this category section are blurred and
          // whether the paywall CTA banner should be inserted in this section.
          const sectionStartIndex = globalItemIndex;
          const ctaInsertLocalIndex = isGuest && !paywallInserted
            ? GUEST_FREE_LIMIT - sectionStartIndex
            : -1;
          const showCtaInThisSection = ctaInsertLocalIndex >= 0 && ctaInsertLocalIndex <= sortedPrompts.length;

          if (showCtaInThisSection) paywallInserted = true;
          globalItemIndex += sortedPrompts.length;

          return (
            <div
              key={category}
              id={`category-${category}`}
              className="space-y-4 scroll-mt-24 rounded-3xl border border-white/5 bg-gradient-to-l from-white/[0.035] via-white/[0.015] to-transparent px-4 md:px-6 py-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-serif font-semibold text-slate-100 tracking-wide">
                    {CATEGORY_LABELS[category] ?? category}
                  </h3>
                  <span className="text-sm text-slate-400">{effectiveGrouped[category].length} פרומפטים</span>
                </div>
                <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                  {category}
                </span>
              </div>

              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-5">
                  {sortedPrompts.map((prompt, localIdx) => {
                    const isBlurred = isGuest && (sectionStartIndex + localIdx) >= GUEST_FREE_LIMIT;
                    const variablePreview = prompt.variables.slice(0, 4);
                    const remainingVars = prompt.variables.length - variablePreview.length;
                    const popularityCount = popularityMap[prompt.id] ?? 0;
                    const isFavorite = favoriteLibraryIds.has(prompt.id);

                    return (
                      <div
                        key={prompt.id}
                        className={cn(
                          "rounded-3xl border border-white/10 bg-black/30 p-4 md:p-7 transition-colors flex flex-col gap-5 min-h-0 md:min-h-[360px] relative",
                          !isBlurred && "hover:bg-white/5",
                          !isBlurred && (selectedIds.has(prompt.id) || selectionMode) && "ring-2 ring-purple-500/50 bg-purple-500/5",
                          isBlurred && "blur-sm pointer-events-none select-none"
                        )}
                        aria-hidden={isBlurred ? "true" : undefined}
                      >
                        {/* Selection Checkbox Overlay */}
                        {!isBlurred && (
                          <div className={cn(
                            "absolute top-6 left-6 z-10 transition-opacity duration-200",
                            (selectedIds.has(prompt.id) || selectionMode) ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"
                          )}>
                            <button onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }} aria-label={selectedIds.has(prompt.id) ? "בטל בחירה" : "בחר פריט"}>
                              {selectedIds.has(prompt.id)
                                ? <CheckSquare className="w-6 h-6 text-purple-400 fill-purple-500/20" />
                                : <Square className="w-6 h-6 text-slate-500 hover:text-slate-300" />}
                            </button>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CapabilityBadge mode={prompt.capability_mode} />
                            </div>
                            <h4 className="text-lg md:text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title}</h4>
                            <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite("library", prompt.id)}
                            className={cn(
                              "shrink-0 p-2.5 md:p-1.5 rounded-full border transition-colors",
                              isFavorite
                                ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                                : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                            )}
                            aria-pressed={isFavorite}
                            aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                          >
                            <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-400 fill-yellow-400" : "text-yellow-400/50")} />
                          </button>
                        </div>

                        <div className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden" dir="rtl">
                          {prompt.prompt}
                        </div>

                        {prompt.preview_image_url && (
                          <button
                            type="button"
                            onClick={() => setLightboxImage({ url: prompt.preview_image_url!, title: prompt.title })}
                            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 group/img cursor-zoom-in"
                          >
                            <img
                              src={prompt.preview_image_url}
                              alt={`דוגמה שנוצרה מפרומפט: ${prompt.title}`}
                              loading="lazy"
                              decoding="async"
                              width={400}
                              height={300}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center pb-3">
                              <span className="flex items-center gap-1.5 text-xs text-white/90 font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                <ImageIcon className="w-3.5 h-3.5" />
                                הגדל תמונה
                              </span>
                            </div>
                          </button>
                        )}

                        {prompt.variables.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {variablePreview.map((variable) => (
                              <span
                                key={variable}
                                className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300"
                              >
                                {variable}
                              </span>
                            ))}
                            {remainingVars > 0 && (
                              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-500">
                                +{remainingVars}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          {popularityCount > 0 ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span className="text-emerald-400 font-medium">{popularityCount > 99 ? '99+' : popularityCount} משתמשים בחרו</span>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">חדש</span>
                          )}
                          {isFavorite && (
                            <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3 fill-yellow-300" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              מועדף
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => onUsePrompt(prompt)}
                            className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            השתמש
                          </button>
                          <button
                            onClick={() => addPersonalPromptFromLibrary(prompt)}
                            className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3" />
                            שמור
                          </button>
                          <button
                            onClick={async () => { await onCopyText(prompt.prompt); }}
                            className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            העתק
                          </button>
                          <button
                            onClick={() => exportPromptAsImage({
                              title: prompt.title,
                              prompt: prompt.prompt,
                              category: CATEGORY_LABELS[prompt.category] || prompt.category,
                              useCase: prompt.use_case,
                            })}
                            className="flex items-center gap-1.5 p-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="ייצא כתמונה"
                            aria-label="ייצוא כתמונה"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            onClick={() => handleRate(prompt.id, 1)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                              userRatings[prompt.id] === 1
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            )}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>מועיל</span>
                          </button>
                          <button
                            onClick={() => handleRate(prompt.id, -1)}
                            aria-label="לא מועיל"
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                              userRatings[prompt.id] === -1
                                ? "bg-red-500/20 text-red-400"
                                : "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            )}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paywall CTA - rendered once, inside the category section that crosses the free limit */}
                {showCtaInThisSection && (
                  <div
                    dir="rtl"
                    className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-8 pt-32 bg-gradient-to-t from-black via-black/90 to-transparent rounded-b-3xl pointer-events-auto z-10"
                  >
                    <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 mb-1">
                        <Lock className="w-7 h-7 text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-serif font-semibold text-white">
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
            </div>
          );
        })}

        {/* Floating Batch Actions Toolbar */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 w-[calc(100%-2rem)] md:w-auto">
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

        {/* Save Dialog Overlay (Similar to PersonalLibrary Move Dialog) */}
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
                                    className="w-full bg-black/40 border border-purple-500/50 rounded-lg p-3 text-white focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="h-px bg-white/5 my-2" />

                        {personalCategories.concat(PERSONAL_DEFAULT_CATEGORY).map(cat => (
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

        {/* Skeleton - shown while the API fetch is in-flight */}
        {isLibraryFetching && totalCount === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/[0.04] animate-pulse h-32"
              />
            ))}
          </div>
        )}

        {/* Favorites empty state */}
        {!isLibraryFetching && libraryView === "favorites" && totalCount === 0 && (
          <div className="flex flex-col items-center gap-3 text-center py-16" dir="rtl">
            <Star className="w-12 h-12 text-slate-600 mb-2" />
            <p className="text-lg font-semibold text-slate-400">עוד לא סימנת מועדפים</p>
            <p className="text-sm text-slate-500">לחץ על ⭐ כדי לשמור פרומפטים אהובים</p>
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
                alt={`דוגמה שנוצרה מפרומפט: ${lightboxImage.title}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
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
