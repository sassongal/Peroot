"use client";

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface UsePromptOrderingParams {
  supabase: ReturnType<typeof createClient>;
  user: User | null;
  allLocalItems: PersonalPrompt[];
  setAllLocalItems: React.Dispatch<React.SetStateAction<PersonalPrompt[]>>;
  personalCategories: string[];
  setPersonalCategories: React.Dispatch<React.SetStateAction<string[]>>;
  refreshCurrentPage: () => Promise<void> | void;
}

export function usePromptOrdering({
  supabase,
  user,
  allLocalItems,
  setAllLocalItems,
  personalCategories,
  setPersonalCategories,
  refreshCurrentPage,
}: UsePromptOrderingParams) {

  const reorderPrompts = useCallback(async (category: string, orderedIds: string[]) => {
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
  }, [supabase, user, setAllLocalItems, refreshCurrentPage]);

  const movePrompt = useCallback(async (id: string, targetCategory: string, targetIndex?: number) => {
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
  }, [supabase, user, setPersonalCategories, setAllLocalItems, refreshCurrentPage]);

  const movePrompts = useCallback(async (ids: string[], category: string) => {
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
      logger.error("[usePromptOrdering] movePrompts error:", err);
      throw err;
    }
  }, [supabase, user, setPersonalCategories, setAllLocalItems, refreshCurrentPage]);

  const addPrompts = useCallback(async (prompts: Omit<PersonalPrompt, 'id' | 'use_count' | 'created_at' | 'updated_at'>[]) => {
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
        logger.error('[usePromptOrdering] addPrompts error:', error);
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
  }, [supabase, user, setAllLocalItems, refreshCurrentPage]);

  return { reorderPrompts, movePrompt, movePrompts, addPrompts };
}
