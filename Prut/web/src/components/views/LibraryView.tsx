"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { CATEGORY_LABELS } from "@/lib/constants";
import { BookOpen, Star, Plus, Copy, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryPrompt } from "@/lib/types";
import { GlowingEdgeCard } from "@/components/ui/GlowingEdgeCard";
import { toast } from "sonner";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { CapabilityMode } from "@/lib/capability-mode";

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
    libraryCapabilityCounts
  } = useLibraryContext();
  
  const PERSONAL_DEFAULT_CATEGORY = "כללי";

  const addPersonalPromptFromLibrary = async (prompt: LibraryPrompt) => {
    try {
        await addPrompt({
            title_he: prompt.title_he,
            prompt_he: prompt.prompt_he,
            category: prompt.category,
            personal_category: PERSONAL_DEFAULT_CATEGORY,
            use_case: prompt.use_case,
            source: "library",
            reference: prompt.id,
            prompt_style: undefined
        });
        toast.success("נשמר לספריה האישית");
    } catch (e) {
        console.error(e);
        toast.error("שגיאה בשמירה");
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
        {/* Small Header Logo */}
        <div className="flex items-center justify-start -mb-4">
          <button 
            onClick={() => setViewMode("home")}
            className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/logo.svg" 
              alt="Peroot" 
              className="h-24 w-auto brightness-110 transition-transform group-hover:scale-105" 
            />
          </button>
        </div>
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

                  return a.title_he.localeCompare(b.title_he);
                })
                .map((prompt) => {
                const variablePreview = prompt.variables.slice(0, 4);
                const remainingVars = prompt.variables.length - variablePreview.length;
                const popularityCount = popularityMap[prompt.id] ?? 0;
                const isFavorite = favoriteLibraryIds.has(prompt.id);

                return (
                  <div
                    key={prompt.id}
                    className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-7 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[360px]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <CapabilityBadge mode={prompt.capability_mode} />
                        </div>
                        <h4 className="text-xl md:text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
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
                      {prompt.prompt_he}
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
                          await onCopyText(prompt.prompt_he);
                          // incrementPopularity? Not in View.
                          // But we should track. Maybe onCopyText does it? 
                          // Or we expose incrementPopularity from context if needed.
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

        {totalCount === 0 && (
          <div className="glass-card p-10 rounded-xl border-white/10 bg-black/40 text-center text-slate-500">
            לא נמצאו פרומפטים תואמים לחיפוש שלך.
          </div>
        )}
      </div>
  );
}
