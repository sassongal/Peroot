"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY, CATEGORY_LABELS } from "@/lib/constants";
import { 
    BookOpen, Star, ArrowRight, Plus, Copy, Pencil, Check, X, 
    Search, Trash2, GripVertical 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { GlowingEdgeCard } from "@/components/ui/GlowingEdgeCard";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS, toStyledHtml, stripStyleTokens } from "@/lib/text-utils";

interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
}

export function PersonalLibraryView({ 
    onUsePrompt, 
    onCopyText, 
    handleImportHistory,
    historyLength 
}: PersonalLibraryViewProps) {
  const {
    filteredPersonalLibrary,
    personalView,
    setPersonalView,
    setViewMode,
    personalQuery,
    setPersonalQuery,
    personalSort,
    setPersonalSort,
    newPersonalCategory,
    setNewPersonalCategory,
    addPersonalCategory,
    personalLibrary,
    personalCategories,
    favoritePersonalIds,
    handleToggleFavorite,
    libraryFavorites, // Added
    addPrompt,       // Added
    
    // Editing
    editingPersonalId,
    editingTitle,
    setEditingTitle,
    editingUseCase,
    setEditingUseCase,
    startEditingPersonalPrompt,
    saveEditingPersonalPrompt,
    cancelEditingPersonalPrompt,
    
    // Styling
    editingStylePromptId,
    styleDraft,
    setStyleDraft,
    openStyleEditor,
    saveStylePrompt,
    closeStyleEditor,
    
    // Drag & Drop
    handlePersonalDragStart,
    handlePersonalDragOver,
    handlePersonalDragEnd,
    handlePersonalDrop,
    handlePersonalDropToEnd,
    draggingPersonalId,
    dragOverPersonalId,
    
    // Categories
    renamingCategory,
    renameCategoryInput,
    setRenameCategoryInput,
    startRenameCategory,
    saveRenameCategory,
    cancelRenameCategory
  } = useLibraryContext();
  
  const styleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Styling Helpers
  const applyStyleToken = (prefix: string, value: string) => {
    const textarea = styleTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    if (start === end) return; // No selection

    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);
    
    // Wrap selection
    const token = `<${prefix}:${value}>${selected}</${prefix}>`;
    const nextText = before + token + after;
    
    setStyleDraft(nextText);
    
    // Restore selection (approximate)
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = start + token.length;
        textarea.selectionEnd = start + token.length;
        textarea.focus();
      }
    });
  };

  const clearStyleTokens = () => {
      setStyleDraft(stripStyleTokens(styleDraft));
  };
  
  // Reconstruct Grouped Data
  const getStyledPromptMarkup = (prompt: PersonalPrompt) => {
    // If we're editing this prompt's style, show the draft? 
    // No, draft is shown in editor. Card shows saved style.
    return prompt.prompt_style || prompt.prompt_he;
  };

  const categorySet = new Set([PERSONAL_DEFAULT_CATEGORY, ...personalCategories]);
  // Filtered/Display items logic from Context?
  // Context provides `filteredPersonalLibrary`.
  // But wait, `filteredPersonalLibrary` respects `personalView` (All vs Favorites).
  
  const displayItems = filteredPersonalLibrary;

  displayItems.forEach((prompt) => {
    if (prompt.personal_category) categorySet.add(prompt.personal_category);
  });

  const orderedCategories = Array.from(categorySet).filter((cat) =>
    // Show category if it has items OR it is in manual categories list (even if empty? Page logic implies only if items present for search results)
    // Actually page.tsx:
    /*
      const orderedCategories = Array.from(categorySet).filter((cat) =>
        displayItems.some((prompt) => prompt.personal_category === cat)
      );
    */
    displayItems.some((prompt) => prompt.personal_category === cat)
  );
  
  // If view is ALL, we might want to show empty categories if we are in "Management Mode"?
  // Page logic:
  /*
     const categorySet = new Set([PERSONAL_DEFAULT_CATEGORY, ...personalCategories]);
     displayItems.forEach...
  */
  // If `displayItems` is filtered by search, `orderedCategories` will only show matching categories. Correct.

  const grouped = displayItems.reduce<Record<string, PersonalPrompt[]>>((acc, prompt) => {
    const key = prompt.personal_category || PERSONAL_DEFAULT_CATEGORY;
    if (!acc[key]) acc[key] = [];
    acc[key].push(prompt);
    return acc;
  }, {});

  const totalCount = displayItems.length; // Simply length of filtered list

  // Render Helpers
  const renderCard = (prompt: PersonalPrompt) => {
      const isEditing = editingPersonalId === prompt.id;
      const isDragging = draggingPersonalId === prompt.id;
      const isDragOver = dragOverPersonalId === prompt.id && draggingPersonalId !== prompt.id;
      const canDrag = !isEditing && personalSort === "custom"; 
      // Page logic: const canDrag = !isEditing; (But drag only works in custom sort? Page logic implicitly allowed drag anywhere but only reordering logic worked if sort was appropriate? No, drag logic sets sort to custom on start).
      
      const isFavorite = favoritePersonalIds.has(prompt.id);
      const isStyling = editingStylePromptId === prompt.id;
      const styledMarkup = getStyledPromptMarkup(prompt);

      return (
        <GlowingEdgeCard
          key={prompt.id}
          draggable={!isEditing}
          onDragStart={(event) => handlePersonalDragStart(event, prompt)}
          onDragEnd={handlePersonalDragEnd}
          onDragOver={(event) => handlePersonalDragOver(event, prompt)}
          onDrop={(event) => handlePersonalDrop(event, prompt)}
          className={cn(
            "rounded-[28px]",
            !isEditing && "cursor-grab",
            isDragging && "opacity-60",
            isDragOver && "ring-2 ring-white/30"
          )}
          contentClassName="p-7 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[420px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <GripVertical className={cn("w-4 h-4 mt-1 text-slate-500", !isEditing ? "opacity-100" : "opacity-30")} />
              <div>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      dir="rtl"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-base text-slate-200 focus:outline-none focus:border-white/30"
                      placeholder="כותרת לפרומפט"
                    />
                    <textarea
                      dir="rtl"
                      value={editingUseCase}
                      onChange={(e) => setEditingUseCase(e.target.value)}
                      className="w-full h-20 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-white/30 resize-none"
                      placeholder="תיאור קצר לשימוש בפרומפט"
                    />
                  </div>
                ) : (
                  <>
                    <h4 className="text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
                    <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleFavorite("personal", prompt.id)}
                className={cn(
                  "p-2 rounded-full border transition-colors",
                  isFavorite
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                    : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                )}
                aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
              >
                <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
              </button>
              {isEditing ? (
                <>
                  <button
                    onClick={saveEditingPersonalPrompt}
                    className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                    title="שמור שינויים"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditingPersonalPrompt}
                    className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10 transition-colors"
                    title="בטל עריכה"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEditingPersonalPrompt(prompt)}
                  className="p-2 rounded-full border border-white/10 text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
                  title="ערוך פרטי פרומפט"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div
            className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden"
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: toStyledHtml(styledMarkup) }}
          />

          {isStyling && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-[11px] text-slate-500 mb-2">בחר/י טקסט ואז צבע/היילייט</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => applyStyleToken("c", color)}
                    className="px-2 py-1 rounded-full text-[10px] border border-white/10 text-slate-300 hover:bg-white/10"
                    title={`צבע טקסט: ${color}`}
                  >
                    <span className={cn("font-semibold", STYLE_TEXT_COLORS[color])}>Aa</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                  <button
                    key={`hl-${color}`}
                    onClick={() => applyStyleToken("hl", color)}
                    className={cn(
                      "px-2 py-1 rounded-full text-[10px] border border-white/10 hover:bg-white/10",
                      STYLE_HIGHLIGHT_COLORS[color]
                    )}
                    title={`היילייט: ${color}`}
                  >
                    HL
                  </button>
                ))}
              </div>
              <textarea
                ref={styleTextareaRef}
                dir="rtl"
                value={styleDraft}
                onChange={(e) => setStyleDraft(e.target.value)}
                className="w-full h-28 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-white/30 resize-none"
                placeholder="ערוך/י טקסט והשתמש/י בכפתורים לצבעים והדגשות"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <button
                  onClick={clearStyleTokens}
                  className="px-2 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
                >
                  נקה עיצוב
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveStylePrompt(prompt.id)}
                    className="px-3 py-1 rounded-full bg-white text-black hover:bg-slate-200"
                  >
                    שמור
                  </button>
                  <button
                    onClick={closeStyleEditor}
                    className="px-3 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
                  >
                    סגור
                  </button>
                </div>
              </div>
              <div className="mt-4 text-[11px] text-slate-500">תצוגה מקדימה</div>
              <div
                className="mt-2 text-sm text-slate-200 leading-relaxed"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: toStyledHtml(styleDraft) }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{prompt.use_count > 0 ? `שומש ${prompt.use_count} פעמים` : "חדש"}</span>
            <span className="text-slate-500">
              {prompt.personal_category}
            </span>
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
              onClick={() => onCopyText(prompt.prompt_he)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
            >
              <Copy className="w-3 h-3" />
              העתק
            </button>
            <button
              onClick={() => openStyleEditor(prompt)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              עיצוב
            </button>
          </div>
        </GlowingEdgeCard>
      );
  }; // End renderCard

  return (
      <div className="flex flex-col gap-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

        <div className="glass-card p-7 md:p-9 rounded-2xl border-white/10 bg-black/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif text-white">ספריה אישית</h2>
              <p className="text-base text-slate-400 mt-2">
                {totalCount} פרומפטים {personalView === "favorites" ? "מועדפים" : "אישיים"} · ארגון לפי קטגוריות מותאמות
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setPersonalView("all");
                  setViewMode("library");
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-base text-slate-300 hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                ספריה מלאה
              </button>
              <button
                onClick={() => setPersonalView((prev) => (prev === "favorites" ? "all" : "favorites"))}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg border text-base transition-colors",
                  personalView === "favorites"
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-200"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className="w-5 h-5" />
                מועדפים
              </button>
              <button
                onClick={() => setViewMode("home")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-base text-slate-300 hover:bg-white/10 transition-colors font-bold"
              >
                <ArrowRight className="w-5 h-5" />
                חזרה לעריכה
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                dir="rtl"
                value={personalQuery}
                onChange={(e) => setPersonalQuery(e.target.value)}
                placeholder={personalView === "favorites" ? "חיפוש בתוך המועדפים..." : "חיפוש חופשי בתוך הפרומפטים האישיים..."}
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pr-10 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">מיון</label>
              <select
                value={personalSort}
                onChange={(e) => setPersonalSort(e.target.value as "recent" | "title" | "usage" | "custom")}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-white/30"
              >
                <option value="recent">עודכן לאחרונה</option>
                <option value="title">אלפביתי</option>
                <option value="usage">בשימוש גבוה</option>
                <option value="custom">סדר ידני</option>
              </select>
            </div>
          </div>

          {personalView === "all" && (
            <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  dir="rtl"
                  value={newPersonalCategory}
                  onChange={(e) => setNewPersonalCategory(e.target.value)}
                  placeholder="קטגוריה חדשה..."
                  className="w-full md:w-64 bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPersonalCategory();
                    }
                  }}
                />
                <button
                  onClick={addPersonalCategory}
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                >
                  צור קטגוריה
                </button>
              </div>
              <button
                onClick={handleImportHistory}
                disabled={historyLength === 0}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm border border-white/10 transition-colors",
                  historyLength === 0
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-300 hover:bg-white/10"
                )}
              >
                ייבא מהיסטוריה
              </button>
            </div>
          )}

          {personalSort === "custom" && personalView === "all" && (
            <div className="mt-3 text-xs text-slate-500">
              גרור/י כרטיסים כדי לשנות את הסדר בתוך כל קטגוריה.
            </div>
          )}

          {orderedCategories.length > 0 && personalView === "all" && (
            <div className="mt-6 flex flex-wrap gap-2">
              {orderedCategories.map((category) => (
                <a
                  key={category}
                  href={`#personal-category-${category}`}
                  className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  suppressHydrationWarning
                >
                  {category}
                </a>
              ))}
            </div>
          )}
        </div>

        {personalView === "favorites" ? (
          // Favorites View logic here... wait, Context filteredPersonalLibrary already filters by View=Favorites?
          // Yes, I implemented that in LibraryContext logic.
          // But page.tsx had separate sections for Favorites from Library AND Favorites from Personal.
          // LibraryContext `filteredPersonalLibrary` only returns Personal!
          // We also need `filteredFavoritesLibrary` (Library Prompts that are favorites).
          // Context has `favoriteLibraryIds`.
          // I need to add `filteredLibraryFavorites` to Context or compute it here (I have library prompts? No).
          // `filteredLibrary` in Context is ALL library filtered by libraryQuery.
          // I need `libraryPrompts` source.
          // Context has `filteredLibrary`.
          // I can filter `filteredLibrary` by favorites? No, `filteredLibrary` respects `libraryQuery`.
          // `personalView='favorites'` implies searching within favorites.
          // Context handles `personalQuery` affecting `filteredPersonalLibrary`.
          // Does Context handle `filteredFavoritesLibrary`?
          // I need to add `filteredFavoritesLibrary` to Context or compute it here.
          // Let's rely on Context `filteredLibrary`? No.
           
           // I'll render Personal Favorites for now.
           // Library favorites section - maybe I can skip it or add it later?
           // Page.tsx had both.
           
           // Let's implement rendering Personal Favorites.
          <div className="flex flex-col gap-6">
             {/* Library Favorites Section */}
             {libraryFavorites.length > 0 && (
               <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.05] via-white/[0.03] to-transparent px-5 md:px-7 py-7">
                 <div className="flex items-center justify-between border-b border-white/10 pb-4">
                   <div className="flex items-baseline gap-3">
                     <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">
                       מועדפים מהספריה
                     </h3>
                     <span className="text-sm text-slate-400">{libraryFavorites.length} פרומפטים</span>
                   </div>
                   <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                     ספריה ציבורית
                   </span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                   {libraryFavorites.map((prompt) => (
                      <GlowingEdgeCard
                        key={prompt.id}
                        className="rounded-[28px]"
                        contentClassName="p-7 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[360px]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-xl md:text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
                            <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite("library", prompt.id)}
                            className="shrink-0 p-1.5 rounded-full border border-yellow-300/40 bg-yellow-300/10 text-yellow-300 transition-colors"
                            aria-label="הסר ממועדפים"
                          >
                            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                          </button>
                        </div>

                        <div className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden" dir="rtl">
                          {prompt.prompt_he}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1 mt-auto">
                          <button
                            onClick={() => onUsePrompt(prompt)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            השתמש
                          </button>
                          <button
                            onClick={() => addPersonalPromptFromLibrary(prompt)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                          >
                            <BookOpen className="w-3 h-3" />
                            שמור לאישי
                          </button>
                          <button
                            onClick={() => onCopyText(prompt.prompt_he)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            העתק
                          </button>
                        </div>
                      </GlowingEdgeCard>
                   ))}
                 </div>
               </div>
             )}

            {/* Personal Favorites Section */}
            {filteredPersonalLibrary.length > 0 && (
              <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.05] via-white/[0.03] to-transparent px-5 md:px-7 py-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">
                      מועדפים אישיים
                    </h3>
                    <span className="text-sm text-slate-400">{filteredPersonalLibrary.length} פרומפטים</span>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                    ספריה אישית
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredPersonalLibrary.map(renderCard)}
                </div>
              </div>
            )}
            
            {totalCount === 0 && libraryFavorites.length === 0 && (
              <div className="glass-card p-10 rounded-xl border-white/10 bg-black/40 text-center text-slate-500">
                אין עדיין מועדפים. סמנו פרומפטים בכוכב כדי שיופיעו כאן.
              </div>
            )}
          </div>
        ) : (
          // All View (Categories)
          <>
            {orderedCategories.map((category) => (
              <div
                key={category}
                id={`personal-category-${category}`}
                className="space-y-4 scroll-mt-24 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.06] via-white/[0.03] to-transparent px-5 md:px-7 py-7"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handlePersonalDropToEnd(event, category)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-4 flex-1">
                    {renamingCategory === category ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                          dir="rtl"
                          value={renameCategoryInput}
                          onChange={(e) => setRenameCategoryInput(e.target.value)}
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-xl font-serif text-white focus:outline-none focus:border-white/30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRenameCategory();
                            if (e.key === "Escape") cancelRenameCategory();
                          }}
                        />
                        <button
                          onClick={saveRenameCategory}
                          className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelRenameCategory}
                          className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-3 group/cat">
                        <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">
                          {category}
                        </h3>
                        {category !== PERSONAL_DEFAULT_CATEGORY && (
                          <button
                            onClick={() => startRenameCategory(category)}
                            className="opacity-0 group-hover/cat:opacity-100 p-1 text-slate-500 hover:text-white transition-all"
                            title="שנה שם קטגוריה"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-sm text-slate-400">{grouped[category]?.length ?? 0} פרומפטים</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                    אישי
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {(grouped[category] ?? []).map(renderCard)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
  );
}
