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
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAllPersonalPrompts } from "@/hooks/useAllPersonalPrompts";

import { PersonalLibraryHeader } from "./personal-library/PersonalLibraryHeader";
import { PersonalLibraryGrid } from "./personal-library/PersonalLibraryGrid";
import { PersonalLibraryModals } from "./personal-library/PersonalLibraryModals";
import { PersonalLibrarySidebar } from "./personal-library/PersonalLibrarySidebar";
import { PromptGraphView } from "@/components/features/library/PromptGraphView";
import { LibraryBottomNav } from "@/components/features/library/LibraryBottomNav";
import { GuestGraphPreview } from "@/components/features/library/GuestGraphPreview";
import { MemoryPalaceSidebar } from "@/components/features/library/memory-palace/MemoryPalaceSidebar";
import { MemoryPalaceDrawer } from "@/components/features/library/memory-palace/MemoryPalaceDrawer";
import type { PersonalLibrarySharedState } from "./personal-library/types";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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

// Strip server-owned fields so a deleted prompt can be re-added via addPrompts
// (used by undo-delete). Content/title/category are preserved; use_count and
// timestamps reset, which is acceptable for an undo.
function stripForRestore(
  p: PersonalPrompt,
): Omit<PersonalPrompt, "id" | "created_at" | "updated_at" | "use_count"> {
  const clone: Partial<PersonalPrompt> = { ...p };
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;
  delete clone.use_count;
  return clone as Omit<PersonalPrompt, "id" | "created_at" | "updated_at" | "use_count">;
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
  const confirmDialog = useConfirm();
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
    allLocalItems,
    selectedCapabilityFilter,
    isPersonalLoaded,
    selectedPromptId,
    setSelectedPromptId,
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
  // List density — persisted via the SSR-safe useLocalStorage hook.
  const [density, setDensity] = useLocalStorage<"comfortable" | "compact">(
    "peroot:library-density",
    "comfortable",
  );
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

  // Scroll to a prompt card when Memory Palace emits navigate event.
  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      // Two rAFs: first lets React expand the card, second lets layout settle.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-prompt-id="${id}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }),
      );
    };
    window.addEventListener("peroot:scroll-to-prompt", handler);
    return () => window.removeEventListener("peroot:scroll-to-prompt", handler);
  }, []);

  // Open graph view when parent signals via prop (race-condition-free).
  useEffect(() => {
    if (!openToGraph) return;
    setLocalViewType("graph"); // eslint-disable-line react-hooks/set-state-in-effect
    onGraphOpened?.();
  }, [openToGraph]); // eslint-disable-line react-hooks/exhaustive-deps

  const { isLoaded: authLoaded } = useAuth();
  const userId = ctx.user?.id;

  // Expanded card ids
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Memory Palace: last prompt whose card was opened (drives palace center)
  const [lastOpenedPromptId, setLastOpenedPromptId] = useState<string | null>(null);

  // Wrapper that tracks which id was just added so the Palace auto-centers on it.
  const setExpandedIdsTracked = useCallback((updater: React.SetStateAction<Set<string>>) => {
    let newId: string | null = null;
    setExpandedIds((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      for (const id of next) {
        if (!prev.has(id)) {
          newId = id;
          break;
        }
      }
      return next;
    });
    // Outside the updater to avoid setState-inside-setState anti-pattern.
    if (newId) setLastOpenedPromptId(newId);
  }, []);

  // Memory Palace mobile drawer
  const [drawerCenter, setDrawerCenter] = useState<string | null>(null);

  // Full personal-library corpus for the graph AND the Memory Palace — never the
  // paginated page slice. The palace scores neighbors across the whole library,
  // so feeding it `filteredPersonalLibrary` (one page) silently hides genuine
  // neighbors that sit on another page. Lazy: only fetches when a consumer is on
  // screen (graph mode, the mobile drawer, or the desktop palace which shows at
  // ≥5 prompts). `authLoaded` gates the fetch so a stale JWT can't truncate RLS.
  const corpusEnabled =
    authLoaded && (localViewType === "graph" || drawerCenter !== null || ctxTotalCount >= 5);
  const {
    prompts: corpusPrompts,
    loading: corpusLoading,
    truncatedAt: corpusTruncatedAt,
  } = useAllPersonalPrompts({
    enabled: corpusEnabled,
    userId,
    guestItems: allLocalItems,
    totalCount: ctxTotalCount,
  });

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
    if (
      !(await confirmDialog({
        title: `למחוק ${selectedIds.size} פרומפטים?`,
        message: "אפשר לבטל מיד לאחר המחיקה.",
        danger: true,
        confirmLabel: "מחק",
      }))
    )
      return;
    // Snapshot the full objects before deleting so we can offer undo.
    const deleted = personalLibrary.filter((p) => selectedIds.has(p.id));
    const count = deleted.length;
    try {
      await ctx.deletePrompts(Array.from(selectedIds));
      clearSelection();
      toast.success(`${count} פרומפטים נמחקו`, {
        action: {
          label: "בטל",
          onClick: async () => {
            try {
              await ctx.addPrompts(deleted.map(stripForRestore));
              toast.success("הפרומפטים שוחזרו");
            } catch {
              toast.error("השחזור נכשל — הפרומפטים לא נמחקו לצמיתות, נסה שוב.");
            }
          },
        },
      });
    } catch {
      toast.error("המחיקה נכשלה. נסה שוב, או רענן את הדף אם הבעיה נמשכת.");
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
      // Selection can span pages; filteredPersonalLibrary is only the current
      // page. Look up across the full graph set too, and report honestly if some
      // selected items aren't loaded instead of silently skipping them.
      const lookup = new Map<string, PersonalPrompt>();
      [...graphPrompts, ...filteredPersonalLibrary].forEach((p) => lookup.set(p.id, p));
      const ids = Array.from(selectedIds);
      const found = ids.map((id) => lookup.get(id)).filter((p): p is PersonalPrompt => Boolean(p));
      await Promise.all(
        found.map((item) =>
          ctx.updateTags(item.id, Array.from(new Set([...(item.tags || []), ...tags]))),
        ),
      );
      const missing = ids.length - found.length;
      toast.success(
        missing > 0
          ? `תגיות עודכנו ל-${found.length} פריטים. ${missing} לא נטענו — גללו אליהם ונסו שוב.`
          : "תגיות עודכנו",
      );
      setShowTagDialog(false);
      setTagsInput("");
      clearSelection();
    } catch {
      toast.error("שגיאה בעדכון תגיות");
    }
  };

  const handleBatchExport = () => {
    const lookup = new Map<string, PersonalPrompt>();
    [...graphPrompts, ...filteredPersonalLibrary].forEach((p) => lookup.set(p.id, p));
    const items = Array.from(selectedIds)
      .map((id) => lookup.get(id))
      .filter((p): p is PersonalPrompt => Boolean(p));
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `peroot_export_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    const missing = selectedIds.size - items.length;
    toast.success(
      missing > 0 ? `יוצאו ${items.length} פריטים (${missing} לא נטענו)` : "יצוא הושלם",
    );
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
          ? `${toImport.length} פרומפטים ייובאו (${skipped} כפולים ידולגו).`
          : `${toImport.length} פרומפטים ייובאו.`;
      if (
        !(await confirmDialog({
          title: "ייבוא פרומפטים",
          message: confirmMsg,
          confirmLabel: "ייבא",
        }))
      )
        return;
      const promptsToAdd = toImport.map((item: Record<string, unknown>) => ({
        title: item.title as string,
        prompt: item.prompt as string,
        category: (item.category as string) || "",
        personal_category: (item.personal_category as string) || "כללי",
        use_case: (item.use_case as string) || "",
        source: "imported" as const,
        tags: Array.isArray(item.tags) ? item.tags : [],
        // Validate against the enum so a bad imported value can't trip the DB
        // CHECK constraint and abort the whole import.
        capability_mode: (Object.values(CapabilityMode) as string[]).includes(
          item.capability_mode as string,
        )
          ? (item.capability_mode as PersonalPrompt["capability_mode"])
          : CapabilityMode.STANDARD,
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
    setExpandedIds: setExpandedIdsTracked,
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
    density,
    setDensity,
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
    onShowConnections: (id: string) => setDrawerCenter(id),
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
                color: "text-indigo-500",
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
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 md:pb-0 overflow-x-hidden w-full"
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
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={cn(
          "fixed top-0 start-0 h-full w-72 max-w-[85vw] z-50 bg-[#0A0A0F] border-e border-(--glass-border) shadow-2xl transition-transform duration-300 md:hidden overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
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
            prompts={corpusPrompts}
            favoriteIds={favoritePersonalIds}
            onUsePrompt={(p) => onUsePrompt(p)}
            isLoading={corpusLoading}
            truncatedAt={corpusTruncatedAt}
          />
        </ErrorBoundary>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-[260px] shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-white/8 bg-black/5 dark:bg-black/30 backdrop-blur-sm">
            <PersonalLibrarySidebar shared={shared} isMobile={false} />
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <PersonalLibraryGrid shared={shared} viewProps={{ onUsePrompt, onCopyText }} />
          </div>

          {/* Memory Palace sidebar (desktop only) */}
          <MemoryPalaceSidebar
            prompts={corpusPrompts}
            selectedPromptId={selectedPromptId}
            lastOpenedPromptId={lastOpenedPromptId}
            onSelectPrompt={setSelectedPromptId}
            onOpenPrompt={(id) => {
              setLastOpenedPromptId(id);
              setSelectedPromptId(id);
              setExpandedIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
              });
            }}
          />
        </div>
      )}

      {/* Modals, floating bars, context menus */}
      <PersonalLibraryModals shared={shared} />

      {/* Mobile bottom navigation */}
      <LibraryBottomNav shared={shared} />

      {/* Memory Palace mobile drawer */}
      <MemoryPalaceDrawer
        open={drawerCenter !== null}
        centerPromptId={drawerCenter}
        prompts={corpusPrompts}
        onClose={() => setDrawerCenter(null)}
        onOpenPrompt={(id) => {
          setLastOpenedPromptId(id);
          setSelectedPromptId(id);
          setExpandedIdsTracked((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }}
      />
    </div>
  );
}
