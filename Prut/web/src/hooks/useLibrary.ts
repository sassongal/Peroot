"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { getApiPath } from '@/lib/api-path';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { logger } from "@/lib/logger";

import { applyGuestFiltersAndSort } from "@/lib/library/sort";
import { getCategoriesKey, readOrderMap, persistOrderMap } from "@/lib/library/row-mapper";
import { useLibraryFetch } from './useLibraryFetch';
import { useLibraryAuth } from './useLibraryAuth';
import { useLibraryCategories } from './useLibraryCategories';
import { usePromptMutations } from './usePromptMutations';
import { usePromptOrdering } from './usePromptOrdering';

const STORAGE_KEY = 'peroot_personal_library';
const DEFAULT_PAGE_SIZE = 15;

export function useLibrary() {
  // Current page items (server users) or sliced local items (guests)
  const [personalLibrary, setPersonalLibrary] = useState<PersonalPrompt[]>([]);
  // Full in-memory set for guest users only (used for duplicate checks, sort calculations)
  const [allLocalItems, setAllLocalItems] = useState<PersonalPrompt[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Pagination state
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

  // Filter / sort state
  const [activeFolder, setActiveFolderState] = useState<string | null>(null);
  const [sortBy, setSortByState] = useState<string>('recent');
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const [capabilityFilter, setCapabilityFilterState] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const userRef = useRef<User | null>(null);

  const { fetchFolderCounts, fetchPage } = useLibraryFetch({
    supabase,
    user: null, // user identity passed per-call via userId param; this field unused in impl
    setPersonalLibrary,
    setTotalCount,
    setIsPageLoading,
    setFolderCounts,
  });

  // Debounce timer for search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to current pagination/filter state so callbacks can always read latest values
  const stateRef = useRef({
    page,
    pageSize,
    activeFolder,
    sortBy,
    searchQuery,
    capabilityFilter,
  });
  useEffect(() => {
    stateRef.current = { page, pageSize, activeFolder, sortBy, searchQuery, capabilityFilter };
  }, [page, pageSize, activeFolder, sortBy, searchQuery, capabilityFilter]);

  // ---------------------------------------------------------------------------
  // SERVER-SIDE FETCH — implemented in useLibraryFetch
  // ---------------------------------------------------------------------------

  const refreshCurrentPage = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const s = stateRef.current;
    await Promise.all([
      fetchPage(currentUser.id, s),
      fetchFolderCounts(currentUser.id),
    ]);
  }, [fetchPage, fetchFolderCounts]);

  // ---------------------------------------------------------------------------
  // GUEST CLIENT-SIDE PAGINATION HELPER
  // ---------------------------------------------------------------------------

  const applyGuestPagination = useCallback((
    allItems: PersonalPrompt[],
    opts: {
      page: number;
      pageSize: number;
      activeFolder: string | null;
      sortBy: string;
      searchQuery: string;
      capabilityFilter: string | null;
    }
  ) => {
    const filtered = applyGuestFiltersAndSort(
      allItems,
      {
        activeFolder: opts.activeFolder,
        searchQuery: opts.searchQuery,
        capabilityFilter: opts.capabilityFilter,
      },
      { sortBy: opts.sortBy }
    );

    setTotalCount(filtered.length);

    // Compute folder counts
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      const folder = item.personal_category ?? 'כללי';
      counts[folder] = (counts[folder] ?? 0) + 1;
    }
    setFolderCounts(counts);

    const offset = (opts.page - 1) * opts.pageSize;
    setPersonalLibrary(filtered.slice(offset, offset + opts.pageSize));
  }, []);

  // ---------------------------------------------------------------------------
  // INITIALISATION — data-loading logic called by useLibraryAuth on user change
  // ---------------------------------------------------------------------------

  const initForUser = useCallback(async (currentUser: User | null) => {
    userRef.current = currentUser;
    // Reset filters on every user change (covers both initial load and sign-in/out)
    setPageState(1);
    setActiveFolderState(null);
    setSortByState('recent');
    setSearchQueryState('');
    setCapabilityFilterState(null);

    if (currentUser) {
      const opts = {
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        activeFolder: null,
        sortBy: 'recent',
        searchQuery: '',
        capabilityFilter: null,
      };
      await Promise.all([
        fetchPage(currentUser.id, opts),
        fetchFolderCounts(currentUser.id),
      ]);

      const storedCats = localStorage.getItem(getCategoriesKey(currentUser.id));
      if (storedCats) {
        setPersonalCategories(JSON.parse(storedCats));
      }
    } else {
      // GUEST - load from localStorage
      const orderMap = readOrderMap(null);
      const storedLib = localStorage.getItem(STORAGE_KEY);
      let localItems: PersonalPrompt[] = [];

      if (storedLib) {
        try {
          const parsed = JSON.parse(storedLib);
          if (Array.isArray(parsed)) {
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const filtered = parsed.filter((row) => {
              const savedAt = row.savedAt ?? row.created_at ?? 0;
              const ts = typeof savedAt === 'string' ? new Date(savedAt).getTime() : savedAt;
              return (now - ts) < SEVEN_DAYS_MS;
            });
            localItems = filtered.map((row, index) => ({
              ...row,
              sort_index:
                typeof row.sort_index === "number"
                  ? row.sort_index
                  : typeof orderMap[row.id] === "number"
                    ? orderMap[row.id]
                    : index,
              created_at: row.created_at ?? Date.now(),
              updated_at: row.updated_at ?? Date.now(),
              prompt_style: row.prompt_style ?? undefined,
              personal_category: row.personal_category ?? null,
              capability_mode: row.capability_mode ?? CapabilityMode.STANDARD,
              tags: row.tags || [],
              last_used_at: row.last_used_at ?? null,
              savedAt: row.savedAt ?? Date.now()
            }));
          }
        } catch (error) {
          logger.warn("Failed to parse personal library", error);
        }
      }

      setAllLocalItems(localItems);
      applyGuestPagination(localItems, {
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        activeFolder: null,
        sortBy: 'recent',
        searchQuery: '',
        capabilityFilter: null,
      });
      setPageState(1);

      const storedCats = localStorage.getItem(getCategoriesKey(null));
      if (storedCats) setPersonalCategories(JSON.parse(storedCats));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, fetchFolderCounts, applyGuestPagination]);

  // ---------------------------------------------------------------------------
  // AUTH — subscription + migration handled in useLibraryAuth
  // ---------------------------------------------------------------------------

  const { user, isLoaded } = useLibraryAuth({ supabase, onUserChange: initForUser });

  // ---------------------------------------------------------------------------
  // CATEGORY CRUD — implemented in useLibraryCategories
  // ---------------------------------------------------------------------------

  const {
    personalCategories,
    setPersonalCategories,
    addCategory,
    renameCategory,
    deleteCategory,
  } = useLibraryCategories({ supabase, user, refreshCurrentPage, setAllLocalItems });

  // ---------------------------------------------------------------------------
  // RE-FETCH WHEN PAGINATION / FILTER STATE CHANGES (authenticated users)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded) return;
    const currentUser = userRef.current;
    if (!currentUser) return;

    fetchPage(currentUser.id, { page, pageSize, activeFolder, sortBy, searchQuery, capabilityFilter });
  // We intentionally omit fetchPage from deps to avoid double-fetching on init
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, activeFolder, sortBy, searchQuery, capabilityFilter, isLoaded]);

  // ---------------------------------------------------------------------------
  // RE-PAGINATE GUESTS WHEN FILTER STATE CHANGES
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded) return;
    if (userRef.current) return; // handled above
    applyGuestPagination(allLocalItems, { page, pageSize, activeFolder, sortBy, searchQuery, capabilityFilter });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, activeFolder, sortBy, searchQuery, capabilityFilter, allLocalItems, isLoaded]);

  // ---------------------------------------------------------------------------
  // SYNC GUEST DATA TO LOCALSTORAGE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allLocalItems));
      localStorage.setItem(getCategoriesKey(null), JSON.stringify(personalCategories));
      persistOrderMap(null, allLocalItems);
    } else {
      localStorage.setItem(getCategoriesKey(user.id), JSON.stringify(personalCategories));
      persistOrderMap(user.id, personalLibrary);
    }
  }, [allLocalItems, personalLibrary, personalCategories, isLoaded, user]);

  // ---------------------------------------------------------------------------
  // NAVIGATION HELPERS
  // ---------------------------------------------------------------------------

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
  }, []);

  const setActiveFolder = useCallback((folder: string | null) => {
    setActiveFolderState(folder);
    setPageState(1);
  }, []);

  const setSortBy = useCallback((sort: string) => {
    setSortByState(sort);
    setPageState(1);
  }, []);

  const setCapabilityFilter = useCallback((cap: string | null) => {
    setCapabilityFilterState(cap);
    setPageState(1);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQueryState(query);
      setPageState(1);
    }, 300);
  }, []);

  // ---------------------------------------------------------------------------
  // MUTATIONS — implemented in usePromptMutations
  // ---------------------------------------------------------------------------

  const {
    addPrompt,
    removePrompt,
    updatePrompt,
    ratePrompt,
    incrementUseCount,
    togglePin,
    updatePromptContent,
    bumpPersonalLibraryLastUsed,
    updateTags,
  } = usePromptMutations({
    supabase,
    user,
    allLocalItems,
    setAllLocalItems,
    personalLibrary,
    setPersonalLibrary,
    refreshCurrentPage,
  });

  const updateCategory = async (id: string, category: string) => {
    if (user) {
      const { count: catCount } = await supabase
        .from('personal_library')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('personal_category', category)
        .neq('id', id);

      const nextSortIndex = (catCount ?? 0);

      const { error } = await supabase.from('personal_library').update({
        personal_category: category,
        sort_index: nextSortIndex
      }).eq('id', id).eq('user_id', user.id);
      if (error) logger.error('[useLibrary] updateCategory error:', error);

      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => {
        const nextSortIndex = prev
          .filter((item) => item.personal_category === category && item.id !== id)
          .reduce((max, item) => Math.max(max, item.sort_index ?? -1), -1) + 1;
        return prev.map(p =>
          p.id === id ? { ...p, personal_category: category, sort_index: nextSortIndex, updated_at: Date.now() } : p
        );
      });
    }
  };

  // ---------------------------------------------------------------------------
  // ORDERING — implemented in usePromptOrdering
  // ---------------------------------------------------------------------------

  const { reorderPrompts, movePrompt, movePrompts, addPrompts } = usePromptOrdering({
    supabase,
    user,
    allLocalItems,
    setAllLocalItems,
    personalCategories,
    setPersonalCategories,
    refreshCurrentPage,
  });

  const deletePrompts = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (user) {
      const { error } = await supabase
        .from("personal_library")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);
      if (error) {
        logger.error("[useLibrary] deletePrompts error:", error);
      }
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => prev.filter(p => !ids.includes(p.id)));
    }
  };

  const updateProfile = async (updates: {
    onboarding_completed?: boolean;
    plan_tier?: 'free' | 'pro';
    credits_balance?: number;
  }) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      logger.error('[useLibrary] Error updating profile:', error);
      throw error;
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      const response = await fetch(getApiPath('/api/user/onboarding/complete'), {
        method: 'POST',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to complete onboarding");
      }

      return true;
    } catch (error) {
      logger.error('[useLibrary] completeOnboarding error:', error);
      throw error;
    }
  };

  return {
    personalLibrary,
    personalCategories,
    isLoaded,
    // Pagination
    page,
    pageSize,
    totalCount,
    folderCounts,
    isPageLoading,
    // Filters
    activeFolder,
    sortBy,
    searchQuery,
    capabilityFilter,
    // Navigation
    setPage,
    setActiveFolder,
    setSortBy,
    setSearchQuery,
    setCapabilityFilter,
    refreshCurrentPage,
    // Mutations
    addPrompt,
    removePrompt,
    updateCategory,
    incrementUseCount,
    togglePin,
    ratePrompt,
    updatePrompt,
    updatePromptContent,
    bumpPersonalLibraryLastUsed,
    reorderPrompts,
    movePrompt,
    renameCategory,
    addCategory,
    deleteCategory,
    deletePrompts,
    movePrompts,
    addPrompts,
    updateTags,
    updateProfile,
    completeOnboarding,
  };
}
