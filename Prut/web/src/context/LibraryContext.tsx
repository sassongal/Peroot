"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import promptsData from "../../prompts.he.json";
import type { User } from "@supabase/supabase-js";
import { CapabilityMode } from "@/lib/capability-mode";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

// Define the shape of our context
interface LibraryContextType {
  // State
  viewMode: "home" | "library" | "personal";
  setViewMode: (mode: "home" | "library" | "personal") => void;

  libraryView: "all" | "favorites";
  setLibraryView: (view: "all" | "favorites") => void;

  libraryQuery: string;
  setLibraryQuery: (q: string) => void;
  filteredLibrary: LibraryPrompt[];
  libraryPrompts: LibraryPrompt[];

  personalQuery: string;
  setPersonalQuery: (q: string) => void;

  personalSort: "recent" | "title" | "usage" | "custom" | "last_used" | "performance";
  setPersonalSort: (sort: "recent" | "title" | "usage" | "custom" | "last_used" | "performance") => void;
  librarySort: "popularity" | "title" | "newest" | "rating";
  setLibrarySort: (sort: "popularity" | "title" | "newest" | "rating") => void;

  personalView: "all" | "favorites";
  setPersonalView: (view: "all" | "favorites") => void;

  filteredPersonalLibrary: PersonalPrompt[];
  libraryFavorites: LibraryPrompt[];

  // Data
  personalLibrary: PersonalPrompt[];
  personalCategories: string[];

  // Favorites
  favoriteLibraryIds: Set<string>;
  favoritePersonalIds: Set<string>;
  handleToggleFavorite: (type: "library" | "personal", itemId: string) => Promise<void>;

  // Popularity
  popularityMap: Record<string, number>;

  // Actions
  addPrompt: (prompt: Omit<PersonalPrompt, "id" | "created_at" | "updated_at" | "use_count">, category?: string) => Promise<void>;
  removePrompt: (id: string) => Promise<void>;
  updatePrompt: (id: string, updates: Partial<PersonalPrompt>) => Promise<void>;
  duplicatePrompt: (prompt: PersonalPrompt) => Promise<void>;
  incrementUseCount: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  ratePrompt: (id: string, success: boolean) => Promise<void>;

  // Batch Actions
  addPrompts: (prompts: Omit<PersonalPrompt, "id" | "created_at" | "updated_at" | "use_count">[]) => Promise<void>;
  deletePrompts: (ids: string[]) => Promise<void>;
  movePrompts: (ids: string[], category: string) => Promise<void>;
  updateTags: (id: string, tags: string[]) => Promise<void>;
  updateProfile: (updates: {
    onboarding_completed?: boolean;
    plan_tier?: 'free' | 'pro';
    credits_balance?: number;
  }) => Promise<void>;
  completeOnboarding: () => Promise<boolean | undefined>;

  // Categories
  newPersonalCategory: string;
  setNewPersonalCategory: (cat: string) => void;
  renamingCategory: string | null;
  setRenamingCategory: (cat: string | null) => void;
  renameCategoryInput: string;
  setRenameCategoryInput: (val: string) => void;
  addPersonalCategory: () => Promise<void>;
  startRenameCategory: (category: string) => void;
  cancelRenameCategory: () => void;
  saveRenameCategory: () => Promise<void>;

  // Editing
  editingPersonalId: string | null;
  editingTitle: string;
  setEditingTitle: (val: string) => void;
  editingUseCase: string;
  setEditingUseCase: (val: string) => void;
  startEditingPersonalPrompt: (prompt: PersonalPrompt) => void;
  saveEditingPersonalPrompt: () => Promise<void>;
  cancelEditingPersonalPrompt: () => void;

  // Styling
  promptStyles: Record<string, string>;
  editingStylePromptId: string | null;
  styleDraft: string;
  setStyleDraft: (val: string) => void;
  openStyleEditor: (prompt: PersonalPrompt) => void;
  saveStylePrompt: (id: string) => Promise<void>;
  closeStyleEditor: () => void;

  // Drag & Drop
  draggingPersonalId: string | null;
  draggingPersonalCategory: string | null;
  dragOverPersonalId: string | null;
  handlePersonalDragStart: (e: React.DragEvent<HTMLElement>, prompt: PersonalPrompt) => void;
  handlePersonalDragOver: (e: React.DragEvent<HTMLElement>, prompt: PersonalPrompt) => void;
  handlePersonalDragEnd: () => void;
  handlePersonalDrop: (e: React.DragEvent<HTMLElement>, prompt: PersonalPrompt) => void;
  handlePersonalDropToEnd: (e: React.DragEvent<HTMLElement>, category: string) => void;

  // Capability Filtering
  selectedCapabilityFilter: CapabilityMode | null;
  setSelectedCapabilityFilter: (mode: CapabilityMode | null) => void;
  favoritesCapabilityFilter: CapabilityMode | null;
  setFavoritesCapabilityFilter: (mode: CapabilityMode | null) => void;

  // Counts
  libraryCapabilityCounts: Record<CapabilityMode, number>;
  personalCapabilityCounts: Record<CapabilityMode, number>;

  // Loading state
  isPersonalLoaded: boolean;
  isLibraryFetching: boolean;

  // Pagination (NEW)
  page: number;
  pageSize: number;
  totalCount: number;
  folderCounts: Record<string, number>;
  isPageLoading: boolean;
  activeFolder: string | null;
  searchQuery: string;
  sortBy: string;
  setPage: (page: number) => void;
  setActiveFolder: (folder: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const PERSONAL_DEFAULT_CATEGORY = "כללי";

// Initial fallback data from JSON
const fallbackLibraryPrompts = (Array.isArray(promptsData)
  ? promptsData
  : (promptsData as { prompts?: LibraryPrompt[] }).prompts || []) as unknown as LibraryPrompt[];

export function LibraryProvider({ children, user, showLoginRequired }: { children: ReactNode, user: User | null, showLoginRequired: (feature: string) => void }) {
  // --- Local UI State ---
  const [viewMode, setViewMode] = useState<"home" | "library" | "personal">("home");
  const [libraryView, setLibraryView] = useState<"all" | "favorites">("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [personalQuery, setPersonalQuery] = useState("");
  const [personalSort, setPersonalSort] = useState<"recent" | "title" | "usage" | "custom" | "last_used" | "performance">("recent");
  const [librarySort, setLibrarySort] = useState<"popularity" | "title" | "newest" | "rating">("popularity");
  const [personalView, setPersonalView] = useState<"all" | "favorites">("all");

  // Category management UI state
  const [newPersonalCategory, setNewPersonalCategory] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryInput, setRenameCategoryInput] = useState("");

  // Capability Filter State
  const [selectedCapabilityFilter, setSelectedCapabilityFilter] = useState<CapabilityMode | null>(null);
  const [favoritesCapabilityFilter, setFavoritesCapabilityFilter] = useState<CapabilityMode | null>(null);

  // Dynamic Data State
  const [libraryPrompts, setLibraryPrompts] = useState<LibraryPrompt[]>(fallbackLibraryPrompts);
  const [isLibraryFetching, setIsLibraryFetching] = useState(true);

  // --- Effects ---
  useEffect(() => {
    const fetchPublicData = async () => {
        try {
            const [pRes, cRes] = await Promise.all([
                fetch(getApiPath("/api/library/prompts")),
                fetch(getApiPath("/api/library/categories"))
            ]);

            if (pRes.ok) {
                const pData = await pRes.json();
                if (pData.length > 0) setLibraryPrompts(pData);
            }
            if (cRes.ok) {
                await cRes.json();
            }
        } catch (e) {
            logger.warn("Library synchronization paused:", e);
        } finally {
            setIsLibraryFetching(false);
        }
    };
    fetchPublicData();
  }, []);

  // --- Hooks ---
  const {
    personalLibrary,
    personalCategories,
    isLoaded: isPersonalLoaded,
    // Pagination
    page,
    pageSize,
    totalCount,
    folderCounts,
    isPageLoading,
    activeFolder,
    sortBy,
    searchQuery,
    // Navigation
    setPage,
    setActiveFolder,
    setSortBy,
    setSearchQuery,
    // Mutations
    addPrompt,
    removePrompt,
    incrementUseCount,
    togglePin,
    ratePrompt,
    updatePrompt,
    updatePromptContent,
    reorderPrompts,
    movePrompt,
    renameCategory,
    addCategory: addLibCategory,
    deletePrompts,
    movePrompts,
    addPrompts,
    updateTags,
    updateProfile,
    completeOnboarding
  } = useLibrary();

  const { favoriteLibraryIds, favoritePersonalIds, toggleFavorite: toggleFavoriteBase } = useFavorites();

  // --- Favorites Handler ---
  const handleToggleFavorite = async (itemType: "library" | "personal", itemId: string) => {
    if (!user) {
      showLoginRequired("הוספה למועדפים");
      return;
    }
    await toggleFavoriteBase(itemType, itemId);
  };

  // --- Drag & Drop ---
  const dragAndDrop = useDragAndDrop({
    personalLibrary,
    reorderPrompts,
    movePrompt,
    renamingCategory,
    cancelRenameCategory: () => setRenamingCategory(null),
    setPersonalSort,
    PERSONAL_DEFAULT_CATEGORY
  });

  // --- Derived State (Filtering) ---
  const filteredLibrary = useMemo(() => {
    let result = libraryPrompts;

    if (libraryView === "favorites") {
        result = result.filter(p => favoriteLibraryIds.has(p.id));
    }

    if (selectedCapabilityFilter) {
      result = result.filter(filtered =>
        (filtered.capability_mode ?? CapabilityMode.STANDARD) === selectedCapabilityFilter
      );
    }

    const query = libraryQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(prompt =>
        [prompt.title, prompt.use_case, prompt.category, prompt.prompt]
          .join(" ").toLowerCase().includes(query)
      );
    }
    return result;
  }, [libraryQuery, selectedCapabilityFilter, libraryPrompts, libraryView, favoriteLibraryIds]);

  const libraryFavorites = useMemo(() => {
    let result = libraryPrompts.filter((p: LibraryPrompt) => favoriteLibraryIds.has(p.id));

    if (favoritesCapabilityFilter) {
      result = result.filter(p =>
        (p.capability_mode ?? CapabilityMode.STANDARD) === favoritesCapabilityFilter
      );
    }
    return result;
  }, [favoriteLibraryIds, favoritesCapabilityFilter, libraryPrompts]);

  // Compute Capability Counts for Library
  const libraryCapabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(CapabilityMode).forEach(mode => counts[mode] = 0);

    libraryPrompts.forEach((p: LibraryPrompt) => {
      const mode = p.capability_mode ?? CapabilityMode.STANDARD;
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return counts as Record<CapabilityMode, number>;
  }, [libraryPrompts]);

  // Personal library items are now pre-filtered/sorted/paginated by useLibrary.
  // filteredPersonalLibrary is kept for backward compatibility — it's the current page items
  // with any client-side favorites filtering applied on top.
  const filteredPersonalLibrary = useMemo(() => {
    let result = [...personalLibrary];

    // Apply favorites filter client-side if viewing favorites
    if (personalView === "favorites") {
        result = result.filter(p => favoritePersonalIds.has(p.id));
    }

    // Client-side text filter for legacy personalQuery (if used directly instead of searchQuery)
    const query = personalQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(p => {
        return (
          p.title?.toLowerCase().includes(query) ||
          p.prompt?.toLowerCase().includes(query) ||
          p.use_case?.toLowerCase().includes(query) ||
          p.personal_category?.toLowerCase().includes(query) ||
          (p.tags || []).some(tag => tag.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [personalLibrary, personalQuery, personalView, favoritePersonalIds]);

  // Compute Capability Counts for Personal
  const personalCapabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(CapabilityMode).forEach(mode => counts[mode] = 0);

    const baseSet = personalView === "favorites"
        ? personalLibrary.filter(p => favoritePersonalIds.has(p.id))
        : personalLibrary;

    baseSet.forEach((p: PersonalPrompt) => {
      const mode = p.capability_mode ?? CapabilityMode.STANDARD;
      counts[mode] = (counts[mode] || 0) + 1;
    });

    return counts as Record<CapabilityMode, number>;
  }, [personalLibrary, personalView, favoritePersonalIds]);


  // --- Category Actions ---
  const addPersonalCategory = async () => {
    if (!newPersonalCategory.trim()) return;
    try {
      if (!user) {
        showLoginRequired("יצירת קטגוריה");
        return;
      }
      await addLibCategory(newPersonalCategory.trim());
      setNewPersonalCategory("");
      toast.success("קטגוריה נוצרה");
    } catch {
      toast.error("שגיאה ביצירת קטגוריה");
    }
  };

  const startRenameCategory = (category: string) => {
    setRenamingCategory(category);
    setRenameCategoryInput(category);
  };

  const cancelRenameCategory = () => {
    setRenamingCategory(null);
    setRenameCategoryInput("");
  };

  const saveRenameCategory = async () => {
    if (!renamingCategory || !renameCategoryInput.trim()) return;
    if (renameCategoryInput.trim() === renamingCategory) {
      cancelRenameCategory();
      return;
    }
    try {
        await renameCategory(renamingCategory, renameCategoryInput.trim());
        toast.success("הקטגוריה עודכנה");
        cancelRenameCategory();
    } catch {
        toast.error("שגיאה בעדכון הקטגוריה");
    }
  };

  // --- Popularity ---
  const [popularityMap, setPopularityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const loadPopularity = async () => {
      try {
        const response = await fetch(getApiPath("/api/library-popularity"), { next: { revalidate: 60 } });
        if (!response.ok) throw new Error(`Failed to load popularity: ${response.status}`);
        const data = await response.json();
        if (!data?.popularity) return;

        if (isMounted) {
          setPopularityMap((prev) => ({ ...prev, ...data.popularity }));
        }
      } catch (error) {
        logger.warn("Failed to load popularity map", error);
      }
    };
    loadPopularity();
    return () => { isMounted = false; };
  }, []);

  // --- Editing State ---
  const [editingPersonalId, setEditingPersonalId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingUseCase, setEditingUseCase] = useState("");

  const startEditingPersonalPrompt = (prompt: PersonalPrompt) => {
    setEditingPersonalId(prompt.id);
    setEditingTitle(prompt.title);
    setEditingUseCase(prompt.use_case);
  };

  const cancelEditingPersonalPrompt = () => {
    setEditingPersonalId(null);
    setEditingTitle("");
    setEditingUseCase("");
  };

  const saveEditingPersonalPrompt = async () => {
    if (!editingPersonalId) return;
    try {
      await updatePrompt(editingPersonalId, {
        title: editingTitle,
        use_case: editingUseCase
      });
      toast.success("הפרומפט עודכן");
      cancelEditingPersonalPrompt();
    } catch {
      toast.error("שגיאה בעדכון הפרומפט");
    }
  };

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
        setPromptStyles(JSON.parse(stored));
      } else {
        setPromptStyles({});
      }
    } catch (e) { logger.warn(e); }
  }, [user]);

  // Sync styles from personal library if available
  useEffect(() => {
    if (personalLibrary.length > 0) {
        const next: Record<string, string> = {};
        personalLibrary.forEach(p => {
            if (p.prompt_style) next[p.id] = p.prompt_style;
        });
        if (Object.keys(next).length > 0) {
            setPromptStyles(prev => ({...prev, ...next}));
        }
    }
  }, [personalLibrary]);

  const openStyleEditor = (prompt: PersonalPrompt) => {
    setEditingStylePromptId(prompt.id);
    setStyleDraft(promptStyles[prompt.id] || prompt.prompt);
  };

  const closeStyleEditor = () => {
    setEditingStylePromptId(null);
    setStyleDraft("");
  };

  const saveStylePrompt = async (id: string) => {
    try {
        setPromptStyles(prev => {
            const next = { ...prev, [id]: styleDraft };
            const key = user?.id ? `${STYLE_STORAGE_KEY}_${user.id}` : STYLE_STORAGE_KEY;
            localStorage.setItem(key, JSON.stringify(next));
            return next;
        });

        const prompt = personalLibrary.find(p => p.id === id);
        if (prompt) {
             await updatePromptContent(id, prompt.prompt, styleDraft);
        }

        toast.success("עיצוב נשמר");
        closeStyleEditor();
    } catch {
        toast.error("שגיאה בשמירת עיצוב");
    }
  };

  const duplicatePrompt = async (prompt: PersonalPrompt) => {
    await addPrompt({
      title: `${prompt.title} (עותק)`,
      prompt: prompt.prompt,
      category: prompt.category,
      personal_category: prompt.personal_category,
      use_case: prompt.use_case,
      source: "manual",
      prompt_style: prompt.prompt_style,
      tags: prompt.tags || [],
      capability_mode: prompt.capability_mode,
    });
  };

  const value = useMemo(() => ({
    viewMode, setViewMode,
    libraryView, setLibraryView,
    libraryQuery, setLibraryQuery, filteredLibrary, libraryPrompts,
    personalQuery, setPersonalQuery,
    personalSort, setPersonalSort,
    librarySort, setLibrarySort,
    personalView, setPersonalView,
    filteredPersonalLibrary, libraryFavorites,
    personalLibrary, personalCategories,
    favoriteLibraryIds, favoritePersonalIds, handleToggleFavorite,
    popularityMap,
    addPrompt, removePrompt, updatePrompt, duplicatePrompt, incrementUseCount, togglePin, ratePrompt,
    deletePrompts, movePrompts, addPrompts, updateTags, updateProfile, completeOnboarding,
    newPersonalCategory, setNewPersonalCategory,
    renamingCategory, setRenamingCategory,
    renameCategoryInput, setRenameCategoryInput,
    addPersonalCategory, startRenameCategory, cancelRenameCategory, saveRenameCategory,
    editingPersonalId, editingTitle, setEditingTitle, editingUseCase, setEditingUseCase,
    startEditingPersonalPrompt, saveEditingPersonalPrompt, cancelEditingPersonalPrompt,
    promptStyles, editingStylePromptId, styleDraft, setStyleDraft,
    openStyleEditor, saveStylePrompt, closeStyleEditor,
    ...dragAndDrop,

    // Capability Filtering
    selectedCapabilityFilter, setSelectedCapabilityFilter,
    favoritesCapabilityFilter, setFavoritesCapabilityFilter,
    libraryCapabilityCounts, personalCapabilityCounts,

    // Loading state
    isPersonalLoaded,
    isLibraryFetching,

    // Pagination (NEW)
    page, pageSize, totalCount, folderCounts, isPageLoading,
    activeFolder, searchQuery, sortBy,
    setPage, setActiveFolder, setSearchQuery, setSortBy,
  }), [
    viewMode, libraryView, libraryQuery, filteredLibrary, libraryPrompts,
    personalQuery, personalSort, librarySort, personalView,
    filteredPersonalLibrary, libraryFavorites,
    personalLibrary, personalCategories,
    favoriteLibraryIds, favoritePersonalIds, handleToggleFavorite,
    popularityMap,
    addPrompt, removePrompt, updatePrompt, duplicatePrompt, incrementUseCount, togglePin, ratePrompt,
    deletePrompts, movePrompts, addPrompts, updateTags, updateProfile, completeOnboarding,
    newPersonalCategory, renamingCategory, renameCategoryInput,
    addPersonalCategory, startRenameCategory, cancelRenameCategory, saveRenameCategory,
    editingPersonalId, editingTitle, editingUseCase,
    startEditingPersonalPrompt, saveEditingPersonalPrompt, cancelEditingPersonalPrompt,
    promptStyles, editingStylePromptId, styleDraft,
    openStyleEditor, saveStylePrompt, closeStyleEditor,
    dragAndDrop,
    selectedCapabilityFilter, favoritesCapabilityFilter,
    libraryCapabilityCounts, personalCapabilityCounts,
    isPersonalLoaded, isLibraryFetching,
    // Pagination deps
    page, pageSize, totalCount, folderCounts, isPageLoading,
    activeFolder, searchQuery, sortBy,
    setPage, setActiveFolder, setSearchQuery, setSortBy,
  ]);

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibraryContext = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibraryContext must be used within a LibraryProvider");
  }
  return context;
};
