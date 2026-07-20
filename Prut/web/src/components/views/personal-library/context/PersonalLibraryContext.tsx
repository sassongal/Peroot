"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { useLibraryContext } from "@/context/LibraryContext";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useHistory, type HistoryItem } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAllPersonalPrompts } from "@/hooks/useAllPersonalPrompts";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { logger } from "@/lib/logger";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { getPaginationPages } from "../pagination-utils";
import { lookupSelectedAcrossCorpus } from "../corpus-lookup";
import {
  resolveEffectiveFolder,
  buildPersonalCategories,
  buildLocalFolderCounts,
  mergeFolderCounts,
} from "../folder-utils";

// ─── Context value shapes ───────────────────────────────────────────────────

export interface SelectionValue {
  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSelection: (id: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
}

export interface ExpandedValue {
  expandedIds: Set<string>;
  setExpandedIds: (updater: React.SetStateAction<Set<string>>) => void;
}

export interface CardMenuValue {
  openMenuId: string | null;
  setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  showMoveSubMenu: boolean;
  setShowMoveSubMenu: React.Dispatch<React.SetStateAction<boolean>>;
  newMoveInlineName: string;
  setNewMoveInlineName: React.Dispatch<React.SetStateAction<string>>;
  showNewMoveInlineInput: boolean;
  setShowNewMoveInlineInput: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface FoldersValue {
  effectiveFolder: string;
  activeFolderLabel: string;
  folderCounts: Record<string, number>;
  allPersonalCategories: string[];
  setFolder: (folder: string) => void;
  addFolder: (name: string) => Promise<void>;
  handleFolderContextMenu: (e: React.MouseEvent, folder: string) => void;
  handleFolderRename: (folder: string) => void;
}

export interface SidebarValue {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ListValue {
  displayItems: PersonalPrompt[];
  isLoading: boolean;
  localSearch: string;
  currentSort: string;
  handleSearchChange: (val: string) => void;
  handleSortChange: (val: string) => void;
  chainsExpanded: boolean;
  setChainsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  addPersonalPromptFromLibrary: (prompt: LibraryPrompt) => Promise<void>;
}

export interface PaginationValue {
  usedPage: number;
  usedPageSize: number;
  usedTotalCount: number;
  totalPages: number;
  handlePageChange: (p: number) => void;
  getPaginationPages: () => (number | "...")[];
}

export interface ViewPrefsValue {
  localViewType: "grid" | "graph";
  setLocalViewType: React.Dispatch<React.SetStateAction<"grid" | "graph">>;
  density: "comfortable" | "compact";
  setDensity: (value: "comfortable" | "compact") => void;
}

export interface BatchDialogsValue {
  showMoveDialog: boolean;
  setShowMoveDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showTagDialog: boolean;
  setShowTagDialog: React.Dispatch<React.SetStateAction<boolean>>;
  tagsInput: string;
  setTagsInput: React.Dispatch<React.SetStateAction<string>>;
  targetMoveCategory: string;
  setTargetMoveCategory: React.Dispatch<React.SetStateAction<string>>;
  isCreatingNewMoveCategory: boolean;
  setIsCreatingNewMoveCategory: React.Dispatch<React.SetStateAction<boolean>>;
  newMoveCategoryInput: string;
  setNewMoveCategoryInput: React.Dispatch<React.SetStateAction<string>>;
  handleBatchDelete: () => Promise<void>;
  handleBatchMove: () => Promise<void>;
  handleBatchTag: () => Promise<void>;
  handleBatchExport: () => void;
  folderContextMenu: { folder: string; x: number; y: number } | null;
  setFolderContextMenu: React.Dispatch<
    React.SetStateAction<{ folder: string; x: number; y: number } | null>
  >;
}

export interface VersionHistoryValue {
  versionHistoryPrompt: PersonalPrompt | null;
  setVersionHistoryPrompt: React.Dispatch<React.SetStateAction<PersonalPrompt | null>>;
}

export interface ActionsValue {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
  onShowConnections: (promptId: string) => void;
}

export interface ShellValue {
  corpusPrompts: PersonalPrompt[];
  corpusLoading: boolean;
  corpusTruncatedAt: { shown: number; total: number } | null;
  /**
   * Stable library size (from useLibrary), available on the first paint — used
   * to decide whether the Memory Palace sidebar mounts and reserves its width,
   * WITHOUT waiting for the lazy `corpusPrompts` fetch. Gating the palace's
   * visibility on the async corpus caused a 3→2 column layout shift when it
   * mounted late (the corpus arrives seconds after the grid).
   */
  libraryCount: number;
  lastOpenedPromptId: string | null;
  setLastOpenedPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExpandedIdsTracked: (updater: React.SetStateAction<Set<string>>) => void;
  drawerCenter: string | null;
  setDrawerCenter: React.Dispatch<React.SetStateAction<string | null>>;
}

// ─── Contexts ───────────────────────────────────────────────────────────────

const SelectionCtx = createContext<SelectionValue | undefined>(undefined);
const ExpandedCtx = createContext<ExpandedValue | undefined>(undefined);
const CardMenuCtx = createContext<CardMenuValue | undefined>(undefined);
const FoldersCtx = createContext<FoldersValue | undefined>(undefined);
const SidebarCtx = createContext<SidebarValue | undefined>(undefined);
const ListCtx = createContext<ListValue | undefined>(undefined);
const PaginationCtx = createContext<PaginationValue | undefined>(undefined);
const ViewPrefsCtx = createContext<ViewPrefsValue | undefined>(undefined);
const BatchDialogsCtx = createContext<BatchDialogsValue | undefined>(undefined);
const VersionHistoryCtx = createContext<VersionHistoryValue | undefined>(undefined);
const ActionsCtx = createContext<ActionsValue | undefined>(undefined);
const ShellCtx = createContext<ShellValue | undefined>(undefined);

function useCtx<T>(ctx: React.Context<T | undefined>, name: string): T {
  const v = useContext(ctx);
  if (v === undefined) {
    throw new Error(`${name} must be used within a PersonalLibraryProvider`);
  }
  return v;
}

export const usePersonalLibrarySelection = () =>
  useCtx(SelectionCtx, "usePersonalLibrarySelection");
export const usePersonalLibraryExpanded = () => useCtx(ExpandedCtx, "usePersonalLibraryExpanded");
export const usePersonalLibraryCardMenu = () => useCtx(CardMenuCtx, "usePersonalLibraryCardMenu");
export const usePersonalLibraryFolders = () => useCtx(FoldersCtx, "usePersonalLibraryFolders");
export const usePersonalLibrarySidebar = () => useCtx(SidebarCtx, "usePersonalLibrarySidebar");
export const usePersonalLibraryList = () => useCtx(ListCtx, "usePersonalLibraryList");
export const usePersonalLibraryPagination = () =>
  useCtx(PaginationCtx, "usePersonalLibraryPagination");
export const usePersonalLibraryViewPrefs = () =>
  useCtx(ViewPrefsCtx, "usePersonalLibraryViewPrefs");
export const usePersonalLibraryBatchDialogs = () =>
  useCtx(BatchDialogsCtx, "usePersonalLibraryBatchDialogs");
export const usePersonalLibraryVersionHistory = () =>
  useCtx(VersionHistoryCtx, "usePersonalLibraryVersionHistory");
export const usePersonalLibraryActions = () => useCtx(ActionsCtx, "usePersonalLibraryActions");
export const usePersonalLibraryShell = () => useCtx(ShellCtx, "usePersonalLibraryShell");

// ─── Provider ───────────────────────────────────────────────────────────────

export interface PersonalLibraryProviderProps {
  children: ReactNode;
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
  openToGraph?: boolean;
  onGraphOpened?: () => void;
}

export function PersonalLibraryProvider({
  children,
  onUsePrompt,
  onCopyText,
  handleImportHistory,
  historyLength,
  openToGraph,
  onGraphOpened,
}: PersonalLibraryProviderProps) {
  const ctx = useLibraryContext();
  const confirmDialog = useConfirm();
  const { history } = useHistory();
  const { isLoaded: authLoaded } = useAuth();

  // Latest-value refs — let the callbacks below stay referentially stable
  // (empty dep arrays) while still reading current state/context on invocation.
  // This is what keeps a keystroke or menu toggle from churning every consumer.
  // The refs are refreshed in a post-commit effect (never during render) and are
  // only ever read inside event handlers, which fire after that effect commits.
  const ctxRef = useRef(ctx);
  const confirmRef = useRef(confirmDialog);

  const {
    filteredPersonalLibrary,
    personalLibrary,
    allLocalItems,
    personalCategories,
    favoritePersonalIds,
    selectedCapabilityFilter,
    isPersonalLoaded,
    personalQuery,
    personalSort,
    // Pagination
    page: ctxPage,
    totalCount: ctxTotalCount,
    pageSize: ctxPageSize,
    folderCounts: ctxFolderCounts,
    isPageLoading: ctxIsPageLoading,
    sortBy: ctxSortBy,
    activeFolder: ctxActiveFolder,
  } = ctx;

  const userId = ctx.user?.id;

  // ─── Local State ───────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [targetMoveCategory, setTargetMoveCategory] = useState("");
  const [isCreatingNewMoveCategory, setIsCreatingNewMoveCategory] = useState(false);
  const [newMoveCategoryInput, setNewMoveCategoryInput] = useState("");
  const [versionHistoryPrompt, setVersionHistoryPrompt] = useState<PersonalPrompt | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeLocalFolder, setActiveLocalFolder] = useState<string>("all");

  const [localViewType, setLocalViewType] = useState<"grid" | "graph">("grid");
  const [density, setDensity] = useLocalStorage<"comfortable" | "compact">(
    "peroot:library-density",
    "comfortable",
  );
  const [chainsExpanded, setChainsExpanded] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lastOpenedPromptId, setLastOpenedPromptId] = useState<string | null>(null);

  const [drawerCenter, setDrawerCenter] = useState<string | null>(null);

  // Per-card dropdown menu (the hot slice)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMoveSubMenu, setShowMoveSubMenu] = useState(false);
  const [newMoveInlineName, setNewMoveInlineName] = useState("");
  const [showNewMoveInlineInput, setShowNewMoveInlineInput] = useState(false);

  // Folder context menu
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: string;
    x: number;
    y: number;
  } | null>(null);

  const [localPage, setLocalPage] = useState(1);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(personalQuery || "");

  const importFileRef = useRef<HTMLInputElement | null>(null);

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
    if (newId) setLastOpenedPromptId(newId);
  }, []);

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
  const effectiveFolder = resolveEffectiveFolder(activeLocalFolder, ctxActiveFolder);
  const isHistoryFolder = effectiveFolder === "history";

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

  const usedPage = isHistoryFolder ? localPage : (ctxPage ?? localPage);
  const usedPageSize = ctxPageSize;
  const usedTotalCount = isHistoryFolder
    ? historyAsPrompts.length
    : (ctxTotalCount ?? folderFilteredItems.length);
  const totalPages = Math.max(1, Math.ceil(usedTotalCount / usedPageSize));

  const paginatedItems =
    !isHistoryFolder && ctxPage !== undefined
      ? folderFilteredItems
      : folderFilteredItems.slice((localPage - 1) * usedPageSize, localPage * usedPageSize);

  const displayItems = paginatedItems;

  const allPersonalCategories = buildPersonalCategories(
    personalCategories,
    allDisplayItems,
    PERSONAL_DEFAULT_CATEGORY,
  );
  const localFolderCounts = buildLocalFolderCounts(
    allDisplayItems,
    favoritePersonalIds,
    allPersonalCategories,
    historyAsPrompts.length,
    PERSONAL_DEFAULT_CATEGORY,
  );
  const folderCounts = mergeFolderCounts(
    ctxFolderCounts,
    localFolderCounts,
    historyAsPrompts.length,
  );
  const isLoading = !isPersonalLoaded || ctxIsPageLoading;

  const activeFolderLabel = (() => {
    if (effectiveFolder === "all") return "כל הפרומפטים";
    if (effectiveFolder === "favorites") return "מועדפים";
    if (effectiveFolder === "pinned") return "מוצמדים";
    if (effectiveFolder === "templates") return "תבניות";
    if (effectiveFolder === "history") return "היסטוריה";
    return effectiveFolder;
  })();

  const currentSort = ctxSortBy ?? personalSort;

  // Full personal-library corpus for the graph AND the Memory Palace — never the
  // paginated page slice. Lazy: only fetches when a consumer is on screen (graph
  // mode, the mobile drawer, or the desktop palace at ≥5 prompts). `authLoaded`
  // gates the fetch so a stale JWT can't truncate RLS.
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

  // Latest values available to the stable callbacks below.
  const latest = useRef({
    totalPages,
    usedPage,
    displayItems,
    personalLibrary,
    selectedIds,
    tagsInput,
    targetMoveCategory,
    isCreatingNewMoveCategory,
    newMoveCategoryInput,
    corpusPrompts,
    filteredPersonalLibrary,
  });

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Keep the latest-value refs current. Runs after every commit (no dep array);
  // event handlers that read these refs always fire after this has run.
  useEffect(() => {
    ctxRef.current = ctx;
    confirmRef.current = confirmDialog;
    latest.current = {
      totalPages,
      usedPage,
      displayItems,
      personalLibrary,
      selectedIds,
      tagsInput,
      targetMoveCategory,
      isCreatingNewMoveCategory,
      newMoveCategoryInput,
      corpusPrompts,
      filteredPersonalLibrary,
    };
  });
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

  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
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

  useEffect(() => {
    if (!openToGraph) return;
    setLocalViewType("graph"); // eslint-disable-line react-hooks/set-state-in-effect
    onGraphOpened?.();
  }, [openToGraph]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── Selection ─────────────────────────────────────────────────────────────
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const visibleIds = latest.current.displayItems.map((p) => p.id);
      const allVisibleSelected = visibleIds.every((id) => next.has(id));
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // ─── Folder handlers ────────────────────────────────────────────────────────
  const setFolder = useCallback((folder: string) => {
    setActiveLocalFolder(folder);
    setSidebarOpen(false);
    if (folder === "history") return;
    if (ctxRef.current.setActiveFolder)
      ctxRef.current.setActiveFolder(folder === "all" ? null : folder);
    if (folder === "favorites") ctxRef.current.setPersonalView("favorites");
    else ctxRef.current.setPersonalView("all");
  }, []);

  const addFolder = useCallback(async (name: string) => {
    ctxRef.current.setNewPersonalCategory(name);
    await ctxRef.current.addPersonalCategory();
  }, []);

  const handleFolderContextMenu = useCallback((e: React.MouseEvent, folder: string) => {
    if (folder === "all" || folder === "favorites" || folder === "pinned" || folder === "templates")
      return;
    e.preventDefault();
    setFolderContextMenu({ folder, x: e.clientX, y: e.clientY });
  }, []);

  const handleFolderRename = useCallback((folder: string) => {
    ctxRef.current.startRenameCategory(folder);
    setFolderContextMenu(null);
  }, []);

  // ─── List / search / sort / pagination ───────────────────────────────────────
  const handleSearchChange = useCallback((val: string) => {
    setLocalSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (ctxRef.current.setSearchQuery) ctxRef.current.setSearchQuery(val);
      else ctxRef.current.setPersonalQuery(val);
    }, 300);
  }, []);

  const handleSortChange = useCallback((val: string) => {
    if (ctxRef.current.setSortBy) ctxRef.current.setSortBy(val);
    else
      ctxRef.current.setPersonalSort(
        val as "recent" | "title" | "usage" | "custom" | "last_used" | "performance",
      );
  }, []);

  const handlePageChange = useCallback((p: number) => {
    if (p < 1 || p > latest.current.totalPages) return;
    if (ctxRef.current.setPage) ctxRef.current.setPage(p);
    else setLocalPage(p);
  }, []);

  // Read from current render values (not the post-commit ref): the pagination
  // strip is built during the Grid's render, so it must reflect this render.
  const getPaginationPagesFn = useCallback(
    () => getPaginationPages(totalPages, usedPage),
    [totalPages, usedPage],
  );

  // ─── Batch handlers ──────────────────────────────────────────────────────────
  const handleBatchDelete = useCallback(async () => {
    const c = ctxRef.current;
    if (
      !(await confirmRef.current({
        title: `למחוק ${latest.current.selectedIds.size} פרומפטים?`,
        message: "אפשר לבטל מיד לאחר המחיקה.",
        danger: true,
        confirmLabel: "מחק",
      }))
    )
      return;
    const ids = latest.current.selectedIds;
    const deleted = latest.current.personalLibrary.filter((p) => ids.has(p.id));
    const count = deleted.length;
    try {
      await c.deletePrompts(Array.from(ids));
      clearSelection();
      toast.success(`${count} פרומפטים נמחקו`, {
        action: {
          label: "בטל",
          onClick: async () => {
            try {
              await ctxRef.current.restorePrompts(deleted);
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
  }, [clearSelection]);

  const handleBatchMove = useCallback(async () => {
    const category = latest.current.isCreatingNewMoveCategory
      ? latest.current.newMoveCategoryInput.trim()
      : latest.current.targetMoveCategory;
    if (!category) return;
    try {
      await ctxRef.current.movePrompts(Array.from(latest.current.selectedIds), category);
      toast.success("הועברו בהצלחה");
      setShowMoveDialog(false);
      setIsCreatingNewMoveCategory(false);
      setNewMoveCategoryInput("");
      clearSelection();
    } catch {
      toast.error("שגיאה בהעברה");
    }
  }, [clearSelection]);

  const handleBatchTag = useCallback(async () => {
    const tags = latest.current.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) {
      toast.error("יש להזין לפחות תגית אחת");
      return;
    }
    try {
      // Selection can span pages. Resolve across the full corpus (fixes the bug
      // where authenticated users' off-page selections vanished because the old
      // lookup used the guest-only `allLocalItems`), with the current page winning.
      const { found, missingCount } = lookupSelectedAcrossCorpus(
        latest.current.selectedIds,
        latest.current.corpusPrompts,
        latest.current.filteredPersonalLibrary,
      );
      await Promise.all(
        found.map((item) =>
          ctxRef.current.updateTags(item.id, Array.from(new Set([...(item.tags || []), ...tags]))),
        ),
      );
      toast.success(
        missingCount > 0
          ? `תגיות עודכנו ל-${found.length} פריטים. ${missingCount} לא נטענו — גללו אליהם ונסו שוב.`
          : "תגיות עודכנו",
      );
      setShowTagDialog(false);
      setTagsInput("");
      clearSelection();
    } catch {
      toast.error("שגיאה בעדכון תגיות");
    }
  }, [clearSelection]);

  const handleBatchExport = useCallback(() => {
    const { found, missingCount } = lookupSelectedAcrossCorpus(
      latest.current.selectedIds,
      latest.current.corpusPrompts,
      latest.current.filteredPersonalLibrary,
    );
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(found, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `peroot_export_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(
      missingCount > 0 ? `יוצאו ${found.length} פריטים (${missingCount} לא נטענו)` : "יצוא הושלם",
    );
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const existingTexts = new Set(latest.current.personalLibrary.map((p) => p.prompt.trim()));
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
        !(await confirmRef.current({
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
        capability_mode: (Object.values(CapabilityMode) as string[]).includes(
          item.capability_mode as string,
        )
          ? (item.capability_mode as PersonalPrompt["capability_mode"])
          : CapabilityMode.STANDARD,
        prompt_style: item.prompt_style as string | undefined,
      }));
      await ctxRef.current.addPrompts(promptsToAdd);
      toast.success(`יובאו ${toImport.length} פרומפטים בהצלחה`);
    } catch {
      toast.error("שגיאה בקריאת הקובץ - ודא שזהו קובץ JSON תקין");
    }
  }, []);

  const addPersonalPromptFromLibrary = useCallback(async (prompt: LibraryPrompt) => {
    try {
      await ctxRef.current.addPrompt({
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
  }, []);

  const onShowConnections = useCallback((id: string) => setDrawerCenter(id), []);

  // ─── Memoized context values ─────────────────────────────────────────────────
  const selectionValue = useMemo<SelectionValue>(
    () => ({
      selectionMode,
      setSelectionMode,
      selectedIds,
      setSelectedIds,
      toggleSelection,
      selectAllVisible,
      clearSelection,
    }),
    [selectionMode, selectedIds, toggleSelection, selectAllVisible, clearSelection],
  );

  const expandedValue = useMemo<ExpandedValue>(
    () => ({ expandedIds, setExpandedIds: setExpandedIdsTracked }),
    [expandedIds, setExpandedIdsTracked],
  );

  const cardMenuValue = useMemo<CardMenuValue>(
    () => ({
      openMenuId,
      setOpenMenuId,
      showMoveSubMenu,
      setShowMoveSubMenu,
      newMoveInlineName,
      setNewMoveInlineName,
      showNewMoveInlineInput,
      setShowNewMoveInlineInput,
    }),
    [openMenuId, showMoveSubMenu, newMoveInlineName, showNewMoveInlineInput],
  );

  const foldersValue = useMemo<FoldersValue>(
    () => ({
      effectiveFolder,
      activeFolderLabel,
      folderCounts,
      allPersonalCategories,
      setFolder,
      addFolder,
      handleFolderContextMenu,
      handleFolderRename,
    }),
    [
      effectiveFolder,
      activeFolderLabel,
      folderCounts,
      allPersonalCategories,
      setFolder,
      addFolder,
      handleFolderContextMenu,
      handleFolderRename,
    ],
  );

  const sidebarValue = useMemo<SidebarValue>(
    () => ({ sidebarOpen, setSidebarOpen }),
    [sidebarOpen],
  );

  const listValue = useMemo<ListValue>(
    () => ({
      displayItems,
      isLoading,
      localSearch,
      currentSort,
      handleSearchChange,
      handleSortChange,
      chainsExpanded,
      setChainsExpanded,
      handleImportFile,
      importFileRef,
      addPersonalPromptFromLibrary,
    }),
    [
      displayItems,
      isLoading,
      localSearch,
      currentSort,
      handleSearchChange,
      handleSortChange,
      chainsExpanded,
      handleImportFile,
      addPersonalPromptFromLibrary,
    ],
  );

  const paginationValue = useMemo<PaginationValue>(
    () => ({
      usedPage,
      usedPageSize,
      usedTotalCount,
      totalPages,
      handlePageChange,
      getPaginationPages: getPaginationPagesFn,
    }),
    [usedPage, usedPageSize, usedTotalCount, totalPages, handlePageChange, getPaginationPagesFn],
  );

  const viewPrefsValue = useMemo<ViewPrefsValue>(
    () => ({ localViewType, setLocalViewType, density, setDensity }),
    [localViewType, density, setDensity],
  );

  const batchDialogsValue = useMemo<BatchDialogsValue>(
    () => ({
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
      handleBatchDelete,
      handleBatchMove,
      handleBatchTag,
      handleBatchExport,
      folderContextMenu,
      setFolderContextMenu,
    }),
    [
      showMoveDialog,
      showTagDialog,
      tagsInput,
      targetMoveCategory,
      isCreatingNewMoveCategory,
      newMoveCategoryInput,
      handleBatchDelete,
      handleBatchMove,
      handleBatchTag,
      handleBatchExport,
      folderContextMenu,
    ],
  );

  const versionHistoryValue = useMemo<VersionHistoryValue>(
    () => ({ versionHistoryPrompt, setVersionHistoryPrompt }),
    [versionHistoryPrompt],
  );

  const actionsValue = useMemo<ActionsValue>(
    () => ({ onUsePrompt, onCopyText, handleImportHistory, historyLength, onShowConnections }),
    [onUsePrompt, onCopyText, handleImportHistory, historyLength, onShowConnections],
  );

  const shellValue = useMemo<ShellValue>(
    () => ({
      corpusPrompts,
      corpusLoading,
      corpusTruncatedAt,
      libraryCount: ctxTotalCount,
      lastOpenedPromptId,
      setLastOpenedPromptId,
      setExpandedIds,
      setExpandedIdsTracked,
      drawerCenter,
      setDrawerCenter,
    }),
    [
      corpusPrompts,
      corpusLoading,
      corpusTruncatedAt,
      ctxTotalCount,
      lastOpenedPromptId,
      drawerCenter,
      setExpandedIdsTracked,
    ],
  );

  return (
    <ActionsCtx.Provider value={actionsValue}>
      <ShellCtx.Provider value={shellValue}>
        <ViewPrefsCtx.Provider value={viewPrefsValue}>
          <SidebarCtx.Provider value={sidebarValue}>
            <FoldersCtx.Provider value={foldersValue}>
              <PaginationCtx.Provider value={paginationValue}>
                <ListCtx.Provider value={listValue}>
                  <SelectionCtx.Provider value={selectionValue}>
                    <ExpandedCtx.Provider value={expandedValue}>
                      <CardMenuCtx.Provider value={cardMenuValue}>
                        <BatchDialogsCtx.Provider value={batchDialogsValue}>
                          <VersionHistoryCtx.Provider value={versionHistoryValue}>
                            {children}
                          </VersionHistoryCtx.Provider>
                        </BatchDialogsCtx.Provider>
                      </CardMenuCtx.Provider>
                    </ExpandedCtx.Provider>
                  </SelectionCtx.Provider>
                </ListCtx.Provider>
              </PaginationCtx.Provider>
            </FoldersCtx.Provider>
          </SidebarCtx.Provider>
        </ViewPrefsCtx.Provider>
      </ShellCtx.Provider>
    </ActionsCtx.Provider>
  );
}
