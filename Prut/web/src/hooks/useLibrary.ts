"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { getApiPath } from '@/lib/api-path';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { toast } from 'sonner';
import { logger } from "@/lib/logger";

import { findSimilarPrompts } from "@/lib/prompt-similarity";
import { applyGuestFiltersAndSort } from "@/lib/library/sort";
import { getCategoriesKey, readOrderMap, persistOrderMap } from "@/lib/library/row-mapper";
import { useLibraryFetch } from './useLibraryFetch';
import { useLibraryAuth } from './useLibraryAuth';

const STORAGE_KEY = 'peroot_personal_library';
const DEFAULT_PAGE_SIZE = 15;

export function useLibrary() {
  // Current page items (server users) or sliced local items (guests)
  const [personalLibrary, setPersonalLibrary] = useState<PersonalPrompt[]>([]);
  // Full in-memory set for guest users only (used for duplicate checks, sort calculations)
  const [allLocalItems, setAllLocalItems] = useState<PersonalPrompt[]>([]);
  const [personalCategories, setPersonalCategories] = useState<string[]>([]);
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
      // Log library save (fire-and-forget — don't block on logging failure)
      void supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'library_save',
        entity_type: 'personal_library',
        entity_id: inserted?.id ?? null,
        details: { title: prompt.title, category: prompt.personal_category ?? prompt.category },
      });
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
