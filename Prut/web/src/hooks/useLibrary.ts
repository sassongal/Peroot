"use client";

import { useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';

const STORAGE_KEY = 'peroot_personal_library';
const CATEGORIES_KEY = 'peroot_personal_categories';
const ORDER_KEY = 'peroot_personal_order';

const getOrderKey = (userId?: string | null) =>
  userId ? `${ORDER_KEY}_${userId}` : ORDER_KEY;

const readOrderMap = (userId?: string | null) => {
  const key = getOrderKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
  } catch (error) {
    console.warn("Failed to parse personal order map", error);
  }
  return {};
};

const persistOrderMap = (userId: string | null, items: PersonalPrompt[]) => {
  const key = getOrderKey(userId);
  const next: Record<string, number> = {};
  items.forEach((item, index) => {
    next[item.id] = typeof item.sort_index === "number" ? item.sort_index : index;
  });
  localStorage.setItem(key, JSON.stringify(next));
};

export function useLibrary() {
  const [personalLibrary, setPersonalLibrary] = useState<PersonalPrompt[]>([]);
  const [personalCategories, setPersonalCategories] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser);

      if (currentUser) {
        const orderMap = readOrderMap(currentUser.id);
        // Fetch Library from DB
        const { data: libData } = await supabase
          .from('personal_library')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false });

        if (libData && mounted) {
            setPersonalLibrary(
              libData.map((row, index) => ({
                id: row.id,
                title_he: row.title_he,
                prompt_he: row.prompt_he,
                prompt_style: row.prompt_style ?? undefined,
                category: row.category ?? "",
                personal_category: row.personal_category ?? null,
                use_case: row.use_case,
                source: row.source,
                use_count: row.use_count,
                capability_mode: row.capability_mode ?? CapabilityMode.STANDARD,
                tags: row.tags ?? [],
                created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                updated_at: row.updated_at ? new Date(row.updated_at).getTime() : (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
                sort_index:
                  typeof orderMap[row.id] === "number" ? orderMap[row.id] : index,
              }))
            );
        }

        // Categories are derived from items + manual list
        const storedCats = localStorage.getItem(CATEGORIES_KEY);
        if (storedCats && mounted) {
            setPersonalCategories(JSON.parse(storedCats));
        }
      } else {
        const orderMap = readOrderMap(null);
        // Load from LocalStorage
        const storedLib = localStorage.getItem(STORAGE_KEY);
        if (storedLib && mounted) {
          try {
            const parsed = JSON.parse(storedLib);
            if (Array.isArray(parsed)) {
              setPersonalLibrary(
                parsed.map((row, index) => ({
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
                  tags: row.tags || []
                }))
              );
            }
          } catch (error) {
            console.warn("Failed to parse personal library", error);
          }
        }
        
        const storedCats = localStorage.getItem(CATEGORIES_KEY);
        if (storedCats && mounted) setPersonalCategories(JSON.parse(storedCats));
      }
      if (mounted) setIsLoaded(true);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      
      if (newUser && !user) {
          // Just logged in - MIGRATE GUEST DATA
          const localStr = localStorage.getItem(STORAGE_KEY);
          if (localStr) {
               try {
                   const localItems = JSON.parse(localStr) as PersonalPrompt[];
                   if (Array.isArray(localItems) && localItems.length > 0) {
                       console.log("Migrating guest items:", localItems.length);
                       
                       const itemsToInsert = localItems.map(item => ({
                           user_id: newUser.id,
                           title_he: item.title_he,
                           prompt_he: item.prompt_he,
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
                       
                       // Perform Bulk Insert
                       await supabase.from('personal_library').insert(itemsToInsert);
                       
                       localStorage.removeItem(STORAGE_KEY);
                       localStorage.removeItem(CATEGORIES_KEY);
                       localStorage.removeItem(ORDER_KEY);
                   }
               } catch (e) {
                   console.error("Migration failed", e);
               }
          }
      }

      setUser((prev) => {
        if (prev?.id !== newUser?.id) {
          init();
        }
        return newUser;
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, user]); // Added user dependency to detect transition

  // Sync to local/session storage
  useEffect(() => {
    if (isLoaded && !user) {
      // Guest mode: session-only storage
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(personalLibrary));
      sessionStorage.setItem(CATEGORIES_KEY, JSON.stringify(personalCategories));
    }
    if (isLoaded && user) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(personalCategories));
    }
    if (isLoaded) {
      persistOrderMap(user?.id ?? null, personalLibrary);
    }
  }, [personalLibrary, personalCategories, isLoaded, user]);

  const addPrompt = async (prompt: Omit<PersonalPrompt, 'id' | 'use_count' | 'created_at' | 'updated_at'>) => {
    const nextSortIndex = personalLibrary
      .filter((item) => item.personal_category === prompt.personal_category)
      .reduce((max, item) => Math.max(max, item.sort_index ?? -1), -1) + 1;

    const newItem: PersonalPrompt = {
      ...prompt,
      id: crypto.randomUUID(),
      use_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      sort_index: nextSortIndex,
      capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
      tags: prompt.tags || []
    };

    setPersonalLibrary(prev => [newItem, ...prev]);

    if (user) {
        const insertData: any = {
           user_id: user.id,
           title_he: prompt.title_he,
           prompt_he: prompt.prompt_he,
           prompt_style: prompt.prompt_style ?? null,
           category: prompt.category,
           personal_category: prompt.personal_category,
           use_case: prompt.use_case,
           source: prompt.source,
           sort_index: nextSortIndex,
           capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
        };
        if (prompt.tags) insertData.tags = prompt.tags;

      await supabase.from('personal_library').insert(insertData);
    }
  };

  const removePrompt = async (id: string) => {
    setPersonalLibrary(prev => prev.filter(p => p.id !== id));
    if (user) {
      await supabase.from('personal_library').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const updateCategory = async (id: string, category: string) => {
    const nextSortIndex = personalLibrary
      .filter((item) => item.personal_category === category && item.id !== id)
      .reduce((max, item) => Math.max(max, item.sort_index ?? -1), -1) + 1;

    setPersonalLibrary(prev => prev.map(p => p.id === id ? { ...p, personal_category: category, sort_index: nextSortIndex, updated_at: Date.now() } : p));
    if (user) {
      await supabase.from('personal_library').update({ 
        personal_category: category,
        sort_index: nextSortIndex 
      }).eq('id', id).eq('user_id', user.id);
    }
  };

  const incrementUseCount = async (id: string) => {
    setPersonalLibrary(prev => prev.map(p => p.id === id ? { ...p, use_count: p.use_count + 1, updated_at: Date.now() } : p));
    if (user) {
        // We'd ideally use rpc for atomic increment, but this works for now
        const item = personalLibrary.find(p => p.id === id);
        if (item) {
            await supabase.from('personal_library').update({ use_count: item.use_count + 1 }).eq('id', id).eq('user_id', user.id);
        }
    }
  };

  const updatePrompt = async (id: string, updates: { title_he?: string; use_case?: string }) => {
    setPersonalLibrary(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              title_he: updates.title_he ?? p.title_he,
              use_case: updates.use_case ?? p.use_case,
              updated_at: Date.now(),
            }
          : p
      )
    );

    if (user) {
      await supabase
        .from('personal_library')
        .update({
          title_he: updates.title_he,
          use_case: updates.use_case,
        })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const updatePromptContent = async (id: string, prompt_he: string, prompt_style?: string) => {
    const trimmed = prompt_he.trim();
    setPersonalLibrary(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              prompt_he: trimmed || p.prompt_he,
              prompt_style: typeof prompt_style === "string" ? prompt_style : p.prompt_style,
              updated_at: Date.now(),
            }
          : p
      )
    );

    if (user) {
      const updates: { prompt_he?: string; prompt_style?: string } = {
        prompt_he: trimmed || prompt_he,
      };
      if (typeof prompt_style === "string") {
        updates.prompt_style = prompt_style;
      }
      await supabase
        .from('personal_library')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const reorderPrompts = async (category: string, orderedIds: string[]) => {
    setPersonalLibrary(prev => {
      const orderMap = new Map(orderedIds.map((promptId, index) => [promptId, index]));
      return prev.map(item =>
        item.personal_category === category && orderMap.has(item.id)
          ? { ...item, sort_index: orderMap.get(item.id) }
          : item
      );
    });

    if (user) {
        // Update sort indices in Supabase
        const updates = orderedIds.map((id, index) => ({
            id,
            user_id: user.id,
            sort_index: index
        }));
        
        await supabase.from('personal_library').upsert(updates, { onConflict: 'id' });
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

    let updatedItems: PersonalPrompt[] = [];
    setPersonalLibrary(prev => {
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
      updatedItems = updated.map(item => targetMap.get(item.id) ?? item);
      return updatedItems;
    });

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

      const targetUpdates = updatedItems
        .filter(item => item.personal_category === trimmed)
        .map(item => ({
          id: item.id,
          user_id: user.id,
          sort_index: item.sort_index ?? 0,
        }));

      if (targetUpdates.length > 0) {
        await supabase.from('personal_library').upsert(targetUpdates, { onConflict: 'id' });
      }
    }
  };

  const movePrompt = async (id: string, targetCategory: string, targetIndex?: number) => {
    const trimmed = targetCategory.replace(/\s+/g, " ").trim();
    if (!trimmed) return;

    let updatedItems: PersonalPrompt[] = [];
    let sourceCategory = trimmed;

    setPersonalLibrary(prev => {
      const item = prev.find(p => p.id === id);
      if (!item) return prev;
      sourceCategory = item.personal_category ?? "General";

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
      updatedItems = without.map(item => reindexedMap.get(item.id) ?? item);
      updatedItems.push(reindexedMap.get(id) as PersonalPrompt);
      return updatedItems;
    });

    setPersonalCategories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });

    if (user) {
      const updates = updatedItems
        .filter(item => item.personal_category === trimmed || item.personal_category === sourceCategory)
        .map(item => ({
          id: item.id,
          user_id: user.id,
          personal_category: item.personal_category,
          sort_index: item.sort_index ?? 0,
        }));

      if (updates.length > 0) {
        await supabase.from('personal_library').upsert(updates, { onConflict: 'id' });
      }
    }
  };

  const deletePrompts = async (ids: string[]) => {
      try {
        const { error } = await supabase
            .from("personal_library")
            .delete()
            .in("id", ids);
        if (error) throw error;
        
        setPersonalLibrary(prev => prev.filter(p => !ids.includes(p.id)));
      } catch (err) {
        throw err;
      }
  };

  const movePrompts = async (ids: string[], category: string) => {
      try {
        const { error } = await supabase
            .from("personal_library")
            .update({ personal_category: category })
            .in("id", ids);
        if (error) throw error;

        setPersonalLibrary(prev => prev.map(p => 
            ids.includes(p.id) ? { ...p, personal_category: category } : p
        ));
      } catch (err) {
        throw err;
      }
  };

  const updateTags = async (id: string, tags: string[]) => {
      try {
         const { error } = await supabase
            .from("personal_library")
            .update({ tags })
            .eq("id", id);
         if (error) throw error;
         
         setPersonalLibrary(prev => prev.map(p => 
            p.id === id ? { ...p, tags } : p
         ));
      } catch (err) {
         throw err;
      }
  };

  return { 
    personalLibrary, 
    personalCategories, 
    isLoaded, 
    addPrompt, 
    removePrompt, 
    updateCategory, 
    incrementUseCount,
    updatePrompt,
    updatePromptContent,
    reorderPrompts,
    movePrompt,
    renameCategory,
    addCategory,
    deletePrompts,
    movePrompts,
    updateTags
  };
}
