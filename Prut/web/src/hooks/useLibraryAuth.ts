"use client";

import { useEffect, useRef, useState } from "react";
import { User, SupabaseClient } from "@supabase/supabase-js";
import { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { logger } from "@/lib/logger";
import { getCategoriesKey, getOrderKey } from "@/lib/library/row-mapper";
import { findSimilarPrompts } from "@/lib/prompt-similarity";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "peroot_personal_library";

export interface UseLibraryAuthOptions {
  supabase: SupabaseClient;
  /**
   * Called whenever the resolved user changes (initial load + auth state changes).
   * Receives the new user. useLibrary uses this to reset pagination/filters and
   * re-run its own init() data-loading logic.
   * Must be async — useLibraryAuth awaits it before setting isLoaded = true.
   */
  onUserChange: (newUser: User | null) => Promise<void>;
}

export interface UseLibraryAuthResult {
  user: User | null;
  isLoaded: boolean;
}

/**
 * Library auth adapter on top of the central AuthContext.
 * - Subscribes to id transitions and runs onUserChange (resets paging + reloads data).
 * - Runs the guest → server localStorage migration on first login.
 *
 * No direct supabase.auth.* calls here: AuthContext owns that.
 */
export function useLibraryAuth({
  supabase,
  onUserChange,
}: UseLibraryAuthOptions): UseLibraryAuthResult {
  const { user, isLoaded: authLoaded } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const migrationRanRef = useRef(false);

  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;
    const prevId = prevUserIdRef.current;
    const nextId = user?.id ?? null;
    // First auth settle OR user id transition → reload data.
    const idChanged = prevId !== nextId;
    if (!idChanged && prevId !== undefined) return;

    (async () => {
      // Guest → logged in transition: migrate localStorage prompts.
      if (user && !prevId && !migrationRanRef.current) {
        migrationRanRef.current = true;
        const localStr = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (localStr) {
          try {
            const localItems = JSON.parse(localStr) as PersonalPrompt[];
            if (Array.isArray(localItems) && localItems.length > 0) {
              // Dedup against the account's existing library so a returning
              // guest who saved prompts they already own server-side doesn't
              // get duplicate rows. A high threshold keeps near-identical
              // prompts out while preserving genuinely distinct ones.
              const { data: existing } = await supabase
                .from("personal_library")
                .select("id, title, prompt")
                .eq("user_id", user.id)
                .limit(500);
              const existingList = (existing ?? []) as Array<{
                id: string;
                title: string;
                prompt: string;
              }>;
              const newItems = localItems.filter(
                (item) => findSimilarPrompts(item.prompt, existingList, 0.9).length === 0,
              );
              logger.info("Migrating guest items:", {
                total: localItems.length,
                new: newItems.length,
              });

              let migrationOk = true;
              if (newItems.length > 0) {
                const itemsToInsert = newItems.map((item) => ({
                  user_id: user.id,
                  title: item.title,
                  prompt: item.prompt,
                  prompt_style: item.prompt_style ?? null,
                  category: item.category,
                  personal_category: item.personal_category,
                  use_case: item.use_case,
                  source: item.source,
                  use_count: item.use_count,
                  created_at: new Date(item.created_at ?? Date.now()).toISOString(),
                  updated_at: new Date(item.updated_at ?? Date.now()).toISOString(),
                  sort_index: item.sort_index ?? 0,
                  capability_mode: item.capability_mode ?? CapabilityMode.STANDARD,
                  tags: item.tags ?? [],
                }));
                const { error: insertError } = await supabase
                  .from("personal_library")
                  .insert(itemsToInsert);
                if (insertError) {
                  logger.error("Migration insert failed", insertError);
                  migrationOk = false;
                }
              }
              // Clear guest storage when nothing failed — including the
              // all-duplicates case, where the prompts already live server-side.
              if (migrationOk) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(getCategoriesKey(null));
                localStorage.removeItem(getOrderKey(null));
              }
            }
          } catch (e) {
            logger.error("Migration failed", e);
          }
        }
      }

      try {
        await onUserChange(user);
      } catch (err) {
        logger.error("[useLibraryAuth] onUserChange failed:", err);
      } finally {
        if (!cancelled) {
          prevUserIdRef.current = nextId;
          setIsLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoaded]);

  return { user, isLoaded };
}
