"use client";

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { findSimilarPrompts } from '@/lib/prompt-similarity';

interface UsePromptMutationsParams {
  supabase: ReturnType<typeof createClient>;
  user: User | null;
  allLocalItems: PersonalPrompt[];
  setAllLocalItems: React.Dispatch<React.SetStateAction<PersonalPrompt[]>>;
  personalLibrary: PersonalPrompt[];
  setPersonalLibrary: React.Dispatch<React.SetStateAction<PersonalPrompt[]>>;
  refreshCurrentPage: () => Promise<void> | void;
}

export function usePromptMutations({
  supabase,
  user,
  allLocalItems,
  setAllLocalItems,
  personalLibrary,
  setPersonalLibrary,
  refreshCurrentPage,
}: UsePromptMutationsParams) {
  const addPrompt = useCallback(async (
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
  }, [user, supabase, allLocalItems, setAllLocalItems, refreshCurrentPage]);

  const removePrompt = useCallback(async (id: string) => {
    if (user) {
      await supabase.from('personal_library').delete().eq('id', id).eq('user_id', user.id);
      await refreshCurrentPage();
    } else {
      setAllLocalItems(prev => prev.filter(p => p.id !== id));
    }
  }, [user, supabase, setAllLocalItems, refreshCurrentPage]);

  const updatePrompt = useCallback(async (id: string, updates: Partial<PersonalPrompt>) => {
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
  }, [user, supabase, setAllLocalItems, refreshCurrentPage]);

  const ratePrompt = useCallback(async (id: string, success: boolean) => {
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
  }, [user, supabase, setPersonalLibrary, setAllLocalItems]);

  const incrementUseCount = useCallback(async (id: string) => {
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
  }, [user, supabase, setPersonalLibrary, setAllLocalItems]);

  const togglePin = useCallback(async (id: string) => {
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
  }, [user, supabase, personalLibrary, setAllLocalItems, refreshCurrentPage]);

  const updatePromptContent = useCallback(async (id: string, prompt: string, prompt_style?: string) => {
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
  }, [user, supabase, setAllLocalItems, refreshCurrentPage]);

  // Anchor 1 — bump last_used_at on personal library prompts via the
  // SECURITY DEFINER RPC. Fire-and-forget, never throws to the caller.
  const bumpPersonalLibraryLastUsed = useCallback((id: string): void => {
    if (!user) return;
    void supabase
      .rpc('bump_prompt_last_used', { p_table: 'personal_library', p_id: id })
      .then(({ error }) => {
        if (error) {
          logger.warn('[useLibrary] bump_prompt_last_used failed:', error.message);
        }
      });
  }, [user, supabase]);

  const updateTags = useCallback(async (id: string, tags: string[]) => {
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
  }, [user, supabase, setPersonalLibrary, setAllLocalItems]);

  return {
    addPrompt,
    removePrompt,
    updatePrompt,
    ratePrompt,
    incrementUseCount,
    togglePin,
    updatePromptContent,
    bumpPersonalLibraryLastUsed,
    updateTags,
  };
}
