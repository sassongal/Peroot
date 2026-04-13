"use client";

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UseLibraryCategoriesParams {
  supabase: ReturnType<typeof createClient>;
  user: User | null;
  refreshCurrentPage?: () => Promise<void>;
  setAllLocalItems?: React.Dispatch<React.SetStateAction<import('@/lib/types').PersonalPrompt[]>>;
}

export function useLibraryCategories({
  supabase,
  user,
  refreshCurrentPage,
  setAllLocalItems,
}: UseLibraryCategoriesParams) {
  const [personalCategories, setPersonalCategories] = useState<string[]>([]);

  const addCategory = useCallback((name: string) => {
    setPersonalCategories(prev => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  }, []);

  const renameCategory = useCallback(async (fromName: string, toName: string) => {
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

      await refreshCurrentPage?.();
    } else {
      setAllLocalItems?.(prev => {
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
  }, [supabase, user, refreshCurrentPage, setAllLocalItems]);

  const deleteCategory = useCallback(async (categoryName: string, mode: 'move' | 'delete' = 'move') => {
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
      await refreshCurrentPage?.();
    } else {
      if (mode === 'delete') {
        setAllLocalItems?.(prev => prev.filter(item => item.personal_category !== categoryName));
      } else {
        setAllLocalItems?.(prev => prev.map(item =>
          item.personal_category === categoryName
            ? { ...item, personal_category: 'כללי', updated_at: Date.now() }
            : item
        ));
      }
    }
  }, [supabase, user, refreshCurrentPage, setAllLocalItems]);

  return {
    personalCategories,
    setPersonalCategories,
    addCategory,
    renameCategory,
    deleteCategory,
  };
}
