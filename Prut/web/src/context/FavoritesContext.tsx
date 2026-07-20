"use client";

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useLibraryData } from "./LibraryDataContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FavoritesContextType {
  favoriteLibraryIds: Set<string>;
  favoritePersonalIds: Set<string>;
  handleToggleFavorite: (type: "library" | "personal", itemId: string) => Promise<void>;
}

const FavoritesCtx = createContext<FavoritesContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const {
    favoriteLibraryIds,
    favoritePersonalIds,
    toggleFavorite: toggleFavoriteBase,
  } = useFavorites();
  const { adjustFolderCount } = useLibraryData();

  const handleToggleFavorite = useCallback(
    async (itemType: "library" | "personal", itemId: string) => {
      // Capture pre-toggle state: only personal favorites feed the sidebar
      // "favorites" folder count, and we need to know add-vs-remove.
      const wasFavorited = itemType === "personal" && favoritePersonalIds.has(itemId);
      const ok = await toggleFavoriteBase(itemType, itemId);
      if (ok && itemType === "personal") {
        // Keep the "favorites" count in sync instantly (the RPC-derived count
        // would otherwise stay stale until the next full library fetch).
        adjustFolderCount("favorites", wasFavorited ? -1 : 1);
      }
    },
    [favoritePersonalIds, toggleFavoriteBase, adjustFolderCount],
  );

  const value = useMemo<FavoritesContextType>(
    () => ({
      favoriteLibraryIds,
      favoritePersonalIds,
      handleToggleFavorite,
    }),
    [favoriteLibraryIds, favoritePersonalIds, handleToggleFavorite],
  );

  return <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFavoritesContext() {
  const context = useContext(FavoritesCtx);
  if (!context) {
    throw new Error("useFavoritesContext must be used within a FavoritesProvider");
  }
  return context;
}
