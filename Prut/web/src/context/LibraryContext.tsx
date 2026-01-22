"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import promptsData from "../../prompts.he.json";

// Define the shape of our context
interface LibraryContextType {
  // State
  viewMode: "home" | "library" | "personal";
  setViewMode: (mode: "home" | "library" | "personal") => void;
  
  libraryQuery: string;
  setLibraryQuery: (q: string) => void;
  filteredLibrary: LibraryPrompt[];
  
  personalQuery: string;
  setPersonalQuery: (q: string) => void;

  personalSort: "recent" | "title" | "usage" | "custom";
  setPersonalSort: (sort: "recent" | "title" | "usage" | "custom") => void;
  
  personalView: "all" | "favorites";
  setPersonalView: (view: "all" | "favorites") => void;
  
  filteredPersonalLibrary: PersonalPrompt[];
  libraryFavorites: LibraryPrompt[]; // Added
  
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
  addPrompt: (prompt: Omit<PersonalPrompt, "id" | "created_at" | "updated_at" | "use_count">) => Promise<void>;
  removePrompt: (id: string) => Promise<void>;
  updatePrompt: (id: string, updates: Partial<PersonalPrompt>) => Promise<void>;
  incrementUseCount: (id: string) => Promise<void>;
  
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
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const PERSONAL_DEFAULT_CATEGORY = "כללי";

// Fallback logic for promptsData if it's not matching expected type
// Fallback logic for promptsData if it's not matching expected type
const libraryPrompts = Array.isArray(promptsData) 
  ? promptsData 
  : (promptsData as any).prompts || [];

export function LibraryProvider({ children, user, showLoginRequired }: { children: ReactNode, user: any, showLoginRequired: (feature: string) => void }) {
  // --- Local UI State ---
  const [viewMode, setViewMode] = useState<"home" | "library" | "personal">("home");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [personalQuery, setPersonalQuery] = useState("");
  const [personalSort, setPersonalSort] = useState<"recent" | "title" | "usage" | "custom">("recent");
  const [personalView, setPersonalView] = useState<"all" | "favorites">("all");
  
  // Category management UI state
  const [newPersonalCategory, setNewPersonalCategory] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryInput, setRenameCategoryInput] = useState("");

  // --- Hooks ---
  const { 
    personalLibrary, 
    personalCategories, 
    addPrompt, 
    removePrompt, 
    updateCategory: updateItemCategory, 
    incrementUseCount,
    updatePrompt,
    updatePromptContent,
    reorderPrompts,
    movePrompt,
    renameCategory,
    addCategory: addLibCategory
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
    const query = libraryQuery.trim().toLowerCase();
    if (!query) return libraryPrompts;
    return libraryPrompts.filter((prompt: any) => 
      [prompt.title_he, prompt.use_case, prompt.category, prompt.prompt_he]
        .join(" ").toLowerCase().includes(query)
    );
  }, [libraryQuery]);

  const libraryFavorites = useMemo(() => {
      // Return all library prompts that are in favorites
      return libraryPrompts.filter((p: any) => favoriteLibraryIds.has(p.id));
  }, [favoriteLibraryIds]);

  const getUpdatedAt = (prompt: PersonalPrompt) => {
    if (typeof prompt.updated_at === "number") return prompt.updated_at;
    if (typeof prompt.updated_at === "string") {
      const parsed = Date.parse(prompt.updated_at);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getSortIndex = (prompt: PersonalPrompt) =>
    typeof prompt.sort_index === "number" ? prompt.sort_index : 0;

  const filteredPersonalLibrary = useMemo(() => {
    const query = personalQuery.trim().toLowerCase();
    let result = [...personalLibrary];
    
    // Filter by view type first
    if (personalView === "favorites") {
        result = result.filter(p => favoritePersonalIds.has(p.id));
    }
    
    if (query) {
      result = result.filter(p => 
        [p.title_he, p.prompt_he, p.use_case, p.personal_category]
          .join(" ").toLowerCase().includes(query)
      );
    }

    if (personalSort === "title") {
      result.sort((a, b) => a.title_he.localeCompare(b.title_he));
    } else if (personalSort === "usage") {
      result.sort((a, b) => {
        const diff = b.use_count - a.use_count;
        return diff !== 0 ? diff : getUpdatedAt(b) - getUpdatedAt(a);
      });
    } else if (personalSort === "custom") {
      result.sort((a, b) => {
        const diff = getSortIndex(a) - getSortIndex(b);
        return diff !== 0 ? diff : getUpdatedAt(b) - getUpdatedAt(a);
      });
    } else {
      result.sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a));
    }

    return result;
  }, [personalLibrary, personalQuery, personalSort, personalView, favoritePersonalIds]);

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
        const response = await fetch("/api/library-popularity", { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load popularity: ${response.status}`);
        const data = await response.json();
        if (!data?.popularity) return;

        if (isMounted) {
          setPopularityMap((prev) => ({ ...prev, ...data.popularity }));
        }
      } catch (error) {
        console.warn("Failed to load popularity map", error);
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
    setEditingTitle(prompt.title_he);
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
        title_he: editingTitle,
        use_case: editingUseCase
      });
      toast.success("הפרומפט עודכן");
      cancelEditingPersonalPrompt();
    } catch {
      toast.error("שגיאה בעדכון הפרומפט");
    }
  };

  // --- Styling State ---
  // We need to implement promptStyles loading/saving here as well, similar to page.tsx
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
    } catch (e) { console.warn(e); }
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
    setStyleDraft(promptStyles[prompt.id] || prompt.prompt_he); // Fallback to raw text if no style
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
        
        // Also update backend if user is logged in
        // We need to find the prompt to get its text
        const prompt = personalLibrary.find(p => p.id === id);
        if (prompt) {
             await updatePromptContent(id, prompt.prompt_he, styleDraft);
        }

        toast.success("עיצוב נשמר");
        closeStyleEditor();
    } catch {
        toast.error("שגיאה בשמירת עיצוב");
    }
  };

  const value = {
    viewMode, setViewMode,
    libraryQuery, setLibraryQuery, filteredLibrary,
    personalQuery, setPersonalQuery,
    personalSort, setPersonalSort,
    personalView, setPersonalView,
    filteredPersonalLibrary, libraryFavorites,
    personalLibrary, personalCategories,
    favoriteLibraryIds, favoritePersonalIds, handleToggleFavorite,
    popularityMap,
    addPrompt, removePrompt, updatePrompt, incrementUseCount,
    newPersonalCategory, setNewPersonalCategory,
    renamingCategory, setRenamingCategory,
    renameCategoryInput, setRenameCategoryInput,
    addPersonalCategory, startRenameCategory, cancelRenameCategory, saveRenameCategory,
    editingPersonalId, editingTitle, setEditingTitle, editingUseCase, setEditingUseCase,
    startEditingPersonalPrompt, saveEditingPersonalPrompt, cancelEditingPersonalPrompt,
    promptStyles, editingStylePromptId, styleDraft, setStyleDraft,
    openStyleEditor, saveStylePrompt, closeStyleEditor,
    ...dragAndDrop
  };

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
