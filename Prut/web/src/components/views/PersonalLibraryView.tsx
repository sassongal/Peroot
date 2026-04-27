"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { useAuth } from "@/context/AuthContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import { stripStyleTokens } from "@/lib/text-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Hash, AtSign, Wand2, LogIn, BookOpen, Star, Network, History } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import { PersonalLibraryHeader } from "./personal-library/PersonalLibraryHeader";
import { PersonalLibraryGrid } from "./personal-library/PersonalLibraryGrid";
import { PersonalLibraryModals } from "./personal-library/PersonalLibraryModals";
import { PersonalLibrarySidebar } from "./personal-library/PersonalLibrarySidebar";
import { PromptGraphView } from "@/components/features/library/PromptGraphView";
import { GuestGraphPreview } from "@/components/features/library/GuestGraphPreview";
import type { PersonalLibrarySharedState } from "./personal-library/types";
import { useHistory } from "@/hooks/useHistory";
import type { HistoryItem } from "@/hooks/useHistory";
import { CapabilityMode } from "@/lib/capability-mode";

interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
  openToGraph?: boolean;
  onGraphOpened?: () => void;
}

export function PersonalLibraryView({
  onUsePrompt,
  onCopyText,
  handleImportHistory,
  historyLength,
  openToGraph,
  onGraphOpened,
}: PersonalLibraryViewProps) {
  const ctx = useLibraryContext();
  const { history } = useHistory();

  const {
    filteredPersonalLibrary,
    setPersonalView,
    personalQuery,
    setPersonalQuery,
    personalSort,
    setPersonalSort,
    setNewPersonalCategory,
    addPersonalCategory,
    personalCategories,
    favoritePersonalIds,
    addPrompt,
    addPrompts,
    personalLibrary,
    selectedCapabilityFilter,
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
    styleDraft,
    setStyleDraft,
    startRenameCategory,
  } = ctx;

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

  // Graph vs grid view toggle.
  const [localViewType, setLocalViewType] = useState<"grid" | "graph">("grid");
  // All prompts for graph mode — fetched without pagination when graph activates
  const [graphPrompts, setGraphPrompts] = useState<PersonalPrompt[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphTotalCount, setGraphTotalCount] = useState<number | null>(null);
  const GRAPH_ROW_LIMIT = 2000;

  // Chains section collapse
  const [chainsExpanded, setChainsExpanded] = useState(false);

  // Auto-open chains when the top-nav "Chains" tab is clicked.
  useEffect(() => {
    const handler = () => {
      setChainsExpanded(true);
      requestAnimationFrame(() => {
        document
          .querySelector("[data-chains-section]")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    window.addEventListener("peroot:open-chains", handler);
    return () => window.removeEventListener("peroot:open-chains", handler);
  }, []);

  // Open graph view when parent signals via prop (race-condition-free).
  useEffect(() => {
    if (!openToGraph) return;
    setLocalViewType("graph");
    onGraphOpened?.();
  }, [openToGraph]); // eslint-disable-line react-hooks/exhaustive-deps

  // When graph mode activates, fetch ALL personal prompts (no pagination).
  // filteredPersonalLibrary only has the current page — graph needs the full library.
  const { isLoaded: authLoaded } = useAuth();
  const userId = ctx.user?.id;
  useEffect(() => {
    // Gate on authLoaded: firing before AuthContext hydrates can mean a stale
    // JWT is on the wire, causing RLS to return a truncated result set
    // (the "1-node graph" bug). created_at is NOT NULL; sort_index is nullable.
    if (localViewType !== "graph" || !userId || !authLoaded) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setGraphLoading(true);
    });
    createClient()
      .from("personal_library")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(GRAPH_ROW_LIMIT)
      .then(({ data, count, error }) => {
        if (cancelled) return;
        if (error) logger.error("[graph] fetch all prompts failed", error);
        const rows = (data ?? []) as PersonalPrompt[];
        if (typeof count === "number" && count > rows.length + 5) {
          logger.warn("[graph] row count mismatch", {
            rowsReturned: rows.length,
            totalCount: count,
          });
        }
        setGraphPrompts(rows);
        setGraphTotalCount(typeof count === "number" ? count : null);
        setGraphLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [localViewType, userId, authLoaded]);

  // Expanded card ids
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Dropdown for per-card more menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMoveSubMenu, setShowMoveSubMenu] = useState(false);
  const [newMoveInlineName, setNewMoveInlineName] = useState("");
  const [showNewMoveInlineInput, setShowNewMoveInlineInput] = useState(false);

  // Context menu for folders
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: string;
    x: number;
    y: number;
  } | null>(null);

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

  // ─── History → PersonalPrompt converter ──────────────────────────────────

  const historyAsPrompts: PersonalPrompt[] = history.map((h: HistoryItem) => ({
    id: h.id,
    title: h.title || h.entity.category || h.enhanced.slice(0, 60),
    prompt: h.enhanced,
    category: h.category,
    personal_category: null,
    use_case: h.tone || "",
    created_at: h.timestamp,
    updated_at: h.timestamp,
    use_count: 0,
    source: "manual" as const,
    tags: [],
    last_used_at: null,
    capability_mode: CapabilityMode.STANDARD,
  }));

  // ─── Derived Data ─────────────────────────────────────────────────────────

  // Determine effective active folder (null from context = "all").
  // history is local-only so we check activeLocalFolder first.
  const effectiveFolder =
    activeLocalFolder === "history"
      ? "history"
      : ctxActiveFolder !== undefined
        ? ctxActiveFolder === null
          ? "all"
          : ctxActiveFolder
        : activeLocalFolder;

  const isHistoryFolder = effectiveFolder === "history";

  // Display items filtered by active folder (local filtering when context doesn't handle it)
  const allDisplayItems = filteredPersonalLibrary;

  const folderFilteredItems = (() => {
    if (isHistoryFolder) return historyAsPrompts;
    if (effectiveFolder === "all") return allDisplayItems;
    if (effectiveFolder === "favorites")
      return allDisplayItems.filter((p) => favoritePersonalIds.has(p.id));
    if (effectiveFolder === "pinned") return allDisplayItems.filter((p) => p.is_pinned);
    if (effectiveFolder === "templates")
      return allDisplayItems.filter((p) => p.is_template === true);
    return allDisplayItems.filter(
      (p) => (p.personal_category || PERSONAL_DEFAULT_CATEGORY) === effectiveFolder,
    );
  })();

  // Pagination — history uses local-only pagination (no server pagination)
  const usedPage = isHistoryFolder ? localPage : (ctxPage ?? localPage);
  const usedPageSize = ctxPageSize;
  const usedTotalCount = isHistoryFolder
    ? historyAsPrompts.length
    : (ctxTotalCount ?? folderFilteredItems.length);
  const totalPages = Math.max(1, Math.ceil(usedTotalCount / usedPageSize));

  // Local paginated slice (when context doesn't paginate)
  const paginatedItems =
    !isHistoryFolder && ctxPage !== undefined
      ? folderFilteredItems // context already paginates
      : folderFilteredItems.slice((localPage - 1) * usedPageSize, localPage * usedPageSize);

  const displayItems = paginatedItems;

  // Folder counts derived locally as fallback
  const localFolderCounts: Record<string, number> = {
    all: allDisplayItems.length,
    favorites: allDisplayItems.filter((p) => favoritePersonalIds.has(p.id)).length,
    pinned: allDisplayItems.filter((p) => p.is_pinned).length,
    templates: allDisplayItems.filter((p) => p.is_template === true).length,
    history: historyAsPrompts.length,
  };
  const allPersonalCategories = Array.from(
    new Set([
      PERSONAL_DEFAULT_CATEGORY,
      ...personalCategories,
      ...(allDisplayItems.map((p) => p.personal_category).filter(Boolean) as string[]),
    ]),
  );
  allPersonalCategories.forEach((cat) => {
    localFolderCounts[cat] = allDisplayItems.filter(
      (p) => (p.personal_category || PERSONAL_DEFAULT_CATEGORY) === cat,
    ).length;
  });

  const baseFolderCounts = ctxFolderCounts ?? localFolderCounts;
  const folderCounts = { ...baseFolderCounts, history: historyAsPrompts.length };
  const isLoading = !isPersonalLoaded || ctxIsPageLoading;

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedIds(new Set());
      setSelectionMode(false);
    });
  }, [effectiveFolder]);
  useEffect(() => {
    queueMicrotask(() => setLocalPage(1));
  }, [effectiveFolder, personalQuery, selectedCapabilityFilter]);
  useEffect(() => {
    const handleClick = () => {
      setOpenMenuId(null);
      setFolderContextMenu(null);
      setShowMoveSubMenu(false);
      setShowNewMoveInlineInput(false);
      setNewMoveInlineName("");
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const extractVariablesFromPrompt = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  };

  const getStyledPromptMarkup = (prompt: PersonalPrompt) => {
    return prompt.prompt_style || prompt.prompt;
  };

  const setFolder = useCallback(
    (folder: string) => {
      setActiveLocalFolder(folder);
      setSidebarOpen(false);
      // history is local-only — don't push to server pagination context
      if (folder === "history") return;
      // Send virtual folders as-is to useLibrary (it handles favorites/pinned/all specially)
      if (ctxSetActiveFolder) ctxSetActiveFolder(folder === "all" ? null : folder);
      // Map to personalView for legacy context filtering
      if (folder === "favorites") setPersonalView("favorites");
      else setPersonalView("all");
    },
    [ctxSetActiveFolder, setPersonalView],
  );

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
    else
      setPersonalSort(val as "recent" | "title" | "usage" | "custom" | "last_used" | "performance");
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
    const visibleIds = displayItems.map((p) => p.id);
    const allVisibleSelected = visibleIds.every((id) => next.has(id));
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBatchDelete = async () => {
    if (!confirm(`האם למחוק ${selectedIds.size} פרומפטים מסומנים?`)) return;
    try {
      await ctx.deletePrompts(Array.from(selectedIds));
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
      await ctx.movePrompts(Array.from(selectedIds), category);
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
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) {
      toast.error("יש להזין לפחות תגית אחת");
      return;
    }
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const item = filteredPersonalLibrary.find((p) => p.id === id);
        if (!item) return;
        const newTags = Array.from(new Set([...(item.tags || []), ...tags]));
        await ctx.updateTags(id, newTags);
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
    const items = filteredPersonalLibrary.filter((p) => selectedIds.has(p.id));
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const a = document.createElement("a");
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
      if (!Array.isArray(parsed)) {
        toast.error("קובץ לא תקין - נדרש מערך JSON");
        return;
      }
      const valid = parsed.filter(
        (item: Record<string, unknown>) =>
          typeof item.title === "string" && typeof item.prompt === "string",
      );
      if (valid.length === 0) {
        toast.error("לא נמצאו פרומפטים תקינים בקובץ");
        return;
      }
      const existingTexts = new Set(personalLibrary.map((p) => p.prompt.trim()));
      const toImport = valid.filter(
        (item: Record<string, unknown>) => !existingTexts.has((item.prompt as string).trim()),
      );
      const skipped = valid.length - toImport.length;
      if (toImport.length === 0) {
        toast.info(`כל ${valid.length} הפרומפטים כבר קיימים בספרייה`);
        return;
      }
      const confirmMsg =
        skipped > 0
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
        tags: [],
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
    if (folder === "all" || folder === "favorites" || folder === "pinned" || folder === "templates")
      return;
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
      for (let i = Math.max(2, usedPage - 1); i <= Math.min(totalPages - 1, usedPage + 1); i++)
        pages.push(i);
      if (usedPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // ─── Shared state object ─────────────────────────────────────────────────

  const activeFolderLabel = (() => {
    if (effectiveFolder === "all") return "כל הפרומפטים";
    if (effectiveFolder === "favorites") return "מועדפים";
    if (effectiveFolder === "pinned") return "מוצמדים";
    if (effectiveFolder === "templates") return "תבניות";
    if (effectiveFolder === "history") return "היסטוריה";
    return effectiveFolder;
  })();

  const currentSort = ctxSortBy ?? personalSort;

  const shared: PersonalLibrarySharedState = {
    displayItems,
    allDisplayItems,
    effectiveFolder,
    activeFolderLabel,
    folderCounts,
    allPersonalCategories,
    isLoading,
    currentSort,
    localSearch,
    usedPage,
    usedPageSize,
    usedTotalCount,
    totalPages,
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAllVisible,
    clearSelection,
    expandedIds,
    setExpandedIds,
    openMenuId,
    setOpenMenuId,
    showMoveSubMenu,
    setShowMoveSubMenu,
    newMoveInlineName,
    setNewMoveInlineName,
    showNewMoveInlineInput,
    setShowNewMoveInlineInput,
    styleEditorExpanded,
    setStyleEditorExpanded,
    styleTextareaRef,
    applyStyleToken,
    clearStyleTokens,
    insertTextAtCursor,
    quickInserts,
    versionHistoryPrompt,
    setVersionHistoryPrompt,
    sidebarOpen,
    setSidebarOpen,
    folderContextMenu,
    setFolderContextMenu,
    showNewFolderInput,
    setShowNewFolderInput,
    newFolderName,
    setNewFolderName,
    handleAddNewFolder,
    chainsExpanded,
    setChainsExpanded,
    showMoveDialog,
    setShowMoveDialog,
    showTagDialog,
    setShowTagDialog,
    tagsInput,
    setTagsInput,
    targetMoveCategory,
    setTargetMoveCategory,
    isCreatingNewMoveCategory,
    setIsCreatingNewMoveCategory,
    newMoveCategoryInput,
    setNewMoveCategoryInput,
    localViewType,
    setLocalViewType,
    importFileRef,
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    setFolder,
    handleFolderContextMenu,
    handleFolderRename,
    handleBatchDelete,
    handleBatchMove,
    handleBatchTag,
    handleBatchExport,
    handleImportFile,
    addPersonalPromptFromLibrary,
    getPaginationPages,
    getStyledPromptMarkup,
    extractVariablesFromPrompt,
  };

  // ─── Guest gate ────────────────────────────────────────────────────────────
  // Show a login prompt for unauthenticated visitors instead of an infinite spinner.
  if (isPersonalLoaded && !ctx.user) {
    return (
      <div
        className="flex items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500"
        dir="rtl"
      >
        <div className="w-full max-w-lg bg-white/95 dark:bg-zinc-950/90 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-5">
          {/* Animated demo graph — gives guests a glimpse of the feature */}
          <GuestGraphPreview height={220} />
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-yellow-500/10 border border-amber-500/20 flex items-center justify-center">
            <Image
              src="/images/peroot_logo_pack/logo_dark_240.png"
              alt="Peroot"
              width={40}
              height={40}
              className="block dark:hidden"
              style={{ width: "auto", height: "auto" }}
            />
            <Image
              src="/images/peroot_logo_pack/logo_dark_navbar_2x.png"
              alt="Peroot"
              width={40}
              height={40}
              className="hidden dark:block"
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              הספרייה האישית שלך מחכה
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              התחבר כדי לגשת לכל הפרומפטים שלך, המועדפים, הגרף האישי וההיסטוריה.
            </p>
          </div>

          {/* Feature list */}
          <ul className="w-full space-y-3 text-sm text-right">
            {[
              {
                Icon: BookOpen,
                color: "text-amber-500",
                label: "ספרייה אישית — כל הפרומפטים שלך במקום אחד",
              },
              {
                Icon: Star,
                color: "text-yellow-500",
                label: "מועדפים — גישה מהירה לפרומפטים שאהבת",
              },
              {
                Icon: Network,
                color: "text-purple-500",
                label: "גרף ידע — ויזואליזציה של הקשרים בין הפרומפטים",
              },
              { Icon: History, color: "text-blue-500", label: "היסטוריה — כל הפרומפטים שיצרת" },
            ].map(({ Icon, color, label }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                <span className="text-slate-600 dark:text-slate-400">{label}</span>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl text-white font-semibold shadow-lg transition-all"
            >
              <LogIn className="w-4 h-4" />
              התחבר עכשיו
            </Link>
            <Link
              href="/login?tab=signup"
              className="w-full flex items-center justify-center py-3 px-5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
            >
              פתח חשבון חינם
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 md:pb-0"
      dir="rtl"
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="תיקיות הספרייה האישית"
        className={cn(
          "fixed top-0 right-0 h-full w-72 max-w-[85vw] z-50 bg-[#0A0A0F] border-l border-(--glass-border) shadow-2xl transition-transform duration-300 md:hidden overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <PersonalLibrarySidebar shared={shared} isMobile={true} />
      </div>

      {/* Top Bar */}
      <PersonalLibraryHeader shared={shared} viewProps={{ handleImportHistory, historyLength }} />

      {/* Main layout: sidebar + content */}
      {localViewType === "graph" ? (
        <ErrorBoundary name="PromptGraphView">
          <PromptGraphView
            prompts={graphPrompts}
            favoriteIds={favoritePersonalIds}
            onUsePrompt={(p) => onUsePrompt(p)}
            isLoading={graphLoading}
            truncatedAt={
              graphTotalCount !== null && graphTotalCount > graphPrompts.length
                ? { shown: graphPrompts.length, total: graphTotalCount }
                : null
            }
          />
        </ErrorBoundary>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-[260px] shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-white/8 bg-black/5 dark:bg-black/30 backdrop-blur-sm">
            <PersonalLibrarySidebar shared={shared} isMobile={false} />
          </aside>

          {/* Main Content */}
          <PersonalLibraryGrid shared={shared} viewProps={{ onUsePrompt, onCopyText }} />
        </div>
      )}

      {/* Modals, floating bars, context menus */}
      <PersonalLibraryModals shared={shared} />
    </div>
  );
}
