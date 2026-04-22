"use client";

import { useState, useEffect, useRef } from "react";
import { User, SupabaseClient } from "@supabase/supabase-js";
import { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { logger } from "@/lib/logger";
import { getCategoriesKey, getOrderKey } from "@/lib/library/row-mapper";

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
 * Owns all Supabase auth wiring for the library:
 * - initial getUser() call
 * - onAuthStateChange subscription (with cleanup)
 * - guest-to-server data migration on login
 *
 * Notifies useLibrary via onUserChange so it can reset state and reload data.
 */
export function useLibraryAuth({
  supabase,
  onUserChange,
}: UseLibraryAuthOptions): UseLibraryAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Track the previous user so we can detect login transitions for migration
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    let mounted = true;
    // Tracks whether we've applied any auth state (from getSession or onAuthStateChange).
    // Prevents a late-resolving getSession() null from clobbering a user that
    // onAuthStateChange already delivered.
    let applied = false;

    async function applyUser(newUser: User | null) {
      if (!mounted) return;
      applied = true;
      userRef.current = newUser;
      setUser(newUser);
      try {
        await onUserChange(newUser);
      } catch (err) {
        logger.error("[useLibraryAuth] onUserChange failed:", err);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    async function init() {
      try {
        // getSession() reads the cached session from storage — no network round-trip,
        // no stale-JWT false-null. This is the authoritative local source of truth.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted || applied) return;
        await applyUser(session?.user ?? null);
      } catch (err) {
        logger.error("[useLibraryAuth] init getSession failed:", err);
        if (mounted && !applied) setIsLoaded(true);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;

      if (newUser && !userRef.current) {
        // Just logged in — migrate guest localStorage data to the server
        const localStr = localStorage.getItem(STORAGE_KEY);
        if (localStr) {
          try {
            const localItems = JSON.parse(localStr) as PersonalPrompt[];
            if (Array.isArray(localItems) && localItems.length > 0) {
              logger.info("Migrating guest items:", localItems.length);

              const itemsToInsert = localItems.map((item) => ({
                user_id: newUser.id,
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
              } else {
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

      const idChanged = userRef.current?.id !== newUser?.id;
      // Recovery only: SIGNED_IN / INITIAL_SESSION arrived with a real user but
      // init() had settled into guest mode (userRef.current === null). Without
      // this branch the UI would stay empty until the next real id change.
      // We intentionally exclude TOKEN_REFRESHED (fires every ~55min on the same
      // id — would cause a full library re-fetch while the user is scrolling).
      const isRecoveryEvent = event === "SIGNED_IN" || event === "INITIAL_SESSION";
      const needsRecovery = isRecoveryEvent && newUser && !userRef.current;

      if (idChanged || needsRecovery) {
        applied = true;
        userRef.current = newUser;
        setUser(newUser);
        try {
          await onUserChange(newUser);
        } catch (err) {
          logger.error("[useLibraryAuth] onAuthStateChange onUserChange failed:", err);
        } finally {
          if (mounted) setIsLoaded(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return { user, isLoaded };
}
