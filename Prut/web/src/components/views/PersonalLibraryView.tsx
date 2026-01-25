"use client";

import Image from "next/image";
import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { 
    BookOpen, Star, ArrowRight, Plus, Copy, Pencil, Check, X, 
    Search, Trash2, GripVertical, LayoutGrid, LayoutList, 
    CheckSquare, Square, Tag, Download, FolderInput, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { GlowingEdgeCard } from "@/components/ui/GlowingEdgeCard";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS, toStyledHtml, stripStyleTokens } from "@/lib/text-utils";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";

interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
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
    personalCategories,
    favoritePersonalIds,
    handleToggleFavorite,
    libraryFavorites,
    addPrompt,
    
    // Batch & Edit
    deletePrompts,
    movePrompts,
    updateTags,
    
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
    cancelRenameCategory,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
    personalCapabilityCounts
  } = useLibraryContext();
  
  const styleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // -- Local State --
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Dialogs State
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
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
  
  const getStyledPromptMarkup = (prompt: PersonalPrompt) => {
    return prompt.prompt_style || prompt.prompt;
  };

  // -- Batch Logic --
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllCategory = (category: string) => {
     const idsInCategory = (grouped[category] || []).map(p => p.id);
     const next = new Set(selectedIds);
     const allSelected = idsInCategory.every(id => next.has(id));
     
     if (allSelected) {
         idsInCategory.forEach(id => next.delete(id));
     } else {
         idsInCategory.forEach(id => next.add(id));
     }
     setSelectedIds(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedIds);
    const visibleIds = displayItems.map(p => p.id);
    const allVisibleSelected = visibleIds.every(id => next.has(id));
    
    if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
    } else {
        visibleIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
      setSelectedIds(new Set());
      setSelectionMode(false);
  };
  
  const handleBatchDelete = async () => {
      if (!confirm(`האם למחוק ${selectedIds.size} פרומפטים מסומנים?`)) return;
      try {
          await deletePrompts(Array.from(selectedIds));
          toast.success("נמחקו בהצלחה");
          clearSelection();
      } catch {
          toast.error("שגיאה במחיקה");
      }
  };

  const handleBatchMove = async () => {
      const category = isCreatingNewMoveCategory ? newMoveCategoryInput.trim() : targetMoveCategory;
      if (!category) return;
      try {
          await movePrompts(Array.from(selectedIds), category);
          toast.success("הועברו בהצלחה");
          setShowMoveDialog(false);
          setIsCreatingNewMoveCategory(false);
          setNewMoveCategoryInput("");
          clearSelection();
      } catch {
          toast.error("שגיאה בהעברה");
      }
  };

  const handleBatchTag = async () => {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      try {
          // We Add tags to existing ones
          const promises = Array.from(selectedIds).map(async (id) => {
              const item = filteredPersonalLibrary.find(p => p.id === id);
              if (!item) return;
              // Union of existing tags and new tags
              const newTags = Array.from(new Set([...(item.tags || []), ...tags]));
              await updateTags(id, newTags);
          });
          
          await Promise.all(promises);
          toast.success("תגיות עודכנו");
          setShowTagDialog(false);
          setTagsInput("");
          clearSelection();
      } catch {
          toast.error("שגיאה בעדכון תגיות");
      }
  };

  const handleBatchExport = () => {
      const items = filteredPersonalLibrary.filter(p => selectedIds.has(p.id));
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `peroot_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast.success("יצוא הושלם");
  };

  // -- Grouping Logic --
  // We use filteredPersonalLibrary from context, which respects active capability filter?
  // Yes, filteredPersonalLibrary is already filtered by capability and search query.
  
  const displayItems = filteredPersonalLibrary;
  
  // Re-derive categories present in display items
  const categorySet = new Set([PERSONAL_DEFAULT_CATEGORY, ...personalCategories]);
  
  const orderedCategories = Array.from(categorySet).filter((cat) =>
    displayItems.some((prompt) => prompt.personal_category === cat || (!prompt.personal_category && cat === PERSONAL_DEFAULT_CATEGORY))
  );

  const grouped: Record<string, PersonalPrompt[]> = {};
  if (displayItems && Array.isArray(displayItems)) {
    for (const prompt of displayItems) {
      const key = prompt.personal_category || PERSONAL_DEFAULT_CATEGORY;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(prompt);
    }
  }

  const totalCount = displayItems.length;

  // -- Renderers --

  const renderPromptTags = (tags?: string[]) => {
      if (!tags?.length) return null;
      return (
          <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-slate-300 border border-white/5">
                      <Tag className="w-3 h-3 mr-1 opacity-50" />
                      {tag}
                  </span>
              ))}
          </div>
      );
  };

  const renderCard = (prompt: PersonalPrompt) => {
      const isEditing = editingPersonalId === prompt.id;
      const isDragging = draggingPersonalId === prompt.id;
      const isDragOver = dragOverPersonalId === prompt.id && draggingPersonalId !== prompt.id;
      const isFavorite = favoritePersonalIds.has(prompt.id);
      const isStyling = editingStylePromptId === prompt.id;
      const styledMarkup = getStyledPromptMarkup(prompt);
      const isSelected = selectedIds.has(prompt.id);

      return (
        <GlowingEdgeCard
          key={prompt.id}
          draggable={!isEditing && layoutMode === "grid"}
          onDragStart={(event) => handlePersonalDragStart(event, prompt)}
          onDragEnd={handlePersonalDragEnd}
          onDragOver={(event) => handlePersonalDragOver(event, prompt)}
          onDrop={(event) => handlePersonalDrop(event, prompt)}
          className={cn(
            "rounded-[28px] group relative",
            !isEditing && "cursor-grab",
            isDragging && "opacity-60",
            isDragOver && "ring-2 ring-white/30",
            (isSelected || selectionMode) && "ring-2 ring-blue-500/50 bg-blue-500/5"
          )}
          contentClassName="p-7 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[420px]"
        >
          {/* Selection Checkbox Overlay */}
          <div className={cn(
               "absolute top-6 left-6 z-10 transition-opacity duration-200",
               (isSelected || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
           )}>
               <button onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }}>
                   {isSelected 
                     ? <CheckSquare className="w-6 h-6 text-blue-400 fill-blue-500/20" /> 
                     : <Square className="w-6 h-6 text-slate-500 hover:text-slate-300" />}
               </button>
           </div>

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
                    <div className="flex flex-wrap gap-2 mb-1">
                        <CapabilityBadge mode={prompt.capability_mode} />
                    </div>
                    <h4 className="text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title}</h4>
                    <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                    {renderPromptTags(prompt.tags)}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pl-8"> {/* pl-8 to avoid overlap with checkbox */}
              <button
                type="button"
                onClick={() => handleToggleFavorite("personal", prompt.id)}
                className={cn(
                  "p-2 rounded-full border transition-colors",
                  isFavorite
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                    : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
              </button>
              {isEditing ? (
                <>
                  <button onClick={saveEditingPersonalPrompt} className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={cancelEditingPersonalPrompt} className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEditingPersonalPrompt(prompt)}
                  className="p-2 rounded-full border border-white/10 text-slate-500 hover:text-slate-200 hover:bg-white/10"
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
             <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 relative z-20">
               {/* Style Editor UI - Simplified for Brevity (Same as before) */}
               <div className="text-[11px] text-slate-500 mb-2">בחר/י טקסט ואז צבע/היילייט</div>
               <div className="flex flex-wrap gap-2 mb-3">
                 {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                   <button key={`text-${color}`} onClick={() => applyStyleToken("c", color)} className="px-2 py-1 rounded-full text-[10px] border border-white/10 text-slate-300 hover:bg-white/10">
                     <span className={cn("font-semibold", STYLE_TEXT_COLORS[color])}>Aa</span>
                   </button>
                 ))}
               </div>
               <div className="flex flex-wrap gap-2 mb-3">
                 {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                   <button key={`hl-${color}`} onClick={() => applyStyleToken("hl", color)} className={cn("px-2 py-1 rounded-full text-[10px] border border-white/10 hover:bg-white/10", STYLE_HIGHLIGHT_COLORS[color])}>HL</button>
                 ))}
               </div>
               <textarea
                 ref={styleTextareaRef} dir="rtl" value={styleDraft} onChange={(e) => setStyleDraft(e.target.value)}
                 className="w-full h-28 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-white/30 resize-none"
               />
               <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                 <button onClick={clearStyleTokens} className="px-2 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10">נקה עיצוב</button>
                 <div className="flex items-center gap-2">
                   <button onClick={() => saveStylePrompt(prompt.id)} className="px-3 py-1 rounded-full bg-white text-black hover:bg-slate-200">שמור</button>
                   <button onClick={closeStyleEditor} className="px-3 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10">סגור</button>
                 </div>
               </div>
             </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{prompt.use_count > 0 ? `שומש ${prompt.use_count} פעמים` : "חדש"}</span>
            <span className="text-slate-500">{prompt.personal_category}</span>
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
              onClick={() => onCopyText(prompt.prompt)}
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
  };

  const renderListItem = (prompt: PersonalPrompt) => {
      const isSelected = selectedIds.has(prompt.id);
      const isFavorite = favoritePersonalIds.has(prompt.id);
      
      return (
          <div key={prompt.id} className={cn(
              "group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors",
              isSelected && "bg-blue-500/10 border-blue-500/20"
          )}>
              {/* Checkbox */}
              <button 
                onClick={() => toggleSelection(prompt.id)}
                className="shrink-0 text-slate-500 hover:text-slate-300"
              >
                 {isSelected 
                    ? <CheckSquare className="w-5 h-5 text-blue-400" /> 
                    : <Square className="w-5 h-5 opacity-50 group-hover:opacity-100" />}
              </button>
              
              {/* Capability Icon */}
              <div className="shrink-0">
                  <CapabilityBadge mode={prompt.capability_mode} className="scale-75 origin-left" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                  <div className="flex items-center gap-2 mb-1">
                      {renderPromptTags(prompt.tags)}
                      <h4 className="text-base text-slate-200 font-medium truncate">{prompt.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500 truncate w-full max-w-[60vw]" dir="rtl">{prompt.use_case}</p>
              </div>
              
              {/* Stats & Category */}
              <div className="hidden lg:block text-right text-xs text-slate-500 w-32 shrink-0">
                  <div className="text-slate-400">{prompt.personal_category}</div>
                  <div>שומש {prompt.use_count} פעמים</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onUsePrompt(prompt)} title="השתמש" className="p-2 hover:bg-white/10 rounded-full text-white"><Plus className="w-4 h-4"/></button>
                  <button onClick={() => onCopyText(prompt.prompt)} title="העתק" className="p-2 hover:bg-white/10 rounded-full text-slate-300"><Copy className="w-4 h-4"/></button>
                  <button onClick={() => startEditingPersonalPrompt(prompt)} title="ערוך" className="p-2 hover:bg-white/10 rounded-full text-slate-300"><Pencil className="w-4 h-4"/></button>
                  <button onClick={() => handleToggleFavorite("personal", prompt.id)} className="p-2 hover:bg-white/10 rounded-full">
                      <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
                  </button>
              </div>
          </div>
      )
  };

  return (
      <div className="flex flex-col gap-7 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-24">


        <div className="glass-card p-7 md:p-9 rounded-2xl border-white/10 bg-black/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif text-white">ספריה אישית</h2>
              <p className="text-base text-slate-400 mt-2">
                {totalCount} פרומפטים {personalView === "favorites" ? "מועדפים" : "אישיים"} · ארגון לפי קטגוריות
              </p>
            </div>
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 mx-2">
                  <button 
                    onClick={() => setLayoutMode("grid")}
                    className={cn("p-2 rounded-md transition-colors", layoutMode === "grid" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
                    title="תצוגת כרטיסים"
                  >
                      <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setLayoutMode("list")}
                    className={cn("p-2 rounded-md transition-colors", layoutMode === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
                    title="תצוגת רשימה"
                  >
                      <LayoutList className="w-5 h-5" />
                  </button>
              </div>

              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 ml-2">
                  <button 
                    onClick={() => setSelectionMode(!selectionMode)}
                    className={cn("px-3 py-2 rounded-md transition-all text-xs font-bold flex items-center gap-2", selectionMode ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-500 hover:text-slate-300")}
                    title="מצב בחירה מרובה"
                  >
                      <CheckSquare className="w-4 h-4" />
                      <span>ניהול פריטים</span>
                  </button>
                  {selectionMode && (
                      <button 
                         onClick={selectAllVisible}
                         className="px-3 py-2 rounded-md text-xs font-bold text-slate-300 hover:text-white"
                      >
                          בחר הכל ({totalCount})
                      </button>
                  )}
              </div>

              <button
                onClick={() => { setPersonalView("all"); setViewMode("library"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                ספריה מלאה
              </button>
              <button
                onClick={() => setPersonalView(personalView === "favorites" ? "all" : "favorites")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors",
                  personalView === "favorites"
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-200"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className="w-4 h-4" />
                מועדפים ({favoritePersonalIds.size})
              </button>
              <button
                onClick={() => setViewMode("home")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors font-bold"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </button>
            </div>
          </div>

          <div className="mt-6 mb-4">
             <CapabilityFilter
               value={selectedCapabilityFilter}
               onChange={setSelectedCapabilityFilter}
               counts={personalCapabilityCounts}
             />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                dir="rtl"
                value={personalQuery}
                onChange={(e) => setPersonalQuery(e.target.value)}
                placeholder={personalView === "favorites" ? "חיפוש במועדפים..." : "חיפוש בפרומפטים..."}
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

          {/* New Category Input */}
          {personalView === "all" && (
            <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  dir="rtl"
                  value={newPersonalCategory}
                  onChange={(e) => setNewPersonalCategory(e.target.value)}
                  placeholder="קטגוריה חדשה..."
                  className="w-full md:w-64 bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPersonalCategory(); } }}
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
                className={cn("px-4 py-2 rounded-lg text-sm border border-white/10 transition-colors", historyLength === 0 ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-white/10")}
              >
                ייבא מהיסטוריה
              </button>
            </div>
          )}
          
          {/* Main Content Area */}
          <div className="mt-8 space-y-10">
              {personalView === "favorites" ? (
                  // Favorites View
                  <div className="space-y-4">
                      {libraryFavorites.length > 0 && (
                          <div className="mb-8">
                              <h3 className="text-2xl text-slate-200 mb-4 font-serif">מועדפים מהספריה הציבורית</h3>
                              <div className={cn("grid gap-4", layoutMode === "grid" ? "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}>
                                  {libraryFavorites.map(p => (
                                      // Minimal card for library favorites (read-only mostly)
                                      <GlowingEdgeCard key={p.id} className="rounded-2xl" contentClassName="p-6 flex flex-col gap-4">
                                          <div className="flex justify-between">
                                              <h4 className="text-white font-semibold">{p.title}</h4>
                                              <button onClick={() => handleToggleFavorite("library", p.id)}><Star className="w-4 h-4 text-yellow-300 fill-yellow-300"/></button>
                                          </div>
                                          <p className="text-slate-400 text-sm">{p.use_case}</p>
                                          <div className="flex gap-2 mt-auto">
                                              <button onClick={() => onUsePrompt(p)} className="flex-1 bg-white text-black py-2 rounded text-xs font-bold">השתמש</button>
                                              <button onClick={() => addPersonalPromptFromLibrary(p)} className="flex-1 border border-white/10 text-slate-300 py-2 rounded text-xs">שמור עותק</button>
                                          </div>
                                      </GlowingEdgeCard>
                                  ))}
                              </div>
                          </div>
                      )}
                      
                      <h3 className="text-2xl text-slate-200 mb-4 font-serif">מועדפים אישיים</h3>
                      {filteredPersonalLibrary.length > 0 ? (
                           <div className={cn("grid gap-4", layoutMode === "grid" ? "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}>
                               {filteredPersonalLibrary.map(layoutMode === "grid" ? renderCard : renderListItem)}
                           </div>
                      ) : (
                          <div className="text-slate-500 text-center py-10">אין פרומפטים מועדפים</div>
                      )}
                  </div>
              ) : (
                  // By Category View
                  <>
                    {orderedCategories.map((category) => {
                         const items = grouped[category] ?? [];
                         if (items.length === 0) return null;
                         
                         return (
                          <div
                            key={category}
                            id={`personal-category-${category}`}
                            className="space-y-4 scroll-mt-24 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.06] via-white/[0.03] to-transparent px-5 md:px-7 py-7"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handlePersonalDropToEnd(event, category)}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
                               <div className="flex items-center gap-4 flex-1">
                                 {/* Category Selection / Rename */}
                                 <div className="flex items-center gap-3">
                                     <button 
                                        onClick={() => selectAllCategory(category)}
                                        className="text-slate-500 hover:text-white"
                                        title="בחר הכל בקטגוריה"
                                     >
                                         <CheckCircle2 className="w-5 h-5"/>
                                     </button>
                                     
                                     {renamingCategory === category ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                              dir="rtl" value={renameCategoryInput} onChange={(e) => setRenameCategoryInput(e.target.value)}
                                              className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xl text-white outline-none"
                                              onKeyDown={(e) => { if(e.key === 'Enter') saveRenameCategory(); if(e.key === 'Escape') cancelRenameCategory(); }}
                                              autoFocus
                                            />
                                            <button onClick={saveRenameCategory}><Check className="w-4 h-4 text-green-400"/></button>
                                            <button onClick={cancelRenameCategory}><X className="w-4 h-4 text-red-400"/></button>
                                        </div>
                                     ) : (
                                         <div className="flex items-baseline gap-3 group/cat">
                                            <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">{category}</h3>
                                            {category !== PERSONAL_DEFAULT_CATEGORY && (
                                                <button onClick={() => startRenameCategory(category)} className="opacity-0 group-hover/cat:opacity-100 text-slate-500 hover:text-white"><Pencil className="w-3 h-3"/></button>
                                            )}
                                            <span className="text-sm text-slate-400">{items.length}</span>
                                         </div>
                                     )}
                                 </div>
                               </div>
                            </div>
                            
                            <div className={cn("grid gap-6", layoutMode === "grid" ? "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}>
                                {items.map(layoutMode === "grid" ? renderCard : renderListItem)}
                            </div>
                          </div>
                         );
                    })}
                  </>
              )}
          </div>
        </div>

        {/* Floating Batch Actions Toolbar */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                <div className="pl-4 pr-3 text-sm font-medium text-white border-r border-white/10">
                    {selectedIds.size} נבחרו
                </div>
                <button onClick={handleBatchExport} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 tooltip" title="יצוא">
                    <Download className="w-5 h-5" />
                </button>
                <button onClick={() => setShowMoveDialog(true)} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 tooltip" title="העברה">
                    <FolderInput className="w-5 h-5" />
                </button>
                <button onClick={() => setShowTagDialog(true)} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 tooltip" title="תגיות">
                    <Tag className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={handleBatchDelete} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 tooltip" title="מחיקה">
                    <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={clearSelection} className="ml-2 p-1 hover:bg-white/10 rounded-full text-slate-500">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Move Dialog Overlay */}
        {showMoveDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl text-white font-serif mb-4 text-center">העברת {selectedIds.size} פריטים</h3>
                    <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                        <button
                            onClick={() => { setIsCreatingNewMoveCategory(true); setTargetMoveCategory(""); }}
                            className={cn(
                                "w-full text-right px-4 py-3 rounded-xl border transition-all text-sm flex items-center justify-between",
                                isCreatingNewMoveCategory ? "bg-blue-600/20 border-blue-500 text-blue-200" : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
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
                                    className="w-full bg-black/40 border border-blue-500/50 rounded-lg p-3 text-white focus:outline-none"
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
                            onClick={handleBatchMove} 
                            disabled={(!targetMoveCategory && !newMoveCategoryInput.trim())} 
                            className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium disabled:opacity-50"
                        >
                            אישור
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

        {/* Tag Dialog Overlay */}
        {showTagDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl text-white font-serif mb-4 text-center">הוספת תגיות</h3>
                    <p className="text-slate-400 text-sm mb-4 text-center">הזן תגיות מופרדות בפסיקים</p>
                    <input 
                        value={tagsInput} 
                        onChange={e => setTagsInput(e.target.value)}
                        placeholder="למשל: שיווק, דואל, חשוב"
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white mb-6 focus:border-white/30 outline-none"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleBatchTag} className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium">שמור תגיות</button>
                        <button onClick={() => setShowTagDialog(false)} className="flex-1 bg-white/5 text-slate-300 py-2.5 rounded-lg">ביטול</button>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
}
