"use client";

import React, { ReactNode, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { LibraryDataProvider, useLibraryData } from "./LibraryDataContext";
import { LibraryUIProvider, useLibraryUI } from "./LibraryUIContext";
import { FavoritesProvider, useFavoritesContext } from "./FavoritesContext";

// ---------------------------------------------------------------------------
// Composition Provider — renders all 3 sub-providers in the correct order.
// LibraryUIProvider must be nested inside LibraryDataProvider and
// FavoritesProvider because it reads from both.
// ---------------------------------------------------------------------------

export function LibraryProvider({
  children,
  user,
  showLoginRequired,
}: {
  children: ReactNode;
  user: User | null;
  showLoginRequired: (feature: string) => void;
}) {
  return (
    <LibraryDataProvider user={user} showLoginRequired={showLoginRequired}>
      <FavoritesProvider>
        <LibraryUIProvider user={user}>
          {children}
        </LibraryUIProvider>
      </FavoritesProvider>
    </LibraryDataProvider>
  );
}

// ---------------------------------------------------------------------------
// Backward-compatible hook — merges all 3 contexts into the shape that
// existing consumers expect.  New code should prefer the focused hooks.
// ---------------------------------------------------------------------------

export const useLibraryContext = () => {
  const data = useLibraryData();
  const ui = useLibraryUI();
  const favs = useFavoritesContext();

  // Memoize the merged object to keep reference stability when none of the
  // three underlying contexts have changed.
  return useMemo(() => ({
    // --- Data ---
    libraryPrompts: data.libraryPrompts,
    isLibraryFetching: data.isLibraryFetching,
    personalLibrary: data.personalLibrary,
    personalCategories: data.personalCategories,
    isPersonalLoaded: data.isPersonalLoaded,
    popularityMap: data.popularityMap,
    libraryCapabilityCounts: data.libraryCapabilityCounts,
    personalCapabilityCounts: data.personalCapabilityCounts,
    // Pagination
    page: data.page,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
    folderCounts: data.folderCounts,
    isPageLoading: data.isPageLoading,
    activeFolder: data.activeFolder,
    searchQuery: data.searchQuery,
    sortBy: data.sortBy,
    setPage: data.setPage,
    setActiveFolder: data.setActiveFolder,
    setSearchQuery: data.setSearchQuery,
    setSortBy: data.setSortBy,
    // CRUD
    addPrompt: data.addPrompt,
    removePrompt: data.removePrompt,
    updatePrompt: data.updatePrompt,
    duplicatePrompt: data.duplicatePrompt,
    incrementUseCount: data.incrementUseCount,
    togglePin: data.togglePin,
    ratePrompt: data.ratePrompt,
    bumpPersonalLibraryLastUsed: data.bumpPersonalLibraryLastUsed,
    addPrompts: data.addPrompts,
    deletePrompts: data.deletePrompts,
    movePrompts: data.movePrompts,
    updateTags: data.updateTags,
    updateProfile: data.updateProfile,
    completeOnboarding: data.completeOnboarding,
    deletePersonalCategory: data.deletePersonalCategory,

    // --- UI ---
    user: ui.user,
    viewMode: ui.viewMode,
    setViewMode: ui.setViewMode,
    libraryView: ui.libraryView,
    setLibraryView: ui.setLibraryView,
    personalView: ui.personalView,
    setPersonalView: ui.setPersonalView,
    libraryQuery: ui.libraryQuery,
    setLibraryQuery: ui.setLibraryQuery,
    personalQuery: ui.personalQuery,
    setPersonalQuery: ui.setPersonalQuery,
    personalSort: ui.personalSort,
    setPersonalSort: ui.setPersonalSort,
    librarySort: ui.librarySort,
    setLibrarySort: ui.setLibrarySort,
    filteredLibrary: ui.filteredLibrary,
    filteredPersonalLibrary: ui.filteredPersonalLibrary,
    libraryFavorites: ui.libraryFavorites,
    selectedCapabilityFilter: ui.selectedCapabilityFilter,
    setSelectedCapabilityFilter: ui.setSelectedCapabilityFilter,
    favoritesCapabilityFilter: ui.favoritesCapabilityFilter,
    setFavoritesCapabilityFilter: ui.setFavoritesCapabilityFilter,
    // Category rename UI
    newPersonalCategory: ui.newPersonalCategory,
    setNewPersonalCategory: ui.setNewPersonalCategory,
    renamingCategory: ui.renamingCategory,
    setRenamingCategory: ui.setRenamingCategory,
    renameCategoryInput: ui.renameCategoryInput,
    setRenameCategoryInput: ui.setRenameCategoryInput,
    addPersonalCategory: ui.addPersonalCategory,
    startRenameCategory: ui.startRenameCategory,
    cancelRenameCategory: ui.cancelRenameCategory,
    saveRenameCategory: ui.saveRenameCategory,
    // Editing
    editingPersonalId: ui.editingPersonalId,
    editingTitle: ui.editingTitle,
    setEditingTitle: ui.setEditingTitle,
    editingUseCase: ui.editingUseCase,
    setEditingUseCase: ui.setEditingUseCase,
    startEditingPersonalPrompt: ui.startEditingPersonalPrompt,
    saveEditingPersonalPrompt: ui.saveEditingPersonalPrompt,
    cancelEditingPersonalPrompt: ui.cancelEditingPersonalPrompt,
    // Styling
    promptStyles: ui.promptStyles,
    editingStylePromptId: ui.editingStylePromptId,
    styleDraft: ui.styleDraft,
    setStyleDraft: ui.setStyleDraft,
    openStyleEditor: ui.openStyleEditor,
    saveStylePrompt: ui.saveStylePrompt,
    closeStyleEditor: ui.closeStyleEditor,
    // Drag & Drop
    draggingPersonalId: ui.draggingPersonalId,
    draggingPersonalCategory: ui.draggingPersonalCategory,
    dragOverPersonalId: ui.dragOverPersonalId,
    handlePersonalDragStart: ui.handlePersonalDragStart,
    handlePersonalDragOver: ui.handlePersonalDragOver,
    handlePersonalDragEnd: ui.handlePersonalDragEnd,
    handlePersonalDrop: ui.handlePersonalDrop,
    handlePersonalDropToEnd: ui.handlePersonalDropToEnd,

    // --- Favorites ---
    favoriteLibraryIds: favs.favoriteLibraryIds,
    favoritePersonalIds: favs.favoritePersonalIds,
    handleToggleFavorite: favs.handleToggleFavorite,
  }), [data, ui, favs]);
};
