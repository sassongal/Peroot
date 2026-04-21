"use client";

import { useCallback } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { PersonalPrompt } from "@/lib/types";
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";
import { rowToPrompt, readOrderMap } from "@/lib/library/row-mapper";

interface UseLibraryFetchParams {
  supabase: SupabaseClient;
  setPersonalLibrary?: (items: PersonalPrompt[]) => void;
  setTotalCount?: (count: number) => void;
  setIsPageLoading?: (loading: boolean) => void;
  setFolderCounts?: (counts: Record<string, number>) => void;
}

export function useLibraryFetch({
  supabase,
  setPersonalLibrary = () => {},
  setTotalCount = () => {},
  setIsPageLoading = () => {},
  setFolderCounts = () => {},
}: UseLibraryFetchParams) {
  const fetchFolderCounts = useCallback(
    async (userId: string) => {
      // Fetch category counts from RPC
      const { data, error } = await supabase.rpc("get_library_folder_counts", {
        p_user_id: userId,
      });
      if (error) {
        logger.warn("[useLibrary] fetchFolderCounts error:", error);
      }

      const counts: Record<string, number> = {};
      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.assign(counts, data as Record<string, number>);
      }

      // Compute virtual folder counts
      // "all" = total items
      const { count: totalAll } = await supabase
        .from("personal_library")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      counts["all"] = totalAll ?? 0;

      // "pinned"
      const { count: pinnedCount } = await supabase
        .from("personal_library")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_pinned", true);
      counts["pinned"] = pinnedCount ?? 0;

      // "favorites"
      const { count: favCount } = await supabase
        .from("prompt_favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("item_type", "personal");
      counts["favorites"] = favCount ?? 0;

      // "templates"
      const { count: templateCount } = await supabase
        .from("personal_library")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_template", true);
      counts["templates"] = templateCount ?? 0;

      setFolderCounts(counts);
    },
    [supabase, setFolderCounts],
  );

  const fetchPage = useCallback(
    async (
      userId: string,
      opts: {
        page: number;
        pageSize: number;
        activeFolder: string | null;
        sortBy: string;
        searchQuery: string;
        capabilityFilter: string | null;
      },
    ) => {
      setIsPageLoading(true);
      try {
        const orderMap = readOrderMap(userId);

        // --- Fuzzy search via pg_trgm RPC when search query is present ---
        // Skip RPC for "favorites" folder — it requires a join with prompt_favorites
        // that the RPC doesn't handle; fall through to standard query path instead.
        if (opts.searchQuery && opts.activeFolder !== "favorites") {
          const offset = (opts.page - 1) * opts.pageSize;
          const { data: fuzzyData, error: fuzzyError } = await supabase.rpc(
            "search_personal_library_fuzzy",
            {
              p_user_id: userId,
              p_query: opts.searchQuery,
              p_folder: opts.activeFolder,
              p_capability: opts.capabilityFilter,
              p_sort: opts.sortBy,
              p_limit: opts.pageSize,
              p_offset: offset,
            },
          );

          if (!fuzzyError && fuzzyData && (fuzzyData as Record<string, unknown>[]).length > 0) {
            setPersonalLibrary(
              (fuzzyData as Record<string, unknown>[]).map(
                (row: Record<string, unknown>, index: number) =>
                  rowToPrompt(row, offset + index, orderMap),
              ),
            );
            setTotalCount(
              ((fuzzyData as Record<string, unknown>[])[0]?.total_count as number) ??
                (fuzzyData as Record<string, unknown>[]).length,
            );
            setIsPageLoading(false);
            return; // Early return — skip the standard query path
          }
          if (fuzzyError) {
            logger.error("[useLibrary] fuzzy search error:", fuzzyError);
          }
          // If RPC returned 0 results or errored, fall through to standard ilike query
        }

        let query = supabase
          .from("personal_library")
          .select("*", { count: "exact" })
          .eq("user_id", userId);

        // Handle virtual folders vs real category folders
        if (opts.activeFolder === "favorites") {
          // Fetch favorite IDs first, then filter
          const { data: favRows } = await supabase
            .from("prompt_favorites")
            .select("item_id")
            .eq("user_id", userId)
            .eq("item_type", "personal");
          if (favRows && favRows.length > 0) {
            query = query.in(
              "id",
              favRows.map((r: { item_id: string }) => r.item_id),
            );
          } else {
            setPersonalLibrary([]);
            setTotalCount(0);
            setIsPageLoading(false);
            return;
          }
        } else if (opts.activeFolder === "pinned") {
          query = query.eq("is_pinned", true);
        } else if (opts.activeFolder === "templates") {
          query = query.eq("is_template", true);
        } else if (opts.activeFolder && opts.activeFolder !== "all") {
          query = query.eq("personal_category", opts.activeFolder);
        }
        // "all" (null) → no category filter - returns everything
        if (opts.capabilityFilter) {
          query = query.eq("capability_mode", opts.capabilityFilter);
        }
        if (opts.searchQuery) {
          const safeSearch = escapePostgrestValue(opts.searchQuery);
          query = query.or(
            `title.ilike.%${safeSearch}%,prompt.ilike.%${safeSearch}%,use_case.ilike.%${safeSearch}%`,
          );
        }

        switch (opts.sortBy) {
          case "title":
            query = query.order("title", { ascending: true });
            break;
          case "usage":
            query = query.order("use_count", { ascending: false });
            break;
          case "custom":
            query = query.order("sort_index", { ascending: true });
            break;
          case "last_used":
            query = query.order("last_used_at", { ascending: false, nullsFirst: false });
            break;
          case "recent":
            query = query.order("created_at", { ascending: false });
            break;
          case "performance":
          default:
            query = query.order("updated_at", { ascending: false });
            break;
        }

        // Pinned items always float to top
        query = query.order("is_pinned", { ascending: false });

        const offset = (opts.page - 1) * opts.pageSize;
        const { data, count, error } = await query.range(offset, offset + opts.pageSize - 1);

        if (error) {
          logger.error("[useLibrary] fetchPage error:", error);
          return;
        }

        if (data) {
          setPersonalLibrary(
            (data as Record<string, unknown>[]).map((row, index) =>
              rowToPrompt(row, offset + index, orderMap),
            ),
          );
        }
        if (typeof count === "number") {
          setTotalCount(count);
        }
      } finally {
        setIsPageLoading(false);
      }
    },
    [supabase, setPersonalLibrary, setTotalCount, setIsPageLoading],
  );

  return { fetchFolderCounts, fetchPage };
}
