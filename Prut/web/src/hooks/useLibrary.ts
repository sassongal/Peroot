"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { getApiPath } from '@/lib/api-path';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { toast } from 'sonner';
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";
import { findSimilarPrompts } from "@/lib/prompt-similarity";
import { applyGuestFiltersAndSort } from "@/lib/library/sort";
import { rowToPrompt, getOrderKey, getCategoriesKey, readOrderMap, persistOrderMap } from "@/lib/library/row-mapper";

const STORAGE_KEY = 'peroot_personal_library';
const DEFAULT_PAGE_SIZE = 15;

export function useLibrary() {
  // Current page items (server users) or sliced local items (guests)
  const [personalLibrary, setPersonalLibrary] = useState<PersonalPrompt[]>([]);
  // Full in-memory set for guest users only (used for duplicate checks, sort calculations)
  const [allLocalItems, setAllLocalItems] = useState<PersonalPrompt[]>([]);
  const [personalCategories, setPersonalCategories] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
  // SERVER-SIDE FETCH
  // ---------------------------------------------------------------------------

  const fetchFolderCounts = useCallback(async (userId: string) => {
    // Fetch category counts from RPC
    const { data, error } = await supabase.rpc('get_library_folder_counts', { p_user_id: userId });
    if (error) {
      logger.warn('[useLibrary] fetchFolderCounts error:', error);
    }

    const counts: Record<string, number> = {};
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(counts, data as Record<string, number>);
    }

    // Compute virtual folder counts
    // "all" = total items
    const { count: totalAll } = await supabase
      .from('personal_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    counts['all'] = totalAll ?? 0;

    // "pinned"
    const { count: pinnedCount } = await supabase
      .from('personal_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_pinned', true);
    counts['pinned'] = pinnedCount ?? 0;

    // "favorites"
    const { count: favCount } = await supabase
      .from('prompt_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('item_type', 'personal');
    counts['favorites'] = favCount ?? 0;

    // "templates"
    const { count: templateCount } = await supabase
      .from('personal_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_template', true);
    counts['templates'] = templateCount ?? 0;

    setFolderCounts(counts);
  }, [supabase]);

  const fetchPage = useCallback(async (
    userId: string,
    opts: {
      page: number;
      pageSize: number;
      activeFolder: string | null;
      sortBy: string;
      searchQuery: string;
      capabilityFilter: string | null;
    }
  ) => {
    setIsPageLoading(true);
    try {
      const orderMap = readOrderMap(userId);

      // --- Fuzzy search via pg_trgm RPC when search query is present ---
      // Skip RPC for "favorites" folder — it requires a join with prompt_favorites
      // that the RPC doesn't handle; fall through to standard query path instead.
      if (opts.searchQuery && opts.activeFolder !== 'favorites') {
        const offset = (opts.page - 1) * opts.pageSize;
        const { data: fuzzyData, error: fuzzyError } = await supabase.rpc(
          'search_personal_library_fuzzy',
          {
            p_user_id: userId,
            p_query: opts.searchQuery,
            p_folder: opts.activeFolder,
            p_capability: opts.capabilityFilter,
            p_sort: opts.sortBy,
            p_limit: opts.pageSize,
            p_offset: offset,
          }
        );

        if (!fuzzyError && fuzzyData && (fuzzyData as Record<string, unknown>[]).length > 0) {
          setPersonalLibrary(
            (fuzzyData as Record<string, unknown>[]).map(
              (row: Record<string, unknown>, index: number) =>
                rowToPrompt(row, offset + index, orderMap)
            )
          );
          setTotalCount(
            (fuzzyData as Record<string, unknown>[])[0]?.total_count as number ??
              (fuzzyData as Record<string, unknown>[]).length
          );
          setIsPageLoading(false);
          return; // Early return — skip the standard query path
        }
        if (fuzzyError) {
          logger.error('[useLibrary] fuzzy search error:', fuzzyError);
        }
        // If RPC returned 0 results or errored, fall through to standard ilike query
      }

      let query = supabase
        .from('personal_library')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Handle virtual folders vs real category folders
      if (opts.activeFolder === 'favorites') {
        // Fetch favorite IDs first, then filter
        const { data: favRows } = await supabase
          .from('prompt_favorites')
          .select('item_id')
          .eq('user_id', userId)
          .eq('item_type', 'personal');
        if (favRows && favRows.length > 0) {
          query = query.in('id', favRows.map((r: { item_id: string }) => r.item_id));
        } else {
          setPersonalLibrary([]);
          setTotalCount(0);
          setIsPageLoading(false);
          return;
        }
      } else if (opts.activeFolder === 'pinned') {
        query = query.eq('is_pinned', true);
      } else if (opts.activeFolder === 'templates') {
        query = query.eq('is_template', true);
      } else if (opts.activeFolder && opts.activeFolder !== 'all') {
        query = query.eq('personal_category', opts.activeFolder);
      }
      // "all" (null) → no category filter - returns everything
      if (opts.capabilityFilter) {
        query = query.eq('capability_mode', opts.capabilityFilter);
      }
      if (opts.searchQuery) {
        const safeSearch = escapePostgrestValue(opts.searchQuery);
        query = query.or(
          `title.ilike.%${safeSearch}%,prompt.ilike.%${safeSearch}%,use_case.ilike.%${safeSearch}%`
        );
      }

      switch (opts.sortBy) {
        case 'title':
          query = query.order('title', { ascending: true });
          break;
        case 'usage':
          query = query.order('use_count', { ascending: false });
          break;
        case 'custom':
          query = query.order('sort_index', { ascending: true });
          break;
        case 'last_used':
          query = query.order('last_used_at', { ascending: false, nullsFirst: false });
          break;
        case 'performance':
        default:
          query = query.order('updated_at', { ascending: false });
          break;
      }

      // Pinned items always float to top
      query = query.order('is_pinned', { ascending: false });

      const offset = (opts.page - 1) * opts.pageSize;
      const { data, count, error } = await query.range(offset, offset + opts.pageSize - 1);

      if (error) {
        logger.error('[useLibrary] fetchPage error:', error);
        return;
      }

      if (data) {
        setPersonalLibrary(
          (data as Record<string, unknown>[]).map((row, index) =>
            rowToPrompt(row, offset + index, orderMap)
          )
        );
      }
      if (typeof count === 'number') {
        setTotalCount(count);
      }
    } finally {
      setIsPageLoading(false);
    }
  }, [supabase]);

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
  // INITIALISATION & AUTH
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser);
      userRef.current = currentUser;

      if (currentUser) {
        // Reset pagination on init
        setPageState(1);
        const opts = {
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          activeFolder: stateRef.current.activeFolder,
          sortBy: stateRef.current.sortBy,
          searchQuery: stateRef.current.searchQuery,
          capabilityFilter: stateRef.current.capabilityFilter,
        };
        await Promise.all([
          fetchPage(currentUser.id, opts),
          fetchFolderCounts(currentUser.id),
        ]);

        const storedCats = localStorage.getItem(getCategoriesKey(currentUser.id));
        if (storedCats && mounted) {
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

        if (mounted) {
          setAllLocalItems(localItems);
          applyGuestPagination(localItems, {
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            activeFolder: stateRef.current.activeFolder,
            sortBy: stateRef.current.sortBy,
            searchQuery: stateRef.current.searchQuery,
            capabilityFilter: stateRef.current.capabilityFilter,
          });
          setPageState(1);
        }

        const storedCats = localStorage.getItem(getCategoriesKey(null));
        if (storedCats && mounted) setPersonalCategories(JSON.parse(storedCats));
      }

      if (mounted) setIsLoaded(true);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;

      if (newUser && !userRef.current) {
        // Just logged in - MIGRATE GUEST DATA
        const localStr = localStorage.getItem(STORAGE_KEY);
        if (localStr) {
          try {
            const localItems = JSON.parse(localStr) as PersonalPrompt[];
            if (Array.isArray(localItems) && localItems.length > 0) {
              logger.info("Migrating guest items:", localItems.length);

              const itemsToInsert = localItems.map(item => ({
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
                tags: item.tags ?? []
              }));

              const { error: insertError } = await supabase.from('personal_library').insert(itemsToInsert);
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

      if (userRef.current?.id !== newUser?.id) {
        userRef.current = newUser;
        setUser(newUser);
        // Reset filters on user change
        setPageState(1);
        setActiveFolderState(null);
        setSortByState('recent');
        setSearchQueryState('');
        setCapabilityFilterState(null);
        init();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

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
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const addPrompt = async (
    prompt: Omit<PersonalPrompt, 'id' | 'use_count' | 'created_at' | 'updated_at'>,
    category?: string
  ): Promise<string | undefined> => {
    if (!prompt.personal_category && category) {
      prompt = { ...prompt, personal_category: category };
    }
    if (!prompt.personal_category) {
      prompt = { ...prompt, personal_category: 'כללי' };
    }

    if (user) {
      // Fuzzy duplicate check: fetch recent prompts and compare via Jaccard similarity
      const { data: candidates } = await supabase
        .from('personal_library')
        .select('id, title, prompt')
        .eq('user_id', user.id)
        .limit(50)
        .order('updated_at', { ascending: false });

      if (candidates) {
        const similar = findSimilarPrompts(prompt.prompt, candidates, 0.6);
        if (similar.length > 0) {
          toast.warning(`פרומפט דומה כבר קיים: "${similar[0].title}"`, {
            duration: 8000,
          });
          return undefined;
        }
      }

      // Compute next sort index for the target category using a count query
      const { count: catCount } = await supabase
        .from('personal_library')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('personal_category', prompt.personal_category ?? 'כללי');

      const nextSortIndex = (catCount ?? 0);

      const insertData = {
        user_id: user.id,
        title: prompt.title,
        prompt: prompt.prompt,
        prompt_style: prompt.prompt_style ?? null,
        category: prompt.category,
        personal_category: prompt.personal_category,
        use_case: prompt.use_case,
        source: prompt.source,
        sort_index: nextSortIndex,
        capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
        tags: prompt.tags || [],
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('personal_library')
        .insert(insertData)
        .select('id')
        .single();
      if (error) {
        logger.error('[useLibrary] addPrompt error:', error);
        return undefined;
      }

      await refreshCurrentPage();
      return inserted?.id;
    } else {
      // GUEST path — fuzzy duplicate check against local items
      const localCandidates = allLocalItems.map(p => ({
        id: p.id,
        title: p.title,
        prompt: p.prompt,
      }));
      const similar = findSimilarPrompts(prompt.prompt, localCandidates, 0.6);
      if (similar.length > 0) {
        toast.warning(`פרומפט דומה כבר קיים: "${similar[0].title}"`, {
          duration: 8000,
        });
        return undefined;
      }

      const nextSortIndex = allLocalItems
        .filter((item) => item.personal_category === prompt.personal_category)
        .reduce((max, item) => Math.max(max, item.sort_index ?? -1), -1) + 1;

      const newId = crypto.randomUUID();
      const newItem: PersonalPrompt = {
        ...prompt,
        id: newId,
        use_count: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
        sort_index: nextSortIndex,
        capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
        tags: prompt.tags || [],
        last_used_at: null,
        savedAt: Date.now()
      } as PersonalPrompt & { savedAt: number };

      setAllLocalItems(prev => [newItem, ...prev]);
      return newId;
    }
  };

  const removePrompt = async (id: string) => {
    if (user) {
      await supabase.from('personal_library').delete().eq('id', id).eq('user_id', user.id);
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => prev.filter(p => p.id !== id));
    }
  };

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

  const incrementUseCount = async (id: string) => {
    const now = Date.now();
    if (user) {
      await supabase.rpc('increment_use_count', { item_id: id, user_id_input: user.id }).then(async (res) => {
        if (res.error) {
          const { data: current } = await supabase
            .from('personal_library')
            .select('use_count')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
          await supabase
            .from('personal_library')
            .update({ use_count: (current?.use_count ?? 0) + 1, last_used_at: new Date(now).toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);
        }
      });
      // Optimistically update the visible page item without a full re-fetch
      setPersonalLibrary(prev =>
        prev.map(p => p.id === id ? { ...p, use_count: p.use_count + 1, updated_at: now, last_used_at: now } : p)
      );
    } else {
      setAllLocalItems(prev =>
        prev.map(p => p.id === id ? { ...p, use_count: p.use_count + 1, updated_at: now, last_used_at: now } : p)
      );
    }
  };

  const togglePin = async (id: string) => {
    if (user) {
      // Read current state from page
      const item = personalLibrary.find(p => p.id === id);
      if (!item) return;
      const newPinned = !item.is_pinned;
      const { error } = await supabase
        .from('personal_library')
        .update({ is_pinned: newPinned })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) logger.error('[useLibrary] togglePin error:', error);
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => {
        const item = prev.find(p => p.id === id);
        if (!item) return prev;
        const newPinned = !item.is_pinned;
        return prev.map(p => p.id === id ? { ...p, is_pinned: newPinned, updated_at: Date.now() } : p);
      });
    }
  };

  const ratePrompt = async (id: string, success: boolean) => {
    const field = success ? 'success_count' : 'fail_count';
    if (user) {
      const { data: current } = await supabase
        .from('personal_library')
        .select('success_count, fail_count')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      const currentVal = success
        ? (current?.success_count ?? 0)
        : (current?.fail_count ?? 0);
      const { error } = await supabase
        .from('personal_library')
        .update({ [field]: currentVal + 1 })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) logger.error('[useLibrary] ratePrompt error:', error);
      // Optimistic update to visible page
      setPersonalLibrary(prev =>
        prev.map(p =>
          p.id === id ? { ...p, [field]: (p[field as keyof PersonalPrompt] as number ?? 0) + 1 } : p
        )
      );
    } else {
      setAllLocalItems(prev =>
        prev.map(p =>
          p.id === id ? { ...p, [field]: (p[field as keyof PersonalPrompt] as number ?? 0) + 1 } : p
        )
      );
    }
  };

  const updatePrompt = async (id: string, updates: Partial<PersonalPrompt>) => {
    const defined: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        defined[key] = value;
      }
    }
    if (Object.keys(defined).length === 0) return;

    if (user) {
      await supabase
        .from('personal_library')
        .update(defined)
        .eq('id', id)
        .eq('user_id', user.id);
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev =>
        prev.map(p =>
          p.id === id ? { ...p, ...defined, updated_at: Date.now() } : p
        )
      );
    }
  };

  // Anchor 1 — bump last_used_at on personal library prompts via the
  // SECURITY DEFINER RPC. Fire-and-forget, never throws to the caller.
  const bumpPersonalLibraryLastUsed = (id: string): void => {
    if (!user) return;
    void supabase
      .rpc('bump_prompt_last_used', { p_table: 'personal_library', p_id: id })
      .then(({ error }) => {
        if (error) {
          logger.warn('[useLibrary] bump_prompt_last_used failed:', error.message);
        }
      });
  };

  const updatePromptContent = async (id: string, prompt: string, prompt_style?: string) => {
    const trimmed = prompt.trim();
    if (user) {
      const updates: { prompt?: string; prompt_style?: string } = { prompt: trimmed || prompt };
      if (typeof prompt_style === "string") {
        updates.prompt_style = prompt_style;
      }
      await supabase
        .from('personal_library')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                prompt: trimmed || p.prompt,
                prompt_style: typeof prompt_style === "string" ? prompt_style : p.prompt_style,
                updated_at: Date.now(),
              }
            : p
        )
      );
    }
  };

  const reorderPrompts = async (category: string, orderedIds: string[]) => {
    if (user) {
      const BATCH_SIZE = 10;
      const updates = orderedIds.map((id, index) => ({ id, sort_index: index }));
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(u =>
            supabase.from('personal_library').update({ sort_index: u.sort_index }).eq('id', u.id).eq('user_id', user.id)
          )
        );
      }
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => {
        const orderMap = new Map(orderedIds.map((promptId, index) => [promptId, index]));
        return prev.map(item =>
          item.personal_category === category && orderMap.has(item.id)
            ? { ...item, sort_index: orderMap.get(item.id) }
            : item
        );
      });
    }
  };

  const addCategory = (name: string) => {
    if (!personalCategories.includes(name)) {
      setPersonalCategories(prev => [...prev, name]);
    }
  };

  const renameCategory = async (fromName: string, toName: string) => {
    const trimmed = toName.replace(/\s+/g, " ").trim();
    if (!trimmed || trimmed === fromName) return;

    setPersonalCategories(prev => {
      const next = prev.map(cat => (cat === fromName ? trimmed : cat));
      return Array.from(new Set(next.filter(Boolean)));
    });

    if (user) {
      await supabase
        .from('personal_library')
        .update({ personal_category: trimmed })
        .eq('user_id', user.id)
        .eq('personal_category', fromName);

      // Re-index the renamed category
      const { data: renamedItems } = await supabase
        .from('personal_library')
        .select('id')
        .eq('user_id', user.id)
        .eq('personal_category', trimmed)
        .order('sort_index', { ascending: true });

      if (renamedItems && renamedItems.length > 0) {
        const BATCH_SIZE = 10;
        const indexUpdates = renamedItems.map((row, index) => ({ id: row.id, sort_index: index }));
        for (let i = 0; i < indexUpdates.length; i += BATCH_SIZE) {
          const batch = indexUpdates.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(({ id, sort_index }) =>
              supabase.from('personal_library').update({ sort_index }).eq('id', id).eq('user_id', user.id)
            )
          );
        }
      }

      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => {
        const updated = prev.map(item =>
          item.personal_category === fromName
            ? { ...item, personal_category: trimmed, updated_at: Date.now() }
            : item
        );

        const targetItems = updated
          .filter(item => item.personal_category === trimmed)
          .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
          .map((item, index) => ({ ...item, sort_index: index }));

        const targetMap = new Map(targetItems.map(item => [item.id, item]));
        return updated.map(item => targetMap.get(item.id) ?? item);
      });
    }
  };

  const deleteCategory = async (categoryName: string, mode: 'move' | 'delete' = 'move') => {
    // Remove from local categories list
    setPersonalCategories(prev => prev.filter(c => c !== categoryName));

    if (user) {
      if (mode === 'delete') {
        // Delete all prompts in this category
        await supabase
          .from('personal_library')
          .delete()
          .eq('user_id', user.id)
          .eq('personal_category', categoryName);
      } else {
        // Move all prompts to default category (כללי)
        await supabase
          .from('personal_library')
          .update({ personal_category: 'כללי' })
          .eq('user_id', user.id)
          .eq('personal_category', categoryName);
      }
      await refreshCurrentPage();
    } else {
      if (mode === 'delete') {
        setAllLocalItems(prev => prev.filter(item => item.personal_category !== categoryName));
      } else {
        setAllLocalItems(prev => prev.map(item =>
          item.personal_category === categoryName
            ? { ...item, personal_category: 'כללי', updated_at: Date.now() }
            : item
        ));
      }
    }
  };

  const movePrompt = async (id: string, targetCategory: string, targetIndex?: number) => {
    const trimmed = targetCategory.replace(/\s+/g, " ").trim();
    if (!trimmed) return;

    setPersonalCategories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });

    if (user) {
      // Determine insert position
      const { count: catCount } = await supabase
        .from('personal_library')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('personal_category', trimmed)
        .neq('id', id);

      const insertAt = targetIndex !== undefined
        ? Math.max(0, Math.min(targetIndex, catCount ?? 0))
        : (catCount ?? 0);

      // Shift items at or after insertAt
      const { data: existingItems } = await supabase
        .from('personal_library')
        .select('id, sort_index')
        .eq('user_id', user.id)
        .eq('personal_category', trimmed)
        .neq('id', id)
        .order('sort_index', { ascending: true });

      if (existingItems) {
        const needShift = existingItems.filter(row => (row.sort_index ?? 0) >= insertAt);
        if (needShift.length > 0) {
          const BATCH_SIZE = 10;
          for (let i = 0; i < needShift.length; i += BATCH_SIZE) {
            const batch = needShift.slice(i, i + BATCH_SIZE);
            await Promise.all(
              batch.map(row =>
                supabase.from('personal_library').update({ sort_index: (row.sort_index ?? 0) + 1 }).eq('id', row.id).eq('user_id', user.id)
              )
            );
          }
        }
      }

      await supabase
        .from('personal_library')
        .update({ personal_category: trimmed, sort_index: insertAt })
        .eq('id', id)
        .eq('user_id', user.id);

      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => {
        const item = prev.find(p => p.id === id);
        if (!item) return prev;
        const sourceCategory = item.personal_category ?? 'כללי';

        const without = prev.filter(p => p.id !== id);
        const sourceItems = without
          .filter(p => p.personal_category === sourceCategory)
          .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
        const targetItems = without
          .filter(p => p.personal_category === trimmed)
          .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));

        const insertAt = Math.max(0, Math.min(targetIndex ?? targetItems.length, targetItems.length));
        const moved = { ...item, personal_category: trimmed, updated_at: Date.now() };
        const nextTarget = [...targetItems.slice(0, insertAt), moved, ...targetItems.slice(insertAt)];
        const reindexedTarget = nextTarget.map((p, index) => ({ ...p, sort_index: index }));
        const reindexedSource = sourceItems.map((p, index) => ({ ...p, sort_index: index }));

        const reindexedMap = new Map(
          [...reindexedTarget, ...reindexedSource].map(p => [p.id, p])
        );
        return without.map(i => reindexedMap.get(i.id) ?? i).concat(reindexedMap.get(id) as PersonalPrompt);
      });
    }
  };

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

  const movePrompts = async (ids: string[], category: string) => {
    const trimmed = category.replace(/\s+/g, " ").trim();
    if (!trimmed) return;

    setPersonalCategories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });

    try {
      if (user) {
        const { count: catCount } = await supabase
          .from('personal_library')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('personal_category', trimmed)
          .not('id', 'in', `(${ids.join(',')})`);

        let nextIdx = catCount ?? 0;

        const BATCH_SIZE = 10;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map((id, batchOffset) =>
              supabase
                .from('personal_library')
                .update({
                  personal_category: trimmed,
                  sort_index: nextIdx + batchOffset,
                  updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', user.id)
            )
          );
          const error = results.find(r => r.error)?.error;
          if (error) throw error;
          nextIdx += batch.length;
        }

        await refreshCurrentPage();
      } else {
        setAllLocalItems(prev => {
          const targetItems = prev
            .filter(p => p.personal_category === trimmed && !ids.includes(p.id))
            .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));

          let nextIdx = targetItems.length;

          return prev.map(p => {
            if (ids.includes(p.id)) {
              const updated = { ...p, personal_category: trimmed, sort_index: nextIdx, updated_at: Date.now() };
              nextIdx++;
              return updated;
            }
            return p;
          });
        });
      }
    } catch (err) {
      logger.error("[useLibrary] movePrompts error:", err);
      throw err;
    }
  };

  const addPrompts = async (prompts: Omit<PersonalPrompt, 'id' | 'use_count' | 'created_at' | 'updated_at'>[]) => {
    if (prompts.length === 0) return;

    if (user) {
      // Deduplicate: fetch existing prompt texts to avoid inserting duplicates
      const { data: existingRows } = await supabase
        .from('personal_library')
        .select('prompt')
        .eq('user_id', user.id);
      const existingTexts = new Set((existingRows ?? []).map((r: { prompt: string }) => r.prompt.trim()));

      // Also deduplicate within the batch itself
      const seenInBatch = new Set<string>();
      const uniquePrompts = prompts.filter(p => {
        const key = p.prompt.trim();
        if (existingTexts.has(key) || seenInBatch.has(key)) return false;
        seenInBatch.add(key);
        return true;
      });

      if (uniquePrompts.length === 0) {
        toast.warning("כל הפרומפטים כבר קיימים בספרייה");
        return;
      }

      if (uniquePrompts.length < prompts.length) {
        const skipped = prompts.length - uniquePrompts.length;
        toast.info(`${skipped} פרומפטים כפולים דולגו`);
      }

      // Compute sort indices per category
      const categoriesInBatch = Array.from(new Set(uniquePrompts.map(p => p.personal_category ?? 'כללי')));
      const catCountMap: Record<string, number> = {};
      await Promise.all(
        categoriesInBatch.map(async (cat) => {
          const { count } = await supabase
            .from('personal_library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('personal_category', cat);
          catCountMap[cat] = count ?? 0;
        })
      );

      const runningIdx: Record<string, number> = { ...catCountMap };
      const insertData = uniquePrompts.map(p => {
        const cat = p.personal_category ?? 'כללי';
        const sortIndex = runningIdx[cat] ?? 0;
        runningIdx[cat] = sortIndex + 1;
        return {
          user_id: user.id,
          title: p.title,
          prompt: p.prompt,
          prompt_style: p.prompt_style ?? null,
          category: p.category,
          personal_category: cat,
          use_case: p.use_case,
          source: p.source,
          sort_index: sortIndex,
          capability_mode: p.capability_mode ?? CapabilityMode.STANDARD,
          tags: p.tags || []
        };
      });

      const { error } = await supabase.from('personal_library').insert(insertData);
      if (error) {
        logger.error('[useLibrary] addPrompts error:', error);
        return;
      }

      await refreshCurrentPage();
    } else {
      const newItems: PersonalPrompt[] = prompts.map((p, i) => ({
        ...p,
        id: crypto.randomUUID(),
        use_count: 0,
        created_at: Date.now() + i,
        updated_at: Date.now() + i,
        sort_index: 0,
        capability_mode: p.capability_mode ?? CapabilityMode.STANDARD,
        tags: p.tags || []
      }));

      const categoriesInBatch = Array.from(new Set(newItems.map(item => item.personal_category)));

      setAllLocalItems(prev => {
        const updated = [...prev];
        categoriesInBatch.forEach(cat => {
          const currentMax = updated
            .filter(p => p.personal_category === cat)
            .reduce((max, item) => Math.max(max, item.sort_index ?? -1), -1);

          let runningIdx = currentMax + 1;
          newItems.forEach(item => {
            if (item.personal_category === cat) {
              item.sort_index = runningIdx++;
            }
          });
        });
        return [...newItems, ...updated];
      });
    }
  };

  const updateTags = async (id: string, tags: string[]) => {
    if (user) {
      const { error } = await supabase
        .from("personal_library")
        .update({ tags })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        logger.error("[useLibrary] updateTags error:", error);
      }
      // Optimistic update to visible page
      setPersonalLibrary(prev => prev.map(p => p.id === id ? { ...p, tags } : p));
    } else {
      setAllLocalItems(prev => prev.map(p => p.id === id ? { ...p, tags } : p));
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
