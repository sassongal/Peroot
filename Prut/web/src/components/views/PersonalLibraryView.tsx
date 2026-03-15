"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import {
    BookOpen, Star, ArrowRight, Plus, Copy, Pencil, Check, X,
    Search, Trash2, GripVertical, LayoutGrid, LayoutList,
    CheckSquare, Square, Tag, Download, FolderInput, CheckCircle2, Sparkles,
    Bold, Italic, Type, Eraser, Maximize2, Minimize2, Hash, AtSign, Wand2,
    Upload, Pin, ThumbsUp, ThumbsDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { GlowingEdgeCard } from "@/components/ui/GlowingEdgeCard";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS, toStyledHtml, stripStyleTokens } from "@/lib/text-utils";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { logger } from "@/lib/logger";
import { useChains } from "@/hooks/useChains";
import { ChainsSection } from "@/components/features/chains/ChainsSection";
import { usePresets } from "@/hooks/usePresets";
import { VariableFiller } from "@/components/features/variables/VariableFiller";

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
    duplicatePrompt,
    togglePin,
    ratePrompt,

    // Batch & Edit
    deletePrompts,
    movePrompts,
    updateTags,
    addPrompts,
    personalLibrary,

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
    personalCapabilityCounts,

    // Loading state
    isPersonalLoaded
  } = useLibraryContext();

  const { chains, addChain, updateChain, deleteChain, incrementChainUseCount } = useChains();
  const { presets, addPreset, deletePreset } = usePresets();

  const extractVariablesFromPrompt = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  };

  const styleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // -- Local State --
  const [styleEditorExpanded, setStyleEditorExpanded] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import file input ref
  const importFileRef = useRef<HTMLInputElement | null>(null);

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
        logger.error(e);
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

  const insertTextAtCursor = (text: string) => {
    const textarea = styleTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const before = styleDraft.slice(0, start);
    const after = styleDraft.slice(start);
    const nextText = before + text + after;
    setStyleDraft(nextText);
    requestAnimationFrame(() => {
      if (textarea) {
        const newPos = start + text.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      }
    });
  };

  const wrapSelectionWith = (before: string, after: string) => {
    const textarea = styleTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;
    const selected = styleDraft.slice(start, end);
    const nextText = styleDraft.slice(0, start) + before + selected + after + styleDraft.slice(end);
    setStyleDraft(nextText);
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + before.length + selected.length + after.length;
        textarea.focus();
      }
    });
  };

  // Quick-insert templates for common prompt patterns
  const quickInserts = [
    { label: "שם", icon: AtSign, text: "{{name}}" },
    { label: "חברה", icon: Hash, text: "{{company}}" },
    { label: "תעשייה", icon: Hash, text: "{{industry}}" },
    { label: "מוצר", icon: Hash, text: "{{product}}" },
    { label: "קהל יעד", icon: Hash, text: "{{target_audience}}" },
    { label: "טון", icon: Wand2, text: "{{tone}}" },
  ];

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

  // Clear selection when switching views
  useEffect(() => { clearSelection(); }, [personalView]);

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
      if (tags.length === 0) {
          toast.error("יש להזין לפחות תגית אחת");
          return;
      }
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

  // -- Import Handler (1.7) --
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-imported
    e.target.value = "";

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        toast.error("קובץ לא תקין - נדרש מערך JSON");
        return;
      }
      // Validate structure
      const valid = parsed.filter(
        (item: Record<string, unknown>) =>
          typeof item.title === "string" && typeof item.prompt === "string"
      );
      if (valid.length === 0) {
        toast.error("לא נמצאו פרומפטים תקינים בקובץ");
        return;
      }

      // Skip duplicates based on prompt text
      const existingTexts = new Set(personalLibrary.map(p => p.prompt.trim()));
      const toImport = valid.filter((item: Record<string, unknown>) => !existingTexts.has((item.prompt as string).trim()));
      const skipped = valid.length - toImport.length;

      if (toImport.length === 0) {
        toast.info(`כל ${valid.length} הפרומפטים כבר קיימים בספרייה`);
        return;
      }

      const confirmMsg = skipped > 0
        ? `ייבוא ${toImport.length} פרומפטים (${skipped} כפולים דולגו). להמשיך?`
        : `ייבוא ${toImport.length} פרומפטים. להמשיך?`;

      if (!confirm(confirmMsg)) return;

      const promptsToAdd = toImport.map((item: Record<string, unknown>) => ({
        title: item.title as string,
        prompt: item.prompt as string,
        category: (item.category as string) || "",
        personal_category: (item.personal_category as string) || "כללי",
        use_case: (item.use_case as string) || "",
        source: "imported" as const,
        tags: Array.isArray(item.tags) ? item.tags : [],
        capability_mode: item.capability_mode as PersonalPrompt["capability_mode"],
        prompt_style: item.prompt_style as string | undefined,
      }));

      await addPrompts(promptsToAdd);
      toast.success(`יובאו ${toImport.length} פרומפטים בהצלחה`);
    } catch {
      toast.error("שגיאה בקריאת הקובץ - ודא שזהו קובץ JSON תקין");
    }
  };

  // -- Grouping Logic --
  // We use filteredPersonalLibrary from context, which respects active capability filter?
  // Yes, filteredPersonalLibrary is already filtered by capability and search query.

  const displayItems = filteredPersonalLibrary;

  // Re-derive categories present in display items
  // Include categories from actual items so saved prompts with non-custom categories still appear
  const itemCategories = displayItems.map(p => p.personal_category).filter(Boolean) as string[];
  const categorySet = new Set([PERSONAL_DEFAULT_CATEGORY, ...personalCategories, ...itemCategories]);

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
                      <Tag className="w-3 h-3 me-1 opacity-50" />
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
          contentClassName="p-4 md:p-7 lg:p-8 hover:bg-white/5 transition-colors flex flex-col gap-3 md:gap-5 min-h-0"
        >
          {/* Selection Checkbox Overlay */}
          <div className={cn(
               "absolute top-3 left-3 md:top-6 md:left-6 z-10 transition-opacity duration-200",
               (isSelected || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
           )}>
               <button
                 onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }}
                 role="button"
                 tabIndex={0}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelection(prompt.id); } }}
               >
                   {isSelected
                     ? <CheckSquare className="w-6 h-6 text-blue-400 fill-blue-500/20" />
                     : <Square className="w-6 h-6 text-slate-500 hover:text-slate-300" />}
               </button>
           </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <GripVertical className={cn("w-4 h-4 mt-1 text-slate-500 hidden md:block", !isEditing ? "opacity-100" : "opacity-30")} />
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
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CapabilityBadge mode={prompt.capability_mode} />
                        {personalView === "favorites" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            ספרייה אישית
                          </span>
                        )}
                        {prompt.is_pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Pin className="w-3 h-3" />
                            מוצמד
                          </span>
                        )}
                    </div>
                    <h4 className="text-base md:text-2xl text-slate-100 font-semibold leading-tight" dir="rtl" title={prompt.title}>{prompt.title}</h4>
                    <p className="text-sm text-slate-400 mt-2" dir="rtl" title={prompt.use_case}>{prompt.use_case}</p>
                    {renderPromptTags(prompt.tags)}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 ps-2 md:ps-8"> {/* ps to avoid overlap with checkbox */}
              <button
                type="button"
                onClick={() => togglePin(prompt.id)}
                aria-label={prompt.is_pinned ? "בטל הצמדה" : "הצמד למעלה"}
                className={cn(
                  "p-2.5 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  prompt.is_pinned
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                    : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                )}
              >
                <Pin className={cn("w-4 h-4", prompt.is_pinned && "fill-amber-400")} />
              </button>
              <button
                type="button"
                onClick={() => handleToggleFavorite("personal", prompt.id)}
                aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                aria-pressed={isFavorite}
                className={cn(
                  "p-2.5 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  isFavorite
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                    : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
              </button>
              {isEditing ? (
                <>
                  <button onClick={saveEditingPersonalPrompt} className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" aria-label="שמור">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={cancelEditingPersonalPrompt} className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" aria-label="ביטול">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEditingPersonalPrompt(prompt)}
                  className="p-2 rounded-full border border-white/10 text-slate-500 hover:text-slate-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                  aria-label="עריכה"
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

          {/* Variable Filler */}
          {!isStyling && extractVariablesFromPrompt(prompt.prompt).length > 0 && (
            <VariableFiller
              promptText={prompt.prompt}
              onApply={(filledText) => onUsePrompt({ ...prompt, prompt: filledText })}
              presets={presets}
              onSavePreset={addPreset}
              onDeletePreset={deletePreset}
            />
          )}

          {isStyling && (
             <>
             {/* Backdrop - rendered outside editor for proper click handling */}
             {styleEditorExpanded && (
               <div className="fixed inset-0 bg-black/70 z-40" onClick={() => setStyleEditorExpanded(false)} />
             )}
             <div
               className={cn(
                 "mt-4 rounded-xl border border-amber-500/20 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-sm relative z-20 transition-all duration-300",
                 styleEditorExpanded ? "fixed inset-4 z-50 overflow-auto p-6" : "p-4"
               )}
               onKeyDown={(e) => { if (e.key === 'Escape' && styleEditorExpanded) setStyleEditorExpanded(false); }}
             >

               {/* Header */}
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                   <Wand2 className="w-4 h-4 text-amber-400" />
                   <span className="text-sm font-semibold text-white">עורך עיצוב</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <button
                     onClick={() => setStyleEditorExpanded(!styleEditorExpanded)}
                     className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                     title={styleEditorExpanded ? "מזער" : "הגדל"}
                   >
                     {styleEditorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                   </button>
                   <button
                     onClick={() => { closeStyleEditor(); setStyleEditorExpanded(false); }}
                     className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                   >
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </div>
               </div>

               {/* Toolbar */}
               <div className="space-y-3 mb-4">
                 {/* Text formatting */}
                 <div className="flex items-center gap-1.5 flex-wrap">
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider me-2 shrink-0">צבע טקסט</span>
                   {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                     <button
                       key={`text-${color}`}
                       onClick={() => applyStyleToken("c", color)}
                       className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 hover:scale-110 transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                       title={color}
                     >
                       <span className={cn("font-bold text-sm", STYLE_TEXT_COLORS[color])}>A</span>
                     </button>
                   ))}
                 </div>

                 {/* Highlights */}
                 <div className="flex items-center gap-1.5 flex-wrap">
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider me-2 shrink-0">היילייט</span>
                   {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                     <button
                       key={`hl-${color}`}
                       onClick={() => applyStyleToken("hl", color)}
                       className={cn(
                         "h-8 px-2.5 rounded-lg border border-white/10 hover:border-white/30 hover:scale-105 transition-all text-xs font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                         STYLE_HIGHLIGHT_COLORS[color]
                       )}
                     >
                       HL
                     </button>
                   ))}
                   <div className="w-px h-6 bg-white/10 mx-1" />
                   <button
                     onClick={clearStyleTokens}
                     className="h-8 px-2.5 rounded-lg border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                     title="נקה עיצוב"
                   >
                     <Eraser className="w-3.5 h-3.5" />
                     <span className="text-xs">נקה</span>
                   </button>
                 </div>

                 {/* Quick insert variables */}
                 <div className="flex items-center gap-1.5 flex-wrap">
                   <span className="text-[10px] text-slate-500 uppercase tracking-wider me-2 shrink-0">משתנים</span>
                   {quickInserts.map((qi) => {
                     const Icon = qi.icon;
                     return (
                       <button
                         key={qi.text}
                         onClick={() => insertTextAtCursor(qi.text)}
                         className="h-8 px-2.5 rounded-lg border border-dashed border-amber-500/30 text-amber-400/70 hover:text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center gap-1 text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                       >
                         <Icon className="w-3 h-3" />
                         {qi.label}
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* Tip */}
               <div className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
                 <Type className="w-3 h-3" />
                 <span>סמנ/י טקסט ולחצ/י על צבע או היילייט כדי לעצב</span>
               </div>

               {/* Textarea */}
               <textarea
                 ref={styleTextareaRef}
                 dir="rtl"
                 value={styleDraft}
                 onChange={(e) => setStyleDraft(e.target.value)}
                 className={cn(
                   "w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/30 transition-colors",
                   styleEditorExpanded ? "h-[50vh] resize-y" : "h-36 resize-y"
                 )}
                 placeholder="הטקסט של הפרומפט..."
               />

               {/* Footer actions */}
               <div className="mt-4 flex items-center justify-between">
                 <div className="text-[10px] text-slate-600">
                   {styleDraft.length} תווים
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => { closeStyleEditor(); setStyleEditorExpanded(false); }}
                     className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                   >
                     סגור
                   </button>
                   <button
                     onClick={() => { saveStylePrompt(prompt.id); setStyleEditorExpanded(false); }}
                     className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                   >
                     שמור עיצוב
                   </button>
                 </div>
               </div>
             </div>
          </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {prompt.use_count > 0 ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-emerald-400 font-medium">שומש {prompt.use_count} פעמים</span>
                </div>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">חדש</span>
              )}
              {/* Performance Score */}
              {((prompt.success_count ?? 0) + (prompt.fail_count ?? 0)) > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                  <span className="text-emerald-400">{prompt.success_count ?? 0}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-red-400">{prompt.fail_count ?? 0}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Quick Rating Buttons */}
              <button
                onClick={() => ratePrompt(prompt.id, true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="הצלחה"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => ratePrompt(prompt.id, false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="כישלון"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-500 px-2 py-0.5 rounded-full bg-white/5 ms-2">{prompt.personal_category}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 pt-1">
            <button
              onClick={() => onUsePrompt(prompt)}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <Plus className="w-3 h-3" />
              השתמש<span className="hidden md:inline"> בפרומפט</span>
            </button>
            <button
              onClick={() => onCopyText(prompt.prompt)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <Copy className="w-3 h-3" />
              העתק
            </button>
            <button
              onClick={() => openStyleEditor(prompt)}
              className="flex items-center gap-1.5 p-2 md:px-4 md:py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              title="עיצוב"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden md:inline">עיצוב</span>
            </button>
            <button
              onClick={async () => {
                await duplicatePrompt(prompt);
                toast.success("פרומפט שוכפל!");
              }}
              className="flex items-center gap-1.5 p-2 md:px-4 md:py-2 rounded-lg border border-dashed border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              title="שכפל"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">שכפל</span>
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
              "group flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-3 md:p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors",
              isSelected && "bg-blue-500/10 border-blue-500/20"
          )}>
              {/* Top Row: Checkbox + Content */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelection(prompt.id)}
                    className="shrink-0 text-slate-500 hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded"
                  >
                     {isSelected
                        ? <CheckSquare className="w-5 h-5 text-blue-400" />
                        : <Square className="w-5 h-5 opacity-50 group-hover:opacity-100" />}
                  </button>

                  {/* Capability Icon */}
                  <div className="shrink-0 hidden md:block">
                      <CapabilityBadge mode={prompt.capability_mode} className="scale-75 origin-left" />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 text-end">
                      <div className="flex items-center gap-2 mb-0.5 justify-end">
                          {prompt.is_pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          <h4 className="text-sm md:text-base text-slate-200 font-medium truncate" title={prompt.title}>{prompt.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 truncate" dir="rtl" title={prompt.use_case}>{prompt.use_case}</p>
                  </div>
              </div>

              {/* Bottom Row: Stats + Actions */}
              <div className="flex items-center justify-between md:justify-end gap-2 ps-8 md:ps-0">
                  {/* Stats - visible on mobile too */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 md:w-28 shrink-0">
                      <span className="text-slate-400 truncate">{prompt.personal_category}</span>
                      <span className="hidden md:inline">·</span>
                      <span className="hidden md:inline">x{prompt.use_count}</span>
                      {((prompt.success_count ?? 0) + (prompt.fail_count ?? 0)) > 0 && (
                        <span className="hidden md:inline">
                          <span className="text-emerald-400">{prompt.success_count ?? 0}</span>/<span className="text-red-400">{prompt.fail_count ?? 0}</span>
                        </span>
                      )}
                  </div>

                  {/* Actions - compact on mobile */}
                  <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onUsePrompt(prompt)} title="השתמש" className="p-2 hover:bg-white/10 rounded-full text-white focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"><Plus className="w-4 h-4"/></button>
                      <button onClick={() => onCopyText(prompt.prompt)} title="העתק" className="p-2 hover:bg-white/10 rounded-full text-slate-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"><Copy className="w-4 h-4"/></button>
                      <button onClick={() => startEditingPersonalPrompt(prompt)} title="ערוך" className="hidden md:block p-2 hover:bg-white/10 rounded-full text-slate-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"><Pencil className="w-4 h-4"/></button>
                      <button onClick={() => handleToggleFavorite("personal", prompt.id)} className="p-2 hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                          <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
                      </button>
                  </div>
              </div>
          </div>
      )
  };

  return (
      <div className="flex flex-col gap-7 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-24">


        <div className="glass-card p-4 md:p-7 lg:p-9 rounded-2xl border-white/10 bg-black/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl md:text-4xl lg:text-5xl font-serif text-white">ספריה אישית</h2>
                <p className="text-sm md:text-base text-slate-400 mt-2">
                  {totalCount} פרומפטים {personalView === "favorites" ? "מועדפים" : "אישיים"} · ארגון לפי קטגוריות
                </p>
              </div>

              {/* New Prompt Button */}
              <button
                onClick={() => setViewMode("home")}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-200 hover:bg-yellow-300 transition-all shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
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

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 mx-2">
                  <button
                    onClick={() => setLayoutMode("grid")}
                    className={cn("p-2.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", layoutMode === "grid" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
                    title="תצוגת כרטיסים"
                  >
                      <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => setLayoutMode("list")}
                    className={cn("p-2.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", layoutMode === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
                    title="תצוגת רשימה"
                  >
                      <LayoutList className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
              </div>

              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 ms-2">
                  <button
                    onClick={() => setSelectionMode(!selectionMode)}
                    className={cn("px-3 py-2 rounded-md transition-all text-xs font-bold flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", selectionMode ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-500 hover:text-slate-300")}
                    title="מצב בחירה מרובה"
                  >
                      <CheckSquare className="w-4 h-4" />
                      <span className="hidden md:inline">ניהול פריטים</span>
                  </button>
                  {selectionMode && (
                      <button
                         onClick={selectAllVisible}
                         className="px-3 py-2 rounded-md text-xs font-bold text-slate-300 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                      >
                          בחר הכל ({totalCount})
                      </button>
                  )}
              </div>

              <button
                onClick={() => { setPersonalView("all"); setViewMode("library"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden md:inline">ספריה מלאה</span>
              </button>
              <button
                onClick={() => setPersonalView(personalView === "favorites" ? "all" : "favorites")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  personalView === "favorites"
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-200"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className="w-4 h-4" />
                <span className="hidden md:inline">מועדפים</span> ({favoritePersonalIds.size})
              </button>
              <button
                onClick={() => setViewMode("home")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors font-bold focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                dir="rtl"
                value={personalQuery}
                onChange={(e) => setPersonalQuery(e.target.value)}
                placeholder={personalView === "favorites" ? "חיפוש במועדפים..." : "חיפוש בפרומפטים..."}
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3.5 md:py-3 pe-10 ps-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">מיון</label>
              <select
                value={personalSort}
                onChange={(e) => setPersonalSort(e.target.value as "recent" | "title" | "usage" | "custom" | "last_used" | "performance")}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-white/30"
              >
                <option value="recent">עודכן לאחרונה</option>
                <option value="title">אלפביתי</option>
                <option value="usage">בשימוש גבוה</option>
                <option value="custom">סדר ידני</option>
                <option value="last_used">שימוש אחרון</option>
                <option value="performance">ביצועים</option>
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
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  צור קטגוריה
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportHistory}
                  disabled={historyLength === 0}
                  className={cn("px-4 py-2 rounded-lg text-sm border border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", historyLength === 0 ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-white/10")}
                >
                  ייבא מהיסטוריה
                </button>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/10 text-slate-300 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Upload className="w-4 h-4" />
                  ייבוא
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Chains Section */}
          {personalView === "all" && (
            <div className="mt-8">
              <ChainsSection
                chains={chains}
                personalPrompts={personalLibrary}
                onAddChain={addChain}
                onUpdateChain={updateChain}
                onDeleteChain={deleteChain}
                onIncrementUseCount={incrementChainUseCount}
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
                                      <GlowingEdgeCard key={p.id} className="rounded-2xl" contentClassName="p-4 md:p-6 flex flex-col gap-4">
                                          <div className="flex justify-between">
                                              <div>
                                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block mb-2">
                                                    ספרייה ציבורית
                                                  </span>
                                                  <h4 className="text-white font-semibold">{p.title}</h4>
                                              </div>
                                              <button
                                                onClick={() => handleToggleFavorite("library", p.id)}
                                                className="focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded"
                                              >
                                                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300"/>
                                              </button>
                                          </div>
                                          <p className="text-slate-400 text-sm">{p.use_case}</p>
                                          <div className="flex gap-2 mt-auto">
                                              <button onClick={() => onUsePrompt(p)} className="flex-1 bg-white text-black py-2 rounded text-xs font-bold focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">השתמש</button>
                                              <button onClick={() => addPersonalPromptFromLibrary(p)} className="flex-1 border border-white/10 text-slate-300 py-2 rounded text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">שמור עותק</button>
                                          </div>
                                      </GlowingEdgeCard>
                                  ))}
                              </div>
                          </div>
                      )}

                      <h3 className="text-2xl text-slate-200 mb-4 font-serif">מועדפים אישיים</h3>
                      {/* 5.1 Skeleton - glass-card style with content placeholders */}
                      {!isPersonalLoaded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="glass-card p-4 rounded-2xl animate-pulse">
                              <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                              <div className="h-3 bg-white/10 rounded w-1/2 mb-4" />
                              <div className="h-3 bg-white/10 rounded w-full mb-2" />
                              <div className="h-3 bg-white/10 rounded w-5/6" />
                            </div>
                          ))}
                        </div>
                      )}
                      {isPersonalLoaded && filteredPersonalLibrary.length > 0 ? (
                           <div className={cn("grid gap-4", layoutMode === "grid" ? "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}>
                               {filteredPersonalLibrary.map(layoutMode === "grid" ? renderCard : renderListItem)}
                           </div>
                      ) : isPersonalLoaded ? (
                          /* 5.3 Empty state - favorites */
                          <div className="flex flex-col items-center gap-4 text-center py-16 glass-card rounded-2xl px-8 animate-in fade-in duration-500" dir="rtl">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                              <Star className="w-8 h-8 text-amber-500/50" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-semibold text-slate-300">עוד לא סימנת מועדפים</p>
                              <p className="text-sm text-slate-500">לחץ על הכוכב כדי לשמור</p>
                            </div>
                          </div>
                      ) : null}
                  </div>
              ) : (
                  // By Category View
                  <>
                    {/* 5.1 Skeleton - shown while personal library is loading */}
                    {!isPersonalLoaded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="glass-card p-4 rounded-2xl animate-pulse">
                            <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                            <div className="h-3 bg-white/10 rounded w-1/2 mb-4" />
                            <div className="h-3 bg-white/10 rounded w-full mb-2" />
                            <div className="h-3 bg-white/10 rounded w-5/6 mb-4" />
                            <div className="flex gap-2">
                              <div className="h-8 bg-white/10 rounded-lg flex-1" />
                              <div className="h-8 bg-white/10 rounded-lg w-20" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 5.3 Empty state - loaded but no items */}
                    {isPersonalLoaded && totalCount === 0 && (
                      <div className="flex flex-col items-center gap-4 text-center py-16 glass-card rounded-2xl px-8 animate-in fade-in duration-500" dir="rtl">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-amber-500/50" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-semibold text-slate-200">הספרייה האישית שלך ריקה</p>
                          <p className="text-sm text-slate-500 max-w-xs mx-auto">שדרג פרומפט ושמור אותו כאן כדי לבנות את האוסף שלך</p>
                        </div>
                        <button
                          onClick={() => setViewMode("home")}
                          className="mt-1 px-6 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                        >
                          שדרג פרומפט עכשיו
                        </button>
                      </div>
                    )}

                    {displayItems.length === 0 && personalQuery.trim() && (
                      <div className="text-center py-12">
                        <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">לא נמצאו תוצאות עבור &quot;{personalQuery}&quot;</p>
                        <button
                          onClick={() => setPersonalQuery("")}
                          className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          נקה חיפוש
                        </button>
                      </div>
                    )}

                    {displayItems.length === 0 && !personalQuery.trim() && selectedCapabilityFilter && (
                      <div className="text-center py-12">
                        <p className="text-slate-400 text-sm">אין פרומפטים במצב זה</p>
                        <button
                          onClick={() => setSelectedCapabilityFilter(null)}
                          className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          הצג הכל
                        </button>
                      </div>
                    )}

                    {orderedCategories.map((category) => {
                         const items = grouped[category] ?? [];
                         if (items.length === 0) return null;

                         return (
                          <div
                            key={category}
                            id={`personal-category-${category}`}
                            className="space-y-4 scroll-mt-24 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.06] via-white/[0.03] to-transparent px-3 py-4 md:px-5 md:py-7 lg:px-7"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handlePersonalDropToEnd(event, category)}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
                               <div className="flex items-center gap-4 flex-1">
                                 {/* Category Selection / Rename */}
                                 <div className="flex items-center gap-3">
                                     <button
                                        onClick={() => selectAllCategory(category)}
                                        className="text-slate-500 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded"
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
                                            <button onClick={saveRenameCategory} aria-label="שמור שם קטגוריה" className="focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded"><Check className="w-4 h-4 text-green-400"/></button>
                                            <button onClick={cancelRenameCategory} aria-label="ביטול שינוי שם" className="focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded"><X className="w-4 h-4 text-red-400"/></button>
                                        </div>
                                     ) : (
                                         <div className="flex items-baseline gap-3 group/cat">
                                            <h3 className="text-xl md:text-3xl lg:text-4xl font-serif font-semibold text-slate-100 tracking-wide">{category}</h3>
                                            {category !== PERSONAL_DEFAULT_CATEGORY && (
                                                <button onClick={() => startRenameCategory(category)} className="opacity-0 group-hover/cat:opacity-100 text-slate-500 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded"><Pencil className="w-3 h-3"/></button>
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
            <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 w-[calc(100%-2rem)] md:w-auto">
                <div className="ps-4 pe-3 text-sm font-medium text-white border-e border-white/10">
                    {selectedIds.size} נבחרו
                </div>
                <button onClick={handleBatchExport} className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title="יצוא" aria-label="ייצוא">
                    <Download className="w-5 h-5" />
                </button>
                <button onClick={() => setShowMoveDialog(true)} className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title="העברה" aria-label="העברה">
                    <FolderInput className="w-5 h-5" />
                </button>
                <button onClick={() => setShowTagDialog(true)} className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title="תגיות" aria-label="תגיות">
                    <Tag className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={handleBatchDelete} className="p-2.5 hover:bg-red-500/20 rounded-lg text-red-400 focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:outline-none" title="מחיקה" aria-label="מחיקה">
                    <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={clearSelection} className="ms-2 p-1 hover:bg-white/10 rounded-full text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" aria-label="סגור">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Move Dialog Overlay */}
        {showMoveDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
                    <h3 className="text-xl text-white font-serif mb-4 text-center">העברת {selectedIds.size} פריטים</h3>
                    <div className="space-y-2 mb-6 max-h-[80vh] overflow-y-auto">
                        <button
                            onClick={() => { setIsCreatingNewMoveCategory(true); setTargetMoveCategory(""); }}
                            className={cn(
                                "w-full text-start px-4 py-3 rounded-xl border transition-all text-sm flex items-center justify-between focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
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

                        {Array.from(new Set([...personalCategories, PERSONAL_DEFAULT_CATEGORY])).map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setTargetMoveCategory(cat); setIsCreatingNewMoveCategory(false); }}
                                className={cn(
                                    "w-full text-start px-4 py-3 rounded-xl border transition-all text-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
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
                            className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                        >
                            אישור
                        </button>
                        <button
                            onClick={() => { setShowMoveDialog(false); setIsCreatingNewMoveCategory(false); }}
                            className="flex-1 bg-white/5 text-slate-300 py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
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
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
                    <h3 className="text-xl text-white font-serif mb-4 text-center">הוספת תגיות</h3>
                    <p className="text-slate-400 text-sm mb-4 text-center">הזן תגיות מופרדות בפסיקים</p>
                    <input
                        value={tagsInput}
                        onChange={e => setTagsInput(e.target.value)}
                        placeholder="למשל: שיווק, דואל, חשוב"
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white mb-6 focus:border-white/30 outline-none"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleBatchTag} className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">שמור תגיות</button>
                        <button onClick={() => setShowTagDialog(false)} className="flex-1 bg-white/5 text-slate-300 py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">ביטול</button>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
}
