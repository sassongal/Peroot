"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export type FavoriteType = "library" | "personal";

type FavoriteEntry = {
  item_type: FavoriteType;
  item_id: string;
  created_at?: string | null;
};

const STORAGE_KEY = "peroot_favorites_guest";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async (activeUser: User | null) => {
      if (!isMounted) return;

      if (activeUser) {
        const { data, error } = await supabase
          .from("prompt_favorites")
          .select("item_type,item_id,created_at")
          .eq("user_id", activeUser.id);

        if (!isMounted) return;

        if (error) {
          console.warn("Failed to load favorites", error);
          setFavorites([]);
        } else {
          setFavorites(
            (data ?? []).map((row) => ({
              item_type: row.item_type as FavoriteType,
              item_id: row.item_id,
              created_at: row.created_at,
            }))
          );
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            setFavorites([]);
          } else {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setFavorites(
                parsed.filter(
                  (item) =>
                    item &&
                    (item.item_type === "library" || item.item_type === "personal") &&
                    typeof item.item_id === "string"
                )
              );
            }
          }
        } catch (error) {
          console.warn("Failed to parse favorites", error);
          setFavorites([]);
        }
      }

      setIsLoaded(true);
    };

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      await loadFavorites(data.user ?? null);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadFavorites(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isLoaded || user) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, isLoaded, user]);

  const favoriteLibraryIds = useMemo(
    () => new Set(favorites.filter((fav) => fav.item_type === "library").map((fav) => fav.item_id)),
    [favorites]
  );

  const favoritePersonalIds = useMemo(
    () => new Set(favorites.filter((fav) => fav.item_type === "personal").map((fav) => fav.item_id)),
    [favorites]
  );

  const toggleFavorite = async (itemType: FavoriteType, itemId: string): Promise<boolean> => {
    // Return false if guest - caller should show login prompt
    if (!user) {
      return false;
    }
    
    let shouldRemove = false;
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.item_type === itemType && fav.item_id === itemId);
      shouldRemove = exists;
      if (exists) {
        return prev.filter((fav) => !(fav.item_type === itemType && fav.item_id === itemId));
      }
      return [...prev, { item_type: itemType, item_id: itemId }];
    });

    if (shouldRemove) {
      await supabase
        .from("prompt_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId);
    } else {
      await supabase
        .from("prompt_favorites")
        .upsert(
          { user_id: user.id, item_type: itemType, item_id: itemId },
          { onConflict: "user_id,item_type,item_id" }
        );
    }
    
    return true;
  };

  return {
    favorites,
    favoriteLibraryIds,
    favoritePersonalIds,
    toggleFavorite,
    isLoaded,
    user,
  };
}
