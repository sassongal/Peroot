"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { CapabilityMode } from "@/lib/capability-mode";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LibraryDataContextType {
  // Library prompts (public/shared)
  libraryPrompts: LibraryPrompt[];
  isLibraryFetching: boolean;

  // Personal library data
  personalLibrary: PersonalPrompt[];
  personalCategories: string[];
  isPersonalLoaded: boolean;

  // Popularity
  popularityMap: Record<string, number>;

  // Pagination
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

  // Capability counts
  libraryCapabilityCounts: Record<CapabilityMode, number>;
  personalCapabilityCounts: Record<CapabilityMode, number>;

  // CRUD Actions
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

  // Category management (data operations)
  addPersonalCategory: (name: string) => Promise<void>;
  deletePersonalCategory: (categoryName: string, mode?: 'move' | 'delete') => Promise<void>;
  saveRenameCategory: (oldName: string, newName: string) => Promise<void>;

  // Internal: exposed for UIContext to call
  _reorderPrompts: (category: string, orderedIds: string[]) => Promise<void>;
  _movePrompt: (id: string, targetCategory: string, targetIndex?: number) => Promise<void>;
  _updatePromptContent: (id: string, prompt: string, prompt_style?: string) => Promise<void>;
}

const LibraryDataContext = createContext<LibraryDataContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface LibraryDataProviderProps {
  children: ReactNode;
  user: User | null;
  showLoginRequired: (feature: string) => void;
}

export function LibraryDataProvider({ children, user, showLoginRequired }: LibraryDataProviderProps) {
  // --- Library prompts (public) ---
  const [libraryPrompts, setLibraryPrompts] = useState<LibraryPrompt[]>([]);
  const [isLibraryFetching, setIsLibraryFetching] = useState(true);

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

  // --- useLibrary hook ---
  const {
    personalLibrary,
    personalCategories,
    isLoaded: isPersonalLoaded,
    page, pageSize, totalCount, folderCounts, isPageLoading,
    activeFolder, sortBy, searchQuery,
    setPage, setActiveFolder, setSortBy, setSearchQuery,
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
    deleteCategory,
    deletePrompts,
    movePrompts,
    addPrompts,
    updateTags,
    updateProfile,
    completeOnboarding
  } = useLibrary();

  // --- Capability Counts ---
  const libraryCapabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(CapabilityMode).forEach(mode => counts[mode] = 0);
    libraryPrompts.forEach((p: LibraryPrompt) => {
      const mode = p.capability_mode ?? CapabilityMode.STANDARD;
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return counts as Record<CapabilityMode, number>;
  }, [libraryPrompts]);

  const personalCapabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(CapabilityMode).forEach(mode => counts[mode] = 0);
    personalLibrary.forEach((p: PersonalPrompt) => {
      const mode = p.capability_mode ?? CapabilityMode.STANDARD;
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return counts as Record<CapabilityMode, number>;
  }, [personalLibrary]);

  // --- Duplicate ---
  const duplicatePrompt = useCallback(async (prompt: PersonalPrompt) => {
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
  }, [addPrompt]);

  // --- Category Actions (wrapped with auth + toast) ---
  const addPersonalCategory = useCallback(async (name?: string) => {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return;
    try {
      if (!user) {
        showLoginRequired("יצירת קטגוריה");
        return;
      }
      await addLibCategory(trimmed);
      toast.success("קטגוריה נוצרה");
    } catch (e) {
      console.error("Failed to create category:", e);
      toast.error("שגיאה ביצירת קטגוריה");
    }
  }, [user, showLoginRequired, addLibCategory]);

  const deletePersonalCategory = useCallback(async (categoryName: string, mode: 'move' | 'delete' = 'move') => {
    try {
      if (!user) {
        showLoginRequired("מחיקת קטגוריה");
        return;
      }
      await deleteCategory(categoryName, mode);
      toast.success(mode === 'delete' ? "התיקייה והפרומפטים נמחקו" : "התיקייה נמחקה, הפרומפטים הועברו לכללי");
    } catch (e) {
      console.error("Failed to delete category:", e);
      toast.error("שגיאה במחיקת קטגוריה");
    }
  }, [user, showLoginRequired, deleteCategory]);

  const saveRenameCategoryWrapped = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!oldName || !trimmed) return;
    if (trimmed === oldName) return;
    try {
      await renameCategory(oldName, trimmed);
      toast.success("הקטגוריה עודכנה");
    } catch (e) {
      console.error("Failed to rename category:", e);
      toast.error("שגיאה בעדכון הקטגוריה");
    }
  }, [renameCategory]);

  // --- Value ---
  const value = useMemo<LibraryDataContextType>(() => ({
    libraryPrompts,
    isLibraryFetching,
    personalLibrary,
    personalCategories,
    isPersonalLoaded,
    popularityMap,
    page, pageSize, totalCount, folderCounts, isPageLoading,
    activeFolder, searchQuery, sortBy,
    setPage, setActiveFolder, setSearchQuery, setSortBy,
    libraryCapabilityCounts,
    personalCapabilityCounts,
    addPrompt, removePrompt, updatePrompt, duplicatePrompt,
    incrementUseCount, togglePin, ratePrompt,
    addPrompts, deletePrompts, movePrompts, updateTags,
    updateProfile, completeOnboarding,
    addPersonalCategory, deletePersonalCategory,
    saveRenameCategory: saveRenameCategoryWrapped,
    _reorderPrompts: reorderPrompts,
    _movePrompt: movePrompt,
    _updatePromptContent: updatePromptContent,
  }), [
    libraryPrompts, isLibraryFetching,
    personalLibrary, personalCategories, isPersonalLoaded,
    popularityMap,
    page, pageSize, totalCount, folderCounts, isPageLoading,
    activeFolder, searchQuery, sortBy,
    setPage, setActiveFolder, setSearchQuery, setSortBy,
    libraryCapabilityCounts, personalCapabilityCounts,
    addPrompt, removePrompt, updatePrompt, duplicatePrompt,
    incrementUseCount, togglePin, ratePrompt,
    addPrompts, deletePrompts, movePrompts, updateTags,
    updateProfile, completeOnboarding,
    addPersonalCategory, deletePersonalCategory,
    saveRenameCategoryWrapped,
    reorderPrompts, movePrompt, updatePromptContent,
  ]);

  return (
    <LibraryDataContext.Provider value={value}>
      {children}
    </LibraryDataContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLibraryData() {
  const context = useContext(LibraryDataContext);
  if (!context) {
    throw new Error("useLibraryData must be used within a LibraryDataProvider");
  }
  return context;
}
