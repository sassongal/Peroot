"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

type FavoriteType = "library" | "personal";

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
  const userRef = useRef<User | null>(null);

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
          logger.warn("Failed to load favorites", error);
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
          logger.warn("Failed to parse favorites", error);
          setFavorites([]);
        }
      }

      setIsLoaded(true);
    };

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      userRef.current = data.user ?? null;
      await loadFavorites(data.user ?? null);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      
      // Migration Logic
      if (newUser && !userRef.current) {
         const localStr = localStorage.getItem(STORAGE_KEY);
         if (localStr) {
             try {
                const localFavs = JSON.parse(localStr) as FavoriteEntry[];
                if (Array.isArray(localFavs) && localFavs.length > 0) {
                    const toInsert = localFavs.map(f => ({
                        user_id: newUser.id,
                        item_type: f.item_type,
                        item_id: f.item_id
                    }));
                    // Upsert to avoid conflicts if they already exist in DB
                    await supabase.from("prompt_favorites").upsert(toInsert, { onConflict: 'user_id,item_type,item_id' });
                    localStorage.removeItem(STORAGE_KEY);
                }
             } catch (e) { logger.error("Fav migration failed", e); }
         }
      }

      if (userRef.current?.id !== newUser?.id) {
        userRef.current = newUser;
        setUser(newUser);
        loadFavorites(newUser);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isLoaded) return; // Don't write if not loaded
    if (user) {
        // If user is logged in, we rely on DB, do NOT write to guest local storage
        // Maybe we want to clear it? Already done in migration.
        return;
    } 
    // Guest mode -> Sync to LS
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
    // Guest: persist to localStorage via the effect below (same shape as logged-in UX).
    if (!user) {
      setFavorites((prev) => {
        const exists = prev.some((fav) => fav.item_type === itemType && fav.item_id === itemId);
        if (exists) {
          return prev.filter((fav) => !(fav.item_type === itemType && fav.item_id === itemId));
        }
        return [...prev, { item_type: itemType, item_id: itemId }];
      });
      return true;
    }

    // Compute shouldRemove before setState to avoid reading from inside setter
    const shouldRemove = favorites.some((fav) => fav.item_type === itemType && fav.item_id === itemId);
    setFavorites((prev) => {
      if (shouldRemove) {
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
      void supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "favorite_remove",
        entity_type: itemType,
        entity_id: itemId,
        details: {},
      });
    } else {
      await supabase
        .from("prompt_favorites")
        .upsert(
          { user_id: user.id, item_type: itemType, item_id: itemId },
          { onConflict: "user_id,item_type,item_id" }
        );
      void supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "favorite_add",
        entity_type: itemType,
        entity_id: itemId,
        details: {},
      });
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
