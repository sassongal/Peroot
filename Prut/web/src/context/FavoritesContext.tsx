"use client";

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from "react";
import { useFavorites } from "@/hooks/useFavorites";

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
  const { favoriteLibraryIds, favoritePersonalIds, toggleFavorite: toggleFavoriteBase } = useFavorites();

  const handleToggleFavorite = useCallback(async (itemType: "library" | "personal", itemId: string) => {
    await toggleFavoriteBase(itemType, itemId);
  }, [toggleFavoriteBase]);

  const value = useMemo<FavoritesContextType>(() => ({
    favoriteLibraryIds,
    favoritePersonalIds,
    handleToggleFavorite,
  }), [favoriteLibraryIds, favoritePersonalIds, handleToggleFavorite]);

  return (
    <FavoritesCtx.Provider value={value}>
      {children}
    </FavoritesCtx.Provider>
  );
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
