"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PersonalPrompt } from "@/lib/types";
import { logger } from "@/lib/logger";

/** Hard cap on rows fetched for the graph / Memory Palace corpus. */
export const CORPUS_ROW_LIMIT = 2000;

export interface UseAllPersonalPromptsArgs {
  /**
   * Whether the full corpus is needed right now (graph view open, or a Palace
   * surface visible). The server fetch is lazy — it only fires when enabled, so
   * users who never open the graph/palace pay nothing.
   */
  enabled: boolean;
  /** Authenticated user id, or undefined for guests. */
  userId: string | undefined;
  /** Full in-memory library for guests (guests never hit the server). */
  guestItems: PersonalPrompt[];
  /**
   * Total library size from `useLibrary`. Used purely as a refetch key: when it
   * changes (a prompt was added/removed) the server corpus is refreshed.
   */
  totalCount: number;
}

export interface AllPersonalPrompts {
  /** The full personal-library corpus — never a page slice. */
  prompts: PersonalPrompt[];
  loading: boolean;
  /** Total rows the server reports (may exceed `prompts.length` if capped). */
  total: number;
  /** Present when the corpus was capped at CORPUS_ROW_LIMIT below `total`. */
  truncatedAt: { shown: number; total: number } | null;
}

/**
 * Single source of the full personal-library corpus for the graph view and the
 * Memory Palace. Both features score across the WHOLE library — feeding them the
 * paginated `personalLibrary` slice silently hides genuine neighbors that happen
 * to sit on another page (the palace-corpus bug). This hook owns the one place
 * that decision lives: guests read their in-memory set; authenticated users get
 * a lazy, cached `.limit(CORPUS_ROW_LIMIT)` fetch keyed on library size.
 */
export function useAllPersonalPrompts({
  enabled,
  userId,
  guestItems,
  totalCount,
}: UseAllPersonalPromptsArgs): AllPersonalPrompts {
  const [rows, setRows] = useState<PersonalPrompt[]>([]);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    // Defer to a microtask so we don't setState synchronously in the effect body
    // (avoids the cascading-render lint rule; matches the prior graph fetch).
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    createClient()
      .from("personal_library")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(CORPUS_ROW_LIMIT)
      .then(({ data, count, error }) => {
        if (cancelled) return;
        if (error) logger.error("[useAllPersonalPrompts] corpus fetch failed", error);
        const fetched = (data ?? []) as PersonalPrompt[];
        if (typeof count === "number" && count > fetched.length + 5) {
          logger.warn("[useAllPersonalPrompts] row count mismatch", {
            rowsReturned: fetched.length,
            totalCount: count,
          });
        }
        setRows(fetched);
        setServerTotal(typeof count === "number" ? count : fetched.length);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // totalCount is a refetch key: refresh the corpus when the library changes.
  }, [enabled, userId, totalCount]);

  // Guests never touch the server — their full corpus is already in memory.
  if (!userId) {
    return { prompts: guestItems, loading: false, total: guestItems.length, truncatedAt: null };
  }

  const total = serverTotal ?? rows.length;
  return {
    prompts: rows,
    loading,
    total,
    truncatedAt: total > rows.length ? { shown: rows.length, total } : null,
  };
}
