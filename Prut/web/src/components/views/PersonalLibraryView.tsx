"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import {
    BookOpen, Star, ArrowRight, Plus, Copy, Pencil, Check, X,
    Search, Trash2, LayoutList, CheckSquare, Square, Tag, Download,
    FolderInput, Sparkles, Upload, Pin, ThumbsUp, ThumbsDown, History,
    ChevronDown, ChevronRight, ChevronLeft, Folder, FolderOpen,
    MoreHorizontal, Link2, Menu
} from "lucide-react";
import {
    Bold, Italic, Type, Eraser, Maximize2, Minimize2, Hash, AtSign, Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { GlowingEdgeCard } from "@/components/ui/GlowingEdgeCard";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS, toStyledHtml, stripStyleTokens } from "@/lib/text-utils";
import { CapabilityFilter } from "@/components/ui/CapabilityFilter";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { logger } from "@/lib/logger";
import { useChains } from "@/hooks/useChains";
import { ChainsSection } from "@/components/features/chains/ChainsSection";
import { usePresets } from "@/hooks/usePresets";
import { VariableFiller } from "@/components/features/variables/VariableFiller";
import { VersionHistoryModal } from "@/components/features/library/VersionHistoryModal";
import { SearchAutosuggest } from "@/components/features/library/SearchAutosuggest";
import { ActiveFilterChips } from "@/components/features/library/ActiveFilterChips";

interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
}

const PAGE_SIZE = 15;

export function PersonalLibraryView({
    onUsePrompt,
    onCopyText,
    handleImportHistory,
    historyLength
}: PersonalLibraryViewProps) {
  const ctx = useLibraryContext();

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
    updatePrompt,
    duplicatePrompt,
    togglePin,
    ratePrompt,
    deletePrompts,
    movePrompts,
    updateTags,
    addPrompts,
    personalLibrary,
    editingPersonalId,
    editingTitle,
    setEditingTitle,
    editingUseCase,
    setEditingUseCase,
    startEditingPersonalPrompt,
    saveEditingPersonalPrompt,
    cancelEditingPersonalPrompt,
    editingStylePromptId,
    styleDraft,
    setStyleDraft,
    openStyleEditor,
    saveStylePrompt,
    closeStyleEditor,
    handlePersonalDragStart,
    handlePersonalDragOver,
    handlePersonalDragEnd,
    handlePersonalDrop,
    handlePersonalDropToEnd,
    draggingPersonalId,
    dragOverPersonalId,
    renamingCategory,
    renameCategoryInput,
    setRenameCategoryInput,
    startRenameCategory,
    saveRenameCategory,
    cancelRenameCategory,
    deletePersonalCategory,
    selectedCapabilityFilter,
    setSelectedCapabilityFilter,
    personalCapabilityCounts,
    isPersonalLoaded,
    // Pagination
    page: ctxPage,
    totalCount: ctxTotalCount,
    pageSize: ctxPageSize,
    folderCounts: ctxFolderCounts,
    isPageLoading: ctxIsPageLoading,
    setPage: ctxSetPage,
    setActiveFolder: ctxSetActiveFolder,
    setSearchQuery: ctxSetSearchQuery,
    sortBy: ctxSortBy,
    setSortBy: ctxSetSortBy,
    activeFolder: ctxActiveFolder,
  } = ctx;

  const { chains, addChain, updateChain, deleteChain, incrementChainUseCount, duplicateChain, exportChain, importChain } = useChains();
  const { presets, addPreset, deletePreset } = usePresets();

  // ─── Local State ───────────────────────────────────────────────────────────
  const [styleEditorExpanded, setStyleEditorExpanded] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [targetMoveCategory, setTargetMoveCategory] = useState("");
  const [isCreatingNewMoveCategory, setIsCreatingNewMoveCategory] = useState(false);
  const [newMoveCategoryInput, setNewMoveCategoryInput] = useState("");
  const [versionHistoryPrompt, setVersionHistoryPrompt] = useState<PersonalPrompt | null>(null);

  // Sidebar + mobile drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeLocalFolder, setActiveLocalFolder] = useState<string>("all");

  // Chains section collapse
  const [chainsExpanded, setChainsExpanded] = useState(false);

  // Expanded card ids
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Dropdown for per-card more menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMoveSubMenu, setShowMoveSubMenu] = useState(false);
  const [newMoveInlineName, setNewMoveInlineName] = useState("");
  const [showNewMoveInlineInput, setShowNewMoveInlineInput] = useState(false);

  // Context menu for folders
  const [folderContextMenu, setFolderContextMenu] = useState<{ folder: string; x: number; y: number } | null>(null);

  // New folder input
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Local pagination when context pagination not available
  const [localPage, setLocalPage] = useState(1);

  // Debounce search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(personalQuery || "");

  // Import file ref
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const styleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ─── Derived Data ─────────────────────────────────────────────────────────

  // Determine effective active folder (null from context = "all")
  const effectiveFolder = ctxActiveFolder !== undefined
    ? (ctxActiveFolder === null ? "all" : ctxActiveFolder)
    : activeLocalFolder;

  // Display items filtered by active folder (local filtering when context doesn't handle it)
  const allDisplayItems = filteredPersonalLibrary;

  const folderFilteredItems = (() => {
    if (effectiveFolder === "all") return allDisplayItems;
    if (effectiveFolder === "favorites") return allDisplayItems.filter(p => favoritePersonalIds.has(p.id));
    if (effectiveFolder === "pinned") return allDisplayItems.filter(p => p.is_pinned);
    return allDisplayItems.filter(p => (p.personal_category || PERSONAL_DEFAULT_CATEGORY) === effectiveFolder);
  })();

  // Pagination
  const usedPage = ctxPage ?? localPage;
  const usedPageSize = ctxPageSize;
  const usedTotalCount = ctxTotalCount ?? folderFilteredItems.length;
  const totalPages = Math.max(1, Math.ceil(usedTotalCount / usedPageSize));

  // Local paginated slice (when context doesn't paginate)
  const paginatedItems = ctxPage !== undefined
    ? folderFilteredItems // context already paginates
    : folderFilteredItems.slice((localPage - 1) * usedPageSize, localPage * usedPageSize);

  const displayItems = paginatedItems;

  // Folder counts derived locally as fallback
  const localFolderCounts: Record<string, number> = {
    all: allDisplayItems.length,
    favorites: allDisplayItems.filter(p => favoritePersonalIds.has(p.id)).length,
    pinned: allDisplayItems.filter(p => p.is_pinned).length,
  };
  const allPersonalCategories = Array.from(new Set([
    PERSONAL_DEFAULT_CATEGORY,
    ...personalCategories,
    ...allDisplayItems.map(p => p.personal_category).filter(Boolean) as string[]
  ]));
  allPersonalCategories.forEach(cat => {
    localFolderCounts[cat] = allDisplayItems.filter(p => (p.personal_category || PERSONAL_DEFAULT_CATEGORY) === cat).length;
  });

  const folderCounts = ctxFolderCounts ?? localFolderCounts;
  const isLoading = !isPersonalLoaded || ctxIsPageLoading;

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { setSelectedIds(new Set()); setSelectionMode(false); }, [effectiveFolder]);
  useEffect(() => { setLocalPage(1); }, [effectiveFolder, personalQuery, selectedCapabilityFilter]);
  useEffect(() => {
    const handleClick = () => { setOpenMenuId(null); setFolderContextMenu(null); setShowMoveSubMenu(false); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const extractVariablesFromPrompt = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  };

  const getStyledPromptMarkup = (prompt: PersonalPrompt) => {
    return prompt.prompt_style || prompt.prompt;
  };

  const setFolder = useCallback((folder: string) => {
    // Send virtual folders as-is to useLibrary (it handles favorites/pinned/all specially)
    if (ctxSetActiveFolder) ctxSetActiveFolder(folder === "all" ? null : folder);
    setActiveLocalFolder(folder);
    // Map to personalView for legacy context filtering
    if (folder === "favorites") setPersonalView("favorites");
    else setPersonalView("all");
    setSidebarOpen(false);
  }, [ctxSetActiveFolder, setPersonalView]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (ctxSetSearchQuery) ctxSetSearchQuery(val);
      else setPersonalQuery(val);
    }, 300);
  };

  const handleSortChange = (val: string) => {
    if (ctxSetSortBy) ctxSetSortBy(val);
    else setPersonalSort(val as "recent" | "title" | "usage" | "custom" | "last_used" | "performance");
  };

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    if (ctxSetPage) ctxSetPage(p);
    else setLocalPage(p);
  };

  // ─── Style Editor Helpers ─────────────────────────────────────────────────

  const applyStyleToken = (prefix: string, value: string) => {
    const textarea = styleTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    if (start === end) return;
    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);
    const token = `<${prefix}:${value}>${selected}</${prefix}>`;
    setStyleDraft(before + token + after);
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = start + token.length;
        textarea.selectionEnd = start + token.length;
        textarea.focus();
      }
    });
  };

  const clearStyleTokens = () => setStyleDraft(stripStyleTokens(styleDraft));

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

  const quickInserts = [
    { label: "שם", icon: AtSign, text: "{name}" },
    { label: "חברה", icon: Hash, text: "{company}" },
    { label: "תעשייה", icon: Hash, text: "{industry}" },
    { label: "מוצר", icon: Hash, text: "{product}" },
    { label: "קהל יעד", icon: Hash, text: "{target_audience}" },
    { label: "טון", icon: Wand2, text: "{tone}" },
  ];

  // ─── Batch Logic ──────────────────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedIds);
    const visibleIds = displayItems.map(p => p.id);
    const allVisibleSelected = visibleIds.every(id => next.has(id));
    if (allVisibleSelected) visibleIds.forEach(id => next.delete(id));
    else visibleIds.forEach(id => next.add(id));
    setSelectedIds(next);
  };

  const clearSelection = () => { setSelectedIds(new Set()); setSelectionMode(false); };

  const handleBatchDelete = async () => {
    if (!confirm(`האם למחוק ${selectedIds.size} פרומפטים מסומנים?`)) return;
    try {
      await deletePrompts(Array.from(selectedIds));
      toast.success("נמחקו בהצלחה");
      clearSelection();
    } catch { toast.error("שגיאה במחיקה"); }
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
    } catch { toast.error("שגיאה בהעברה"); }
  };

  const handleBatchTag = async () => {
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) { toast.error("יש להזין לפחות תגית אחת"); return; }
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const item = filteredPersonalLibrary.find(p => p.id === id);
        if (!item) return;
        const newTags = Array.from(new Set([...(item.tags || []), ...tags]));
        await updateTags(id, newTags);
      });
      await Promise.all(promises);
      toast.success("תגיות עודכנו");
      setShowTagDialog(false);
      setTagsInput("");
      clearSelection();
    } catch { toast.error("שגיאה בעדכון תגיות"); }
  };

  const handleBatchExport = () => {
    const items = filteredPersonalLibrary.filter(p => selectedIds.has(p.id));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `peroot_export_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("יצוא הושלם");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) { toast.error("קובץ לא תקין - נדרש מערך JSON"); return; }
      const valid = parsed.filter((item: Record<string, unknown>) =>
        typeof item.title === "string" && typeof item.prompt === "string"
      );
      if (valid.length === 0) { toast.error("לא נמצאו פרומפטים תקינים בקובץ"); return; }
      const existingTexts = new Set(personalLibrary.map(p => p.prompt.trim()));
      const toImport = valid.filter((item: Record<string, unknown>) => !existingTexts.has((item.prompt as string).trim()));
      const skipped = valid.length - toImport.length;
      if (toImport.length === 0) { toast.info(`כל ${valid.length} הפרומפטים כבר קיימים בספרייה`); return; }
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
    } catch { toast.error("שגיאה בקריאת הקובץ - ודא שזהו קובץ JSON תקין"); }
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

  const handleAddNewFolder = async () => {
    if (!newFolderName.trim()) return;
    setNewPersonalCategory(newFolderName.trim());
    await addPersonalCategory();
    setNewFolderName("");
    setShowNewFolderInput(false);
  };

  // ─── Folder right-click context menu ─────────────────────────────────────

  const handleFolderContextMenu = (e: React.MouseEvent, folder: string) => {
    if (folder === "all" || folder === "favorites" || folder === "pinned") return;
    e.preventDefault();
    setFolderContextMenu({ folder, x: e.clientX, y: e.clientY });
  };

  const handleFolderRename = (folder: string) => {
    startRenameCategory(folder);
    setFolderContextMenu(null);
  };

  // ─── Pagination helpers ───────────────────────────────────────────────────

  const getPaginationPages = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (usedPage > 3) pages.push("...");
      for (let i = Math.max(2, usedPage - 1); i <= Math.min(totalPages - 1, usedPage + 1); i++) pages.push(i);
      if (usedPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // ─── Renderers ────────────────────────────────────────────────────────────

  const renderCompactCard = (prompt: PersonalPrompt) => {
    const isExpanded = expandedIds.has(prompt.id);
    const isEditing = editingPersonalId === prompt.id;
    const isDragging = draggingPersonalId === prompt.id;
    const isDragOver = dragOverPersonalId === prompt.id && draggingPersonalId !== prompt.id;
    const isFavorite = favoritePersonalIds.has(prompt.id);
    const isStyling = editingStylePromptId === prompt.id;
    const styledMarkup = getStyledPromptMarkup(prompt);
    const isSelected = selectedIds.has(prompt.id);
    const isMenuOpen = openMenuId === prompt.id;
    const hasVariables = extractVariablesFromPrompt(prompt.prompt).length > 0;

    const toggleExpand = () => {
      if (selectionMode) { toggleSelection(prompt.id); return; }
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(prompt.id)) next.delete(prompt.id);
        else next.add(prompt.id);
        return next;
      });
    };

    return (
      <div
        key={prompt.id}
        draggable={!isEditing}
        onDragStart={(event) => handlePersonalDragStart(event, prompt)}
        onDragEnd={handlePersonalDragEnd}
        onDragOver={(event) => handlePersonalDragOver(event, prompt)}
        onDrop={(event) => handlePersonalDrop(event, prompt)}
        className={cn(
          "group rounded-xl border transition-all duration-200",
          "border-white/8 bg-white/[0.025] hover:bg-white/[0.04]",
          isDragging && "opacity-50 scale-[0.98]",
          isDragOver && "border-amber-500/40 bg-amber-500/5",
          isSelected && "border-blue-500/40 bg-blue-500/[0.06]",
          isExpanded && "border-white/15 bg-white/[0.04]"
        )}
      >
        {/* Collapsed Row */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 cursor-pointer select-none",
            isExpanded ? "py-3 border-b border-white/8" : "py-2.5"
          )}
          onClick={toggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(); } }}
          aria-expanded={isExpanded}
        >
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }}
            className={cn(
              "shrink-0 transition-opacity",
              (isSelected || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-60"
            )}
            aria-label="בחר"
          >
            {isSelected
              ? <CheckSquare className="w-4 h-4 text-blue-400" />
              : <Square className="w-4 h-4 text-[var(--text-muted)]" />}
          </button>

          {/* Pin indicator */}
          {prompt.is_pinned && (
            <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-400 shrink-0" />
          )}

          {/* Capability badge */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <CapabilityBadge mode={prompt.capability_mode} className="scale-90 origin-center" />
          </div>

          {/* Title */}
          <span className="flex-1 min-w-0 text-sm text-[var(--text-primary)] font-medium truncate" dir="rtl">
            {prompt.title}
          </span>

          {/* Meta: use count + category */}
          <span className="hidden md:flex items-center gap-2 text-xs text-[var(--text-muted)] shrink-0">
            {prompt.use_count > 0 && <span>שומש {prompt.use_count}x</span>}
            <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] text-[var(--text-muted)]">{prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}</span>
          </span>

          {/* Quick actions (collapsed) */}
          <div
            className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onCopyText(prompt.prompt); }}
              title="העתק"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onUsePrompt(prompt); }}
              title="השתמש"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : prompt.id); setShowMoveSubMenu(false); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                title="עוד"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 bg-[#111] border border-[var(--glass-border)] rounded-xl shadow-2xl py-1 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showMoveSubMenu ? (
                    <>
                      {/* Sub-menu header / back button */}
                      <button
                        onClick={() => { setShowMoveSubMenu(false); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> העבר לתיקייה
                      </button>
                      <div className="h-px bg-[var(--glass-bg)] my-1" />
                      {/* Folder list */}
                      {allPersonalCategories.map((cat) => {
                        const isCurrent = (prompt.personal_category || PERSONAL_DEFAULT_CATEGORY) === cat;
                        return (
                          <button
                            key={cat}
                            onClick={async () => {
                              if (isCurrent) return;
                              try {
                                await movePrompts([prompt.id], cat);
                                toast.success(`הועבר לתיקייה "${cat}"`);
                              } catch { toast.error("שגיאה בהעברה"); }
                              setOpenMenuId(null);
                              setShowMoveSubMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 dark:bg-white/10",
                              isCurrent ? "text-amber-600 dark:text-amber-400 cursor-default" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            )}
                          >
                            <Folder className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 text-right">{cat}</span>
                            {isCurrent && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        );
                      })}
                      <div className="h-px bg-[var(--glass-bg)] my-1" />
                      {/* New folder inline creation */}
                      {showNewMoveInlineInput ? (
                        <div className="px-3 py-2 flex flex-col gap-1.5">
                          <input
                            autoFocus
                            dir="rtl"
                            value={newMoveInlineName}
                            onChange={(e) => setNewMoveInlineName(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                const name = newMoveInlineName.trim();
                                if (!name) return;
                                if (allPersonalCategories.includes(name)) {
                                  toast.error("תיקייה בשם זה כבר קיימת");
                                  return;
                                }
                                try {
                                  await movePrompts([prompt.id], name);
                                  toast.success(`הועבר לתיקייה "${name}"`);
                                } catch { toast.error("שגיאה בהעברה"); }
                                setOpenMenuId(null);
                                setShowMoveSubMenu(false);
                                setShowNewMoveInlineInput(false);
                                setNewMoveInlineName("");
                              }
                              if (e.key === "Escape") {
                                setShowNewMoveInlineInput(false);
                                setNewMoveInlineName("");
                              }
                            }}
                            placeholder="שם תיקייה חדשה"
                            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-black/15 dark:border-white/30"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={async () => {
                                const name = newMoveInlineName.trim();
                                if (!name) return;
                                if (allPersonalCategories.includes(name)) {
                                  toast.error("תיקייה בשם זה כבר קיימת");
                                  return;
                                }
                                try {
                                  await movePrompts([prompt.id], name);
                                  toast.success(`הועבר לתיקייה "${name}"`);
                                } catch { toast.error("שגיאה בהעברה"); }
                                setOpenMenuId(null);
                                setShowMoveSubMenu(false);
                                setShowNewMoveInlineInput(false);
                                setNewMoveInlineName("");
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1 bg-black/5 dark:bg-white/10 rounded text-xs text-[var(--text-primary)] hover:bg-white/20"
                            >
                              <Check className="w-3 h-3" /> צור
                            </button>
                            <button
                              onClick={() => { setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1 border border-[var(--glass-border)] rounded text-xs text-[var(--text-muted)] hover:bg-black/5 dark:bg-white/10"
                            >
                              <X className="w-3 h-3" /> ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewMoveInlineInput(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                        >
                          <Plus className="w-3.5 h-3.5" /> תיקייה חדשה
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Group 1: Actions */}
                      <button onClick={() => { onUsePrompt(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <ArrowRight className="w-3.5 h-3.5" /> השתמש
                      </button>
                      <button onClick={() => { onCopyText(prompt.prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Copy className="w-3.5 h-3.5" /> העתק
                      </button>
                      <button onClick={() => { onCopyText(prompt.prompt); toast.success("קישור הועתק!"); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Link2 className="w-3.5 h-3.5" /> שתף
                      </button>
                      <div className="h-px bg-[var(--glass-bg)] my-1" />
                      {/* Group 2: Edit */}
                      <button onClick={() => { startEditingPersonalPrompt(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Pencil className="w-3.5 h-3.5" /> ערוך
                      </button>
                      <button onClick={() => { openStyleEditor(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Wand2 className="w-3.5 h-3.5" /> עיצוב
                      </button>
                      <button onClick={async () => { await duplicatePrompt(prompt); toast.success("פרומפט שוכפל!"); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Plus className="w-3.5 h-3.5" /> שכפל
                      </button>
                      <div className="h-px bg-[var(--glass-bg)] my-1" />
                      {/* Group 3: Organize */}
                      <button
                        onClick={() => { setShowMoveSubMenu(true); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                        <span className="flex-1 text-right">העבר לתיקייה</span>
                        <ChevronLeft className="w-3 h-3 text-[var(--text-muted)]" />
                      </button>
                      <button onClick={() => { togglePin(prompt.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Pin className="w-3.5 h-3.5" /> {prompt.is_pinned ? "בטל הצמדה" : "הצמד"}
                      </button>
                      <button onClick={() => { handleToggleFavorite("personal", prompt.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-yellow-300 text-yellow-300")} /> {isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                      </button>
                      <button onClick={() => { toggleSelection(prompt.id); setSelectionMode(true); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <Square className="w-3.5 h-3.5" /> בחר
                      </button>
                      <div className="h-px bg-[var(--glass-bg)] my-1" />
                      {/* Group 4: Info */}
                      <button onClick={() => { setVersionHistoryPrompt(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                        <History className="w-3.5 h-3.5" /> גרסאות
                      </button>
                      <button
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompt, null, 2));
                          const a = document.createElement("a");
                          a.setAttribute("href", dataStr);
                          a.setAttribute("download", `prompt_${prompt.id}.json`);
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          toast.success("יצוא הושלם");
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                      >
                        <Download className="w-3.5 h-3.5" /> ייצוא
                      </button>
                      <div className="h-px bg-[var(--glass-bg)] my-1" />
                      {/* Group 5: Danger */}
                      <button
                        onClick={async () => {
                          if (!confirm("האם למחוק פרומפט זה?")) return;
                          try {
                            await deletePrompts([prompt.id]);
                            toast.success("נמחק בהצלחה");
                          } catch { toast.error("שגיאה במחיקה"); }
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> מחק
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expand chevron */}
          <ChevronDown className={cn(
            "w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Edit Mode */}
            {isEditing ? (
              <div className="space-y-3">
                <input
                  dir="rtl"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-black/15 dark:border-white/30"
                  placeholder="כותרת לפרומפט"
                />
                <textarea
                  dir="rtl"
                  value={editingUseCase}
                  onChange={(e) => setEditingUseCase(e.target.value)}
                  className="w-full h-16 bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg py-2 px-3 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-black/15 dark:border-white/30 resize-none"
                  placeholder="תיאור קצר"
                />
                <div className="flex items-center gap-2">
                  <button onClick={saveEditingPersonalPrompt} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs rounded-lg font-medium hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <Check className="w-3.5 h-3.5" /> שמור
                  </button>
                  <button onClick={cancelEditingPersonalPrompt} className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glass-border)] text-[var(--text-muted)] text-xs rounded-lg hover:bg-[var(--glass-bg)] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <X className="w-3.5 h-3.5" /> ביטול
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Prompt text */}
                <SafeHtml
                  html={toStyledHtml(styledMarkup)}
                  className="text-sm text-[var(--text-secondary)] leading-relaxed rounded-lg bg-black/5 dark:bg-black/20 p-3 border border-[var(--glass-border)]"
                  dir="rtl"
                />

                {/* Tags */}
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {prompt.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-white/8 text-[var(--text-secondary)] border border-white/8">
                        <Tag className="w-2.5 h-2.5 me-1 opacity-50" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Use count + ratings */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    {prompt.use_count > 0
                      ? <span className="text-emerald-400/80">שומש {prompt.use_count} פעמים</span>
                      : <span className="text-blue-400/80">חדש</span>
                    }
                    {((prompt.success_count ?? 0) + (prompt.fail_count ?? 0)) > 0 && (
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-400" />{prompt.success_count ?? 0}
                        <ThumbsDown className="w-3 h-3 text-red-400 ms-1" />{prompt.fail_count ?? 0}
                      </span>
                    )}
                    <span className="hidden md:inline text-[var(--text-muted)]">{prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => ratePrompt(prompt.id, true)} className="p-1 rounded text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="הצלחה">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => ratePrompt(prompt.id, false)} className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="כישלון">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Variable Filler */}
                {!isStyling && hasVariables && (
                  <VariableFiller
                    promptText={prompt.prompt}
                    onApply={(filledText) => onUsePrompt({ ...prompt, prompt: filledText })}
                    presets={presets}
                    onSavePreset={addPreset}
                    onDeletePreset={deletePreset}
                  />
                )}

                {/* Style Editor */}
                {isStyling && (
                  <>
                    {styleEditorExpanded && (
                      <div className="fixed inset-0 bg-black/70 z-40" onClick={() => setStyleEditorExpanded(false)} />
                    )}
                    <div
                      className={cn(
                        "rounded-xl border border-amber-500/20 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-sm relative z-20 transition-all duration-300",
                        styleEditorExpanded ? "fixed inset-4 z-50 overflow-auto p-6" : "p-4"
                      )}
                      onKeyDown={(e) => { if (e.key === 'Escape' && styleEditorExpanded) setStyleEditorExpanded(false); }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-semibold text-[var(--text-primary)]">עורך עיצוב</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setStyleEditorExpanded(!styleEditorExpanded)} className="p-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title={styleEditorExpanded ? "מזער" : "הגדל"}>
                            {styleEditorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => { closeStyleEditor(); setStyleEditorExpanded(false); }} className="p-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider me-2 shrink-0">צבע טקסט</span>
                          {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                            <button key={`text-${color}`} onClick={() => applyStyleToken("c", color)} className="w-7 h-7 rounded-lg border border-[var(--glass-border)] hover:border-black/15 dark:border-white/30 hover:scale-110 transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title={color}>
                              <span className={cn("font-bold text-sm", STYLE_TEXT_COLORS[color])}>A</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider me-2 shrink-0">היילייט</span>
                          {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                            <button key={`hl-${color}`} onClick={() => applyStyleToken("hl", color)} className={cn("h-7 px-2 rounded-lg border border-[var(--glass-border)] hover:border-black/15 dark:border-white/30 hover:scale-105 transition-all text-xs font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", STYLE_HIGHLIGHT_COLORS[color])}>
                              HL
                            </button>
                          ))}
                          <div className="w-px h-5 bg-black/5 dark:bg-white/10 mx-1" />
                          <button onClick={clearStyleTokens} className="h-7 px-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                            <Eraser className="w-3 h-3" /><span className="text-xs">נקה</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider me-2 shrink-0">משתנים</span>
                          {quickInserts.map((qi) => {
                            const Icon = qi.icon;
                            return (
                              <button key={qi.text} onClick={() => insertTextAtCursor(qi.text)} className="h-7 px-2 rounded-lg border border-dashed border-amber-500/30 text-amber-600/70 dark:text-amber-400/70 hover:text-amber-700 dark:text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center gap-1 text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                                <Icon className="w-3 h-3" />{qi.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
                        <Type className="w-3 h-3" />
                        <span>סמנ/י טקסט ולחצ/י על צבע או היילייט כדי לעצב</span>
                      </div>
                      <textarea
                        ref={styleTextareaRef}
                        dir="rtl"
                        value={styleDraft}
                        onChange={(e) => setStyleDraft(e.target.value)}
                        className={cn("w-full bg-black/40 border border-[var(--glass-border)] rounded-xl p-4 text-sm text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-amber-500/30 transition-colors", styleEditorExpanded ? "h-[50vh] resize-y" : "h-32 resize-y")}
                        placeholder="הטקסט של הפרומפט..."
                      />
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">{styleDraft.length} תווים</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { closeStyleEditor(); setStyleEditorExpanded(false); }} className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                            סגור
                          </button>
                          <button onClick={() => { saveStylePrompt(prompt.id); setStyleEditorExpanded(false); }} className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                            שמור עיצוב
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Full action buttons row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--glass-border)]">
                  <button onClick={() => onUsePrompt(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <Plus className="w-3 h-3" /> השתמש
                  </button>
                  <button onClick={() => onCopyText(prompt.prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <Copy className="w-3 h-3" /> העתק
                  </button>
                  <button onClick={() => openStyleEditor(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <Wand2 className="w-3 h-3" /> עיצוב
                  </button>
                  <button onClick={async () => { await duplicatePrompt(prompt); toast.success("פרומפט שוכפל!"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <Plus className="w-3 h-3" /> שכפל
                  </button>
                  <button onClick={() => setVersionHistoryPrompt(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <History className="w-3 h-3" /> גרסאות
                  </button>
                  <button onClick={() => startEditingPersonalPrompt(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                    <Pencil className="w-3 h-3" /> ערוך
                  </button>
                  <button onClick={() => handleToggleFavorite("personal", prompt.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", isFavorite ? "border-yellow-300/30 text-yellow-300 bg-yellow-300/5" : "border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10")}>
                    <Star className={cn("w-3 h-3", isFavorite && "fill-yellow-300")} /> מועדף
                  </button>
                  <button onClick={() => { const next = new Set(expandedIds); next.delete(prompt.id); setExpandedIds(next); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/10 text-red-400 text-xs hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:outline-none ms-auto">
                    <Trash2 className="w-3 h-3" /> מחק
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Folder Sidebar ────────────────────────────────────────────────────────

  const renderSidebar = (isMobile = false) => {
    const virtualFolders = [
      { key: "all", label: "כל הפרומפטים", icon: BookOpen },
      { key: "favorites", label: "מועדפים", icon: Star },
      { key: "pinned", label: "מוצמדים", icon: Pin },
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
  };

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  const renderSkeleton = () => (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="h-12 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] animate-pulse flex items-center gap-3 px-4">
          <div className="w-4 h-4 rounded bg-white/8 shrink-0" />
          <div className="h-3 bg-white/8 rounded flex-1 max-w-xs" />
          <div className="h-2 bg-[var(--glass-bg)] rounded w-16 ms-auto" />
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
        <p className="text-xs text-[var(--text-muted)]">
          מציג {startItem}-{endItem} מתוך {usedTotalCount}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(usedPage - 1)}
            disabled={usedPage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
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
                      : "text-[var(--text-muted)] hover:bg-black/5 dark:bg-white/10 border border-transparent hover:border-[var(--glass-border)]"
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            הבא <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  const activeFolderLabel = (() => {
    if (effectiveFolder === "all") return "כל הפרומפטים";
    if (effectiveFolder === "favorites") return "מועדפים";
    if (effectiveFolder === "pinned") return "מוצמדים";
    return effectiveFolder;
  })();

  const currentSort = ctxSortBy ?? personalSort;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 md:pb-0" dir="rtl">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-72 z-50 bg-[#0A0A0F] border-l border-[var(--glass-border)] shadow-2xl transition-transform duration-300 md:hidden overflow-y-auto",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {renderSidebar(true)}
      </div>

      {/* Folder context menu */}
      {folderContextMenu && (
        <div
          className="fixed z-[80] bg-[#111] border border-[var(--glass-border)] rounded-xl shadow-2xl py-1 min-w-[160px] animate-in fade-in duration-150"
          style={{ top: folderContextMenu.y, left: folderContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleFolderRename(folderContextMenu.folder)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
            <Pencil className="w-3.5 h-3.5" /> שנה שם
          </button>
          <div className="h-px bg-[var(--glass-bg)] my-1" />
          <button
            onClick={async () => {
              const folder = folderContextMenu.folder;
              const count = folderCounts[folder] ?? 0;
              const msg = count > 0
                ? `למחוק את התיקייה "${folder}"? (${count} פרומפטים יועברו לתיקיית "כללי")`
                : `למחוק את התיקייה הריקה "${folder}"?`;
              if (!confirm(msg)) return;
              setFolderContextMenu(null);
              if (effectiveFolder === folder) setFolder("all");
              await deletePersonalCategory(folder, 'move');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" /> מחק תיקייה
          </button>
        </div>
      )}

      {/* ── Top Bar ── */}
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
            <button
              onClick={() => setViewMode("library")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] transition-colors text-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">ספרייה מלאה</span>
            </button>
            {/* New prompt button */}
            <button
              onClick={() => setViewMode("home")}
              className="group flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-yellow-200 hover:bg-yellow-300 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none shrink-0"
            >
              <div className="relative w-4 h-4 md:w-5 md:h-5">
                <Sparkles className="absolute inset-0 w-full h-full text-yellow-600" />
                <Plus className="absolute inset-0 w-full h-full text-black translate-x-0.5 translate-y-0.5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-black hidden lg:inline">פרומפט חדש</span>
            </button>
          </div>
        </div>

        {/* Search + Sort + Actions row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <SearchAutosuggest
            value={localSearch}
            onChange={handleSearchChange}
            prompts={filteredPersonalLibrary}
            placeholder="חיפוש..."
            className="flex-1 min-w-[180px]"
          />

          {/* Sort */}
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-black/15 dark:border-white/30"
          >
            <option value="recent">עודכן לאחרונה</option>
            <option value="title">אלפביתי</option>
            <option value="usage">בשימוש גבוה</option>
            <option value="custom">סדר ידני</option>
            <option value="last_used">שימוש אחרון</option>
            <option value="performance">ביצועים</option>
          </select>

          {/* Batch mode */}
          <button
            onClick={() => setSelectionMode(!selectionMode)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
              selectionMode
                ? "bg-blue-600 border-blue-500 text-[var(--text-primary)] shadow-lg shadow-blue-900/30"
                : "border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
            )}
            title="ניהול פריטים"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ניהול פריטים</span>
          </button>

          {/* Import */}
          <button
            onClick={() => importFileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] text-xs hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            title="ייבוא"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ייבוא</span>
          </button>
          <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />

          {/* Import from history */}
          <button
            onClick={handleImportHistory}
            disabled={historyLength === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
              historyLength === 0 ? "border-[var(--glass-border)] text-slate-600 cursor-not-allowed" : "border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden md:inline">מהיסטוריה</span>
          </button>

          {/* Select all (batch mode) */}
          {selectionMode && (
            <button
              onClick={selectAllVisible}
              className="px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              בחר הכל ({displayItems.length})
            </button>
          )}
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

      {/* ── Main layout: sidebar + content ── */}
      <div className="flex gap-4 items-start">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-[260px] shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-white/8 bg-black/5 dark:bg-black/30 backdrop-blur-sm">
          {renderSidebar(false)}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Chains section (collapsible) */}
          <div className="rounded-xl border border-white/8 bg-[var(--glass-bg)] overflow-hidden">
            <button
              onClick={() => setChainsExpanded(!chainsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--glass-bg)] transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">שרשראות</span>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-0.5 rounded-full">
                  {chains.length}
                </span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-[var(--text-muted)] transition-transform duration-200", chainsExpanded && "rotate-180")} />
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
            <div className="rounded-xl border border-white/8 bg-[var(--glass-bg)] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
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
                        <h4 className="text-sm text-[var(--text-primary)] font-medium truncate">{p.title}</h4>
                      </div>
                      <button onClick={() => handleToggleFavorite("library", p.id)} className="shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none rounded">
                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2" dir="rtl">{p.use_case}</p>
                    <div className="flex gap-2">
                      <button onClick={() => onUsePrompt(p)} className="flex-1 bg-white text-black py-1.5 rounded text-xs font-bold focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">השתמש</button>
                      <button onClick={() => addPersonalPromptFromLibrary(p)} className="flex-1 border border-[var(--glass-border)] text-[var(--text-secondary)] py-1.5 rounded text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">שמור עותק</button>
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
              <div className="text-center py-12 rounded-xl border border-white/8 bg-[var(--glass-bg)]" dir="rtl">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-[var(--text-muted)] text-sm">לא נמצאו תוצאות עבור &quot;{localSearch || personalQuery}&quot;</p>
                <button
                  onClick={() => { handleSearchChange(""); setPersonalQuery(""); }}
                  className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:text-amber-300 transition-colors"
                >
                  נקה חיפוש
                </button>
              </div>
            )}

            {!isLoading && displayItems.length === 0 && !localSearch.trim() && !personalQuery.trim() && selectedCapabilityFilter && (
              <div className="text-center py-10 rounded-xl border border-white/8 bg-[var(--glass-bg)]" dir="rtl">
                <p className="text-[var(--text-muted)] text-sm">אין פרומפטים במצב זה</p>
                <button onClick={() => setSelectedCapabilityFilter(null)} className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:text-amber-300 transition-colors">
                  הצג הכל
                </button>
              </div>
            )}

            {!isLoading && displayItems.length === 0 && !localSearch.trim() && !personalQuery.trim() && !selectedCapabilityFilter && (
              <div className="flex flex-col items-center gap-4 text-center py-16 rounded-xl border border-white/8 bg-[var(--glass-bg)] px-8 animate-in fade-in duration-500" dir="rtl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-amber-500/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-[var(--text-secondary)]">
                    {effectiveFolder === "favorites" ? "עוד לא סימנת מועדפים" :
                     effectiveFolder === "pinned" ? "אין פרומפטים מוצמדים" :
                     "הספרייה האישית שלך ריקה"}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
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
                {displayItems.map(renderCompactCard)}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && renderPagination()}

        </main>
      </div>

      {/* ── Floating Batch Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-2 rounded-2xl border border-[var(--glass-border)] bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 w-[calc(100%-2rem)] md:w-auto">
          <div className="ps-3 pe-2 text-sm font-medium text-[var(--text-primary)] border-e border-[var(--glass-border)]">
            {selectedIds.size} נבחרו
          </div>
          <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:outline-none">
            <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">מחק</span>
          </button>
          <button onClick={() => setShowMoveDialog(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
            <FolderInput className="w-4 h-4" /> <span className="hidden md:inline">העבר ל...</span>
          </button>
          <button onClick={() => setShowTagDialog(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
            <Tag className="w-4 h-4" /> <span className="hidden md:inline">תגיות</span>
          </button>
          <button onClick={handleBatchExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
            <Download className="w-4 h-4" /> <span className="hidden md:inline">ייצוא</span>
          </button>
          <div className="w-px h-5 bg-black/5 dark:bg-white/10 mx-1" />
          <button onClick={clearSelection} className="p-1.5 hover:bg-black/5 dark:bg-white/10 rounded-full text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" aria-label="סגור">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Move Dialog ── */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111] border border-[var(--glass-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" dir="rtl">
            <h3 className="text-xl text-[var(--text-primary)] font-serif mb-4 text-center">העברת {selectedIds.size} פריטים</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setIsCreatingNewMoveCategory(true); setTargetMoveCategory(""); }}
                className={cn("w-full text-start px-4 py-3 rounded-xl border transition-all text-sm flex items-center justify-between focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  isCreatingNewMoveCategory ? "bg-blue-600/20 border-blue-500 text-blue-200" : "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10"
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
                    className="w-full bg-black/40 border border-blue-500/50 rounded-lg p-3 text-[var(--text-primary)] focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
              <div className="h-px bg-[var(--glass-bg)] my-2" />
              {Array.from(new Set([...personalCategories, PERSONAL_DEFAULT_CATEGORY])).map(cat => (
                <button
                  key={cat}
                  onClick={() => { setTargetMoveCategory(cat); setIsCreatingNewMoveCategory(false); }}
                  className={cn("w-full text-start px-4 py-3 rounded-xl border transition-all text-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                    targetMoveCategory === cat && !isCreatingNewMoveCategory ? "bg-white text-black border-white" : "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleBatchMove} disabled={(!targetMoveCategory && !newMoveCategoryInput.trim())} className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">אישור</button>
              <button onClick={() => { setShowMoveDialog(false); setIsCreatingNewMoveCategory(false); }} className="flex-1 bg-[var(--glass-bg)] text-[var(--text-secondary)] py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tag Dialog ── */}
      {showTagDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111] border border-[var(--glass-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" dir="rtl">
            <h3 className="text-xl text-[var(--text-primary)] font-serif mb-4 text-center">הוספת תגיות</h3>
            <p className="text-[var(--text-muted)] text-sm mb-4 text-center">הזן תגיות מופרדות בפסיקים</p>
            <input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="למשל: שיווק, דואל, חשוב"
              className="w-full bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg p-3 text-[var(--text-primary)] mb-6 focus:border-black/15 dark:border-white/30 outline-none"
            />
            <div className="flex gap-2">
              <button onClick={handleBatchTag} className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">שמור תגיות</button>
              <button onClick={() => setShowTagDialog(false)} className="flex-1 bg-[var(--glass-bg)] text-[var(--text-secondary)] py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Version History Modal ── */}
      {versionHistoryPrompt && (
        <VersionHistoryModal
          promptId={versionHistoryPrompt.id}
          promptTitle={versionHistoryPrompt.title}
          onClose={() => setVersionHistoryPrompt(null)}
          onRestore={(content, title) => {
            const updates: Partial<PersonalPrompt> = { prompt: content };
            if (title) updates.title = title;
            updatePrompt(versionHistoryPrompt.id, updates);
          }}
        />
      )}
    </div>
  );
}
