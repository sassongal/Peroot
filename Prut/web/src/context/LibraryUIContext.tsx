"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Hash, AtSign, Wand2 } from "lucide-react";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { CapabilityMode } from "@/lib/capability-mode";
import { logger } from "@/lib/logger";
import { hebrewFuzzyMatch } from "@/lib/hebrew-search";
import { stripStyleTokens } from "@/lib/text-utils";
import { useLibraryData } from "./LibraryDataContext";
import { useFavoritesContext } from "./FavoritesContext";

// ---------------------------------------------------------------------------
// Style editor — helpers for the per-prompt visual style editor. These used to
// live in PersonalLibraryView and be prop-drilled; they belong beside the
// `styleDraft` / `openStyleEditor` / `saveStylePrompt` state they manipulate, so
// they live here and are exposed through a focused `useStyleEditor()` selector.
// ---------------------------------------------------------------------------

export interface QuickInsert {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

const QUICK_INSERTS: QuickInsert[] = [
  { label: "שם", icon: AtSign, text: "{name}" },
  { label: "חברה", icon: Hash, text: "{company}" },
  { label: "תעשייה", icon: Hash, text: "{industry}" },
  { label: "מוצר", icon: Hash, text: "{product}" },
  { label: "קהל יעד", icon: Hash, text: "{target_audience}" },
  { label: "טון", icon: Wand2, text: "{tone}" },
];

export interface StyleEditorContextType {
  styleEditorExpanded: boolean;
  setStyleEditorExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  styleTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  applyStyleToken: (prefix: string, value: string) => void;
  clearStyleTokens: () => void;
  insertTextAtCursor: (text: string) => void;
  quickInserts: QuickInsert[];
}

const StyleEditorCtx = createContext<StyleEditorContextType | undefined>(undefined);

export function useStyleEditor() {
  const context = useContext(StyleEditorCtx);
  if (!context) {
    throw new Error("useStyleEditor must be used within a LibraryUIProvider");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LibraryUIContextType {
  /** Current auth user (from LibraryProvider); null for guests. */
  user: User | null;

  // View modes
  viewMode: "home" | "library" | "personal";
  setViewMode: (mode: "home" | "library" | "personal") => void;

  libraryView: "all" | "favorites";
  setLibraryView: (view: "all" | "favorites") => void;

  personalView: "all" | "favorites";
  setPersonalView: (view: "all" | "favorites") => void;

  // Search queries
  libraryQuery: string;
  setLibraryQuery: (q: string) => void;
  personalQuery: string;
  setPersonalQuery: (q: string) => void;

  // Sort modes
  personalSort: "recent" | "title" | "usage" | "custom" | "last_used" | "performance";
  setPersonalSort: (
    sort: "recent" | "title" | "usage" | "custom" | "last_used" | "performance",
  ) => void;
  librarySort: "popularity" | "title" | "newest" | "rating";
  setLibrarySort: (sort: "popularity" | "title" | "newest" | "rating") => void;

  // Derived / filtered data
  filteredLibrary: LibraryPrompt[];
  filteredPersonalLibrary: PersonalPrompt[];
  libraryFavorites: LibraryPrompt[];

  // Capability Filtering
  selectedCapabilityFilter: CapabilityMode | null;
  setSelectedCapabilityFilter: (mode: CapabilityMode | null) => void;
  favoritesCapabilityFilter: CapabilityMode | null;
  setFavoritesCapabilityFilter: (mode: CapabilityMode | null) => void;

  // Category rename UI state
  newPersonalCategory: string;
  setNewPersonalCategory: (cat: string) => void;
  renamingCategory: string | null;
  setRenamingCategory: (cat: string | null) => void;
  renameCategoryInput: string;
  setRenameCategoryInput: (val: string) => void;
  startRenameCategory: (category: string) => void;
  cancelRenameCategory: () => void;
  saveRenameCategory: () => Promise<void>;

  // Wrapped category add (uses newPersonalCategory state)
  addPersonalCategory: () => Promise<void>;

  // Editing state
  editingPersonalId: string | null;
  editingTitle: string;
  setEditingTitle: (val: string) => void;
  editingUseCase: string;
  setEditingUseCase: (val: string) => void;
  startEditingPersonalPrompt: (prompt: PersonalPrompt) => void;
  saveEditingPersonalPrompt: () => Promise<void>;
  cancelEditingPersonalPrompt: () => void;

  // Styling state
  promptStyles: Record<string, string>;
  editingStylePromptId: string | null;
  styleDraft: string;
  setStyleDraft: (val: string) => void;
  openStyleEditor: (prompt: PersonalPrompt) => void;
  saveStylePrompt: (id: string) => Promise<void>;
  closeStyleEditor: () => void;

  // Memory Palace
  selectedPromptId: string | null;
  setSelectedPromptId: (id: string | null) => void;

  // Drag & Drop
  draggingPersonalId: string | null;
  draggingPersonalCategory: string | null;
  dragOverPersonalId: string | null;
  handlePersonalDragStart: (e: React.DragEvent<HTMLElement>, prompt: PersonalPrompt) => void;
  handlePersonalDragOver: (e: React.DragEvent<HTMLElement>, prompt: PersonalPrompt) => void;
  handlePersonalDragEnd: () => void;
  handlePersonalDrop: (e: React.DragEvent<HTMLElement>, prompt: PersonalPrompt) => void;
  handlePersonalDropToEnd: (e: React.DragEvent<HTMLElement>, category: string) => void;
}

const LibraryUICtx = createContext<LibraryUIContextType | undefined>(undefined);

const PERSONAL_DEFAULT_CATEGORY = "כללי";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface LibraryUIProviderProps {
  children: ReactNode;
  user: User | null;
}

export function LibraryUIProvider({ children, user }: LibraryUIProviderProps) {
  // Consume sibling contexts
  const data = useLibraryData();
  const { favoriteLibraryIds } = useFavoritesContext();

  // --- View / Filter / Sort State ---
  const [viewMode, setViewMode] = useState<"home" | "library" | "personal">("home");
  const [libraryView, setLibraryView] = useState<"all" | "favorites">("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [personalQuery, setPersonalQuery] = useState("");
  const [personalSort, setPersonalSort] = useState<
    "recent" | "title" | "usage" | "custom" | "last_used" | "performance"
  >("recent");
  const [librarySort, setLibrarySort] = useState<"popularity" | "title" | "newest" | "rating">(
    "popularity",
  );
  const [personalView, setPersonalView] = useState<"all" | "favorites">("all");

  // Capability filters
  const [selectedCapabilityFilter, setSelectedCapabilityFilter] = useState<CapabilityMode | null>(
    null,
  );
  const [favoritesCapabilityFilter, setFavoritesCapabilityFilter] = useState<CapabilityMode | null>(
    null,
  );

  // Memory Palace
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // Category management UI state
  const [newPersonalCategory, setNewPersonalCategory] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryInput, setRenameCategoryInput] = useState("");

  // --- Derived State (Filtering) ---
  const filteredLibrary = useMemo(() => {
    let result = data.libraryPrompts;
    if (libraryView === "favorites") {
      result = result.filter((p) => favoriteLibraryIds.has(p.id));
    }
    if (selectedCapabilityFilter) {
      result = result.filter(
        (filtered) =>
          (filtered.capability_mode ?? CapabilityMode.STANDARD) === selectedCapabilityFilter,
      );
    }
    const query = libraryQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((prompt) => {
        const searchText = [prompt.title, prompt.use_case, prompt.category, prompt.prompt].join(
          " ",
        );
        return hebrewFuzzyMatch(searchText, query);
      });
    }
    return result;
  }, [
    libraryQuery,
    selectedCapabilityFilter,
    data.libraryPrompts,
    libraryView,
    favoriteLibraryIds,
  ]);

  const libraryFavorites = useMemo(() => {
    let result = data.libraryPrompts.filter((p: LibraryPrompt) => favoriteLibraryIds.has(p.id));
    if (favoritesCapabilityFilter) {
      result = result.filter(
        (p) => (p.capability_mode ?? CapabilityMode.STANDARD) === favoritesCapabilityFilter,
      );
    }
    return result;
  }, [favoriteLibraryIds, favoritesCapabilityFilter, data.libraryPrompts]);

  const filteredPersonalLibrary = useMemo(() => {
    let result = [...data.personalLibrary];
    const query = personalQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((p) => {
        const searchText = [p.title, p.prompt, p.use_case, p.personal_category, ...(p.tags || [])]
          .filter(Boolean)
          .join(" ");
        return hebrewFuzzyMatch(searchText, query);
      });
    }
    return result;
  }, [data.personalLibrary, personalQuery]);

  // --- Category Rename ---
  const startRenameCategory = useCallback((category: string) => {
    setRenamingCategory(category);
    setRenameCategoryInput(category);
  }, []);

  const cancelRenameCategory = useCallback(() => {
    setRenamingCategory(null);
    setRenameCategoryInput("");
  }, []);

  const saveRenameCategory = useCallback(async () => {
    if (!renamingCategory || !renameCategoryInput.trim()) return;
    if (renameCategoryInput.trim() === renamingCategory) {
      setRenamingCategory(null);
      setRenameCategoryInput("");
      return;
    }
    await data.saveRenameCategory(renamingCategory, renameCategoryInput.trim());
    setRenamingCategory(null);
    setRenameCategoryInput("");
  }, [renamingCategory, renameCategoryInput, data]);

  // Wrapped add category using newPersonalCategory state
  const addPersonalCategoryWrapped = useCallback(async () => {
    if (!newPersonalCategory.trim()) return;
    await data.addPersonalCategory(newPersonalCategory.trim());
    setNewPersonalCategory("");
  }, [newPersonalCategory, data]);

  // --- Drag & Drop ---
  const dragAndDrop = useDragAndDrop({
    personalLibrary: data.personalLibrary,
    reorderPrompts: data._reorderPrompts,
    movePrompt: data._movePrompt,
    renamingCategory,
    cancelRenameCategory: () => setRenamingCategory(null),
    setPersonalSort,
    PERSONAL_DEFAULT_CATEGORY,
  });

  // --- Editing State ---
  const [editingPersonalId, setEditingPersonalId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingUseCase, setEditingUseCase] = useState("");

  const startEditingPersonalPrompt = useCallback((prompt: PersonalPrompt) => {
    setEditingPersonalId(prompt.id);
    setEditingTitle(prompt.title);
    setEditingUseCase(prompt.use_case);
  }, []);

  const cancelEditingPersonalPrompt = useCallback(() => {
    setEditingPersonalId(null);
    setEditingTitle("");
    setEditingUseCase("");
  }, []);

  const saveEditingPersonalPrompt = useCallback(async () => {
    if (!editingPersonalId) return;
    try {
      await data.updatePrompt(editingPersonalId, {
        title: editingTitle,
        use_case: editingUseCase,
      });
      toast.success("הפרומפט עודכן");
      setEditingPersonalId(null);
      setEditingTitle("");
      setEditingUseCase("");
    } catch (e) {
      console.error("Failed to update prompt:", e);
      toast.error("שגיאה בעדכון הפרומפט");
    }
  }, [editingPersonalId, editingTitle, editingUseCase, data]);

  // --- Styling State ---
  const [promptStyles, setPromptStyles] = useState<Record<string, string>>({});
  const [editingStylePromptId, setEditingStylePromptId] = useState<string | null>(null);
  const [styleDraft, setStyleDraft] = useState("");

  const STYLE_STORAGE_KEY = "peroot_prompt_styles_v1";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = user?.id ? `${STYLE_STORAGE_KEY}_${user.id}` : STYLE_STORAGE_KEY;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        queueMicrotask(() => setPromptStyles(JSON.parse(stored)));
      } else {
        queueMicrotask(() => setPromptStyles({}));
      }
    } catch (e) {
      logger.warn(e);
    }
  }, [user]);

  // Sync styles from personal library if available
  useEffect(() => {
    if (data.personalLibrary.length > 0) {
      const next: Record<string, string> = {};
      data.personalLibrary.forEach((p) => {
        if (p.prompt_style) next[p.id] = p.prompt_style;
      });
      if (Object.keys(next).length > 0) {
        queueMicrotask(() => setPromptStyles((prev) => ({ ...prev, ...next })));
      }
    }
  }, [data.personalLibrary]);

  const openStyleEditor = useCallback(
    (prompt: PersonalPrompt) => {
      setEditingStylePromptId(prompt.id);
      setStyleDraft(promptStyles[prompt.id] || prompt.prompt);
    },
    [promptStyles],
  );

  const closeStyleEditor = useCallback(() => {
    setEditingStylePromptId(null);
    setStyleDraft("");
  }, []);

  const saveStylePrompt = useCallback(
    async (id: string) => {
      try {
        setPromptStyles((prev) => {
          const next = { ...prev, [id]: styleDraft };
          const key = user?.id ? `${STYLE_STORAGE_KEY}_${user.id}` : STYLE_STORAGE_KEY;
          localStorage.setItem(key, JSON.stringify(next));
          return next;
        });

        const prompt = data.personalLibrary.find((p) => p.id === id);
        if (prompt) {
          await data._updatePromptContent(id, prompt.prompt, styleDraft);
        }

        toast.success("עיצוב נשמר");
        setEditingStylePromptId(null);
        setStyleDraft("");
      } catch (e) {
        console.error("Failed to save style:", e);
        toast.error("שגיאה בשמירת עיצוב");
      }
    },
    [styleDraft, user, data],
  );

  // --- Style Editor helpers (relocated from PersonalLibraryView) ---
  const [styleEditorExpanded, setStyleEditorExpanded] = useState(false);
  const styleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyStyleToken = useCallback((prefix: string, value: string) => {
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
  }, []);

  const clearStyleTokens = useCallback(() => {
    setStyleDraft(stripStyleTokens(styleDraft));
  }, [styleDraft]);

  const insertTextAtCursor = useCallback(
    (text: string) => {
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
    },
    [styleDraft],
  );

  const styleEditorValue = useMemo<StyleEditorContextType>(
    () => ({
      styleEditorExpanded,
      setStyleEditorExpanded,
      styleTextareaRef,
      applyStyleToken,
      clearStyleTokens,
      insertTextAtCursor,
      quickInserts: QUICK_INSERTS,
    }),
    [styleEditorExpanded, applyStyleToken, clearStyleTokens, insertTextAtCursor],
  );

  // --- Value ---
  const value = useMemo<LibraryUIContextType>(
    () => ({
      user,
      viewMode,
      setViewMode,
      libraryView,
      setLibraryView,
      personalView,
      setPersonalView,
      libraryQuery,
      setLibraryQuery,
      personalQuery,
      setPersonalQuery,
      personalSort,
      setPersonalSort,
      librarySort,
      setLibrarySort,
      filteredLibrary,
      filteredPersonalLibrary,
      libraryFavorites,
      selectedCapabilityFilter,
      setSelectedCapabilityFilter,
      favoritesCapabilityFilter,
      setFavoritesCapabilityFilter,
      newPersonalCategory,
      setNewPersonalCategory,
      renamingCategory,
      setRenamingCategory,
      renameCategoryInput,
      setRenameCategoryInput,
      startRenameCategory,
      cancelRenameCategory,
      saveRenameCategory,
      addPersonalCategory: addPersonalCategoryWrapped,
      editingPersonalId,
      editingTitle,
      setEditingTitle,
      editingUseCase,
      setEditingUseCase,
      startEditingPersonalPrompt,
      saveEditingPersonalPrompt,
      cancelEditingPersonalPrompt,
      promptStyles,
      editingStylePromptId,
      styleDraft,
      setStyleDraft,
      openStyleEditor,
      saveStylePrompt,
      closeStyleEditor,
      selectedPromptId,
      setSelectedPromptId,
      ...dragAndDrop,
    }),
    [
      user,
      viewMode,
      libraryView,
      personalView,
      libraryQuery,
      personalQuery,
      personalSort,
      librarySort,
      filteredLibrary,
      filteredPersonalLibrary,
      libraryFavorites,
      selectedCapabilityFilter,
      favoritesCapabilityFilter,
      newPersonalCategory,
      renamingCategory,
      renameCategoryInput,
      startRenameCategory,
      cancelRenameCategory,
      saveRenameCategory,
      addPersonalCategoryWrapped,
      editingPersonalId,
      editingTitle,
      editingUseCase,
      startEditingPersonalPrompt,
      saveEditingPersonalPrompt,
      cancelEditingPersonalPrompt,
      promptStyles,
      editingStylePromptId,
      styleDraft,
      openStyleEditor,
      saveStylePrompt,
      closeStyleEditor,
      selectedPromptId,
      dragAndDrop,
    ],
  );

  return (
    <LibraryUICtx.Provider value={value}>
      <StyleEditorCtx.Provider value={styleEditorValue}>{children}</StyleEditorCtx.Provider>
    </LibraryUICtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLibraryUI() {
  const context = useContext(LibraryUICtx);
  if (!context) {
    throw new Error("useLibraryUI must be used within a LibraryUIProvider");
  }
  return context;
}
