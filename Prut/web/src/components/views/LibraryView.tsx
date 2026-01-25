"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import Image from "next/image";
import { CATEGORY_LABELS } from "@/lib/constants";
import { BookOpen, Star, Search, CheckSquare, Square, Plus, Copy, FolderInput, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { useState } from "react";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";

interface LibraryViewProps {
  onUsePrompt: (prompt: LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
}

export function LibraryView({ onUsePrompt, onCopyText }: LibraryViewProps) {
  const {
    filteredLibrary,
    libraryQuery,
    setLibraryQuery,
    favoriteLibraryIds,
    handleToggleFavorite,
    setViewMode,
    addPrompt,
    setPersonalView,
    popularityMap,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
    libraryCapabilityCounts,
    personalCategories,
    addPrompts
  } = useLibraryContext();
  
  // -- Local State --
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetMoveCategory, setTargetMoveCategory] = useState("");
  const [isCreatingNewMoveCategory, setIsCreatingNewMoveCategory] = useState(false);
  const [newMoveCategoryInput, setNewMoveCategoryInput] = useState("");
  

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
        console.error(e);
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
        console.error(e);
        toast.error("שגיאה בשמירה קבוצתית");
    }
  };

  const grouped = filteredLibrary.reduce<Record<string, LibraryPrompt[]>>((acc, prompt) => {
    const key = prompt.category || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(prompt);
    return acc;
  }, {});

  const orderedCategories = Object.keys(CATEGORY_LABELS).filter((cat) => grouped[cat]?.length);
  const totalCount = filteredLibrary.length;

  return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="glass-card p-6 rounded-xl border-white/10 bg-black/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-serif text-white">ספריית פרומפטים</h2>
              <p className="text-sm text-slate-500 mt-1">
                {totalCount} פרומפטים זמינים · מיון לפי פופולריות · חיפוש לפי מילים, שימוש או קטגוריה
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode("personal")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-base text-slate-300 hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                ספריה אישית
              </button>
              <button
                 onClick={() => {
                   setViewMode("personal");
                   setPersonalView("favorites");
                 }}
                 className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-base text-slate-300 hover:bg-white/10 transition-colors"
              >
                <Star className="w-5 h-5" />
                מועדפים
              </button>
              
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 ml-2">
                  <button 
                    onClick={() => setSelectionMode(!selectionMode)}
                    className={cn("px-3 py-2 rounded-md transition-all text-xs font-bold flex items-center gap-2", selectionMode ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40" : "text-slate-500 hover:text-slate-300")}
                    title="מצב בחירה מרובה"
                  >
                      <CheckSquare className="w-4 h-4" />
                      <span>ניהול פריטים</span>
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
              className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pr-10 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
            />
          </div>

          {orderedCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {orderedCategories.map((category) => (
                <a
                  key={category}
                  href={`#category-${category}`}
                  className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  suppressHydrationWarning
                >
                  {CATEGORY_LABELS[category] ?? category}
                </a>
              ))}
            </div>
          )}
        </div>

        {orderedCategories.map((category) => (
          <div
            key={category}
            id={`category-${category}`}
            className="space-y-4 scroll-mt-24 rounded-3xl border border-white/5 bg-gradient-to-l from-white/[0.035] via-white/[0.015] to-transparent px-4 md:px-6 py-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-baseline gap-3">
                <h3 className="text-2xl md:text-3xl font-serif font-semibold text-slate-100 tracking-wide">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <span className="text-sm text-slate-400">{grouped[category].length} פרומפטים</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                {category}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {[...grouped[category]]
                .sort((a, b) => {
                  const aFavorite = favoriteLibraryIds.has(a.id);
                  const bFavorite = favoriteLibraryIds.has(b.id);
                  if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;

                  const aPopularity = popularityMap[a.id] ?? 0;
                  const bPopularity = popularityMap[b.id] ?? 0;
                  if (aPopularity !== bPopularity) return bPopularity - aPopularity;

                  return a.title.localeCompare(b.title);
                })
                .map((prompt) => {
                const variablePreview = prompt.variables.slice(0, 4);
                const remainingVars = prompt.variables.length - variablePreview.length;
                const popularityCount = popularityMap[prompt.id] ?? 0;
                const isFavorite = favoriteLibraryIds.has(prompt.id);

                return (
                  <div
                    key={prompt.id}
                    className={cn(
                        "rounded-3xl border border-white/10 bg-black/30 p-6 md:p-7 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[360px] relative",
                        (selectedIds.has(prompt.id) || selectionMode) && "ring-2 ring-purple-500/50 bg-purple-500/5"
                    )}
                  >
                    {/* Selection Checkbox Overlay */}
                    <div className={cn(
                         "absolute top-6 left-6 z-10 transition-opacity duration-200",
                         (selectedIds.has(prompt.id) || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                     )}>
                         <button onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }}>
                             {selectedIds.has(prompt.id) 
                               ? <CheckSquare className="w-6 h-6 text-purple-400 fill-purple-500/20" /> 
                               : <Square className="w-6 h-6 text-slate-500 hover:text-slate-300" />}
                         </button>
                     </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <CapabilityBadge mode={prompt.capability_mode} />
                        </div>
                        <h4 className="text-xl md:text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title}</h4>
                        <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite("library", prompt.id)}
                        className={cn(
                          "shrink-0 p-1.5 rounded-full border transition-colors",
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

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{popularityCount > 0 ? `נבחר ${popularityCount} פעמים` : "חדש"}</span>
                      {isFavorite && <span className="text-yellow-300">מועדף</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => onUsePrompt(prompt)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        השתמש בפרומפט
                      </button>
                      <button
                        onClick={() => addPersonalPromptFromLibrary(prompt)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        שמור לאישי
                      </button>
                      <button
                        onClick={async () => {
                          await onCopyText(prompt.prompt);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        העתק
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Floating Batch Actions Toolbar */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                <div className="pl-4 pr-3 text-sm font-medium text-white border-r border-white/10">
                    {selectedIds.size} נבחרו
                </div>
                <button onClick={() => setShowMoveDialog(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-purple-600/20 rounded-xl text-purple-300 transition-all font-bold text-sm">
                    <FolderInput className="w-4 h-4" />
                    שמור לאישי
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={clearSelection} className="p-1 hover:bg-white/10 rounded-full text-slate-500">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Save Dialog Overlay (Similar to PersonalLibrary Move Dialog) */}
        {showMoveDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
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

        {totalCount === 0 && (
          <div className="glass-card p-10 rounded-xl border-white/10 bg-black/40 text-center text-slate-500">
            לא נמצאו פרומפטים תואמים לחיפוש שלך.
          </div>
        )}
      </div>
  );
}
