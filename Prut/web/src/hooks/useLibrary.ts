"use client";

import { useMemo, useState, useEffect } from 'react';
import { getApiPath } from '@/lib/api-path';
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
                title: row.title,
                prompt: row.prompt,
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
        // Prepare data for DB
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
           tags: prompt.tags || []
        };

      const { data, error } = await supabase.from('personal_library').insert(insertData).select().single();
      if (!error && data) {
          // Update the item in local state with the actual DB ID
          setPersonalLibrary(prev => prev.map(p => p.id === newItem.id ? { ...p, id: data.id } : p));
      }
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

  const updatePrompt = async (id: string, updates: { title?: string; use_case?: string }) => {
    setPersonalLibrary(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              title: updates.title ?? p.title,
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
          title: updates.title,
          use_case: updates.use_case,
        })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const updatePromptContent = async (id: string, prompt: string, prompt_style?: string) => {
    const trimmed = prompt.trim();
    setPersonalLibrary(prev =>
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

    if (user) {
      const updates: { prompt?: string; prompt_style?: string } = {
        prompt: trimmed || prompt,
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
      const trimmed = category.replace(/\s+/g, " ").trim();
      if (!trimmed) return;

      try {
        // 1. Calculate next sort indices for the target category
        // We append them to the end of the existing category
        const targetItems = personalLibrary
            .filter(p => p.personal_category === trimmed && !ids.includes(p.id))
            .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
        
        let nextIdx = targetItems.length;
        
        const updates = personalLibrary.map(p => {
            if (ids.includes(p.id)) {
                const updated = { ...p, personal_category: trimmed, sort_index: nextIdx, updated_at: Date.now() };
                nextIdx++;
                return updated;
            }
            return p;
        });

        // 2. Local State Update
        setPersonalLibrary(updates);
        
        // 3. Category Sync
        setPersonalCategories(prev => {
            if (prev.includes(trimmed)) return prev;
            return [...prev, trimmed];
        });

        // 4. DB Sync
        if (user) {
            const dbUpdates = updates
                .filter(p => ids.includes(p.id))
                .map(p => ({
                    id: p.id,
                    user_id: user.id,
                    personal_category: p.personal_category,
                    sort_index: p.sort_index,
                    updated_at: new Date(p.updated_at).toISOString()
                }));
            
            const { error } = await supabase
                .from("personal_library")
                .upsert(dbUpdates, { onConflict: 'id' });
            
            if (error) throw error;
        }
      } catch (err) {
        console.error("[useLibrary] movePrompts error:", err);
        throw err;
      }
  };

  const addPrompts = async (prompts: Omit<PersonalPrompt, 'id' | 'use_count' | 'created_at' | 'updated_at'>[]) => {
      if (prompts.length === 0) return;
      
      const newItems: PersonalPrompt[] = prompts.map((p, i) => ({
          ...p,
          id: crypto.randomUUID(),
          use_count: 0,
          created_at: Date.now() + i, // slight offset
          updated_at: Date.now() + i,
          sort_index: 0, // We'll fix indices shortly
          capability_mode: p.capability_mode ?? CapabilityMode.STANDARD,
          tags: p.tags || []
      }));

      // Calculate indices per category for the batch
      const categoriesInBatch = Array.from(new Set(newItems.map(item => item.personal_category)));
      
      categoriesInBatch.forEach(cat => {
          const currentMax = personalLibrary
              .filter(p => p.personal_category === cat)
              .reduce((max, item) => Math.max(max, item.sort_index ?? -1), -1);
          
          let runningIdx = currentMax + 1;
          newItems.forEach(item => {
              if (item.personal_category === cat) {
                  item.sort_index = runningIdx++;
              }
          });
      });

      setPersonalLibrary(prev => [...newItems, ...prev]);

      if (user) {
          const insertData = newItems.map(item => ({
              user_id: user.id,
              title: item.title,
              prompt: item.prompt,
              prompt_style: item.prompt_style ?? null,
              category: item.category,
              personal_category: item.personal_category,
              use_case: item.use_case,
              source: item.source,
              sort_index: item.sort_index,
              capability_mode: item.capability_mode,
              tags: item.tags
          }));

          const { data, error } = await supabase.from('personal_library').insert(insertData).select();
          if (!error && data) {
              // Sync IDs from DB
              setPersonalLibrary(prev => prev.map(p => {
                  const dbMatch = data.find(d => d.title === p.title && d.prompt === p.prompt);
                  return dbMatch ? { ...p, id: dbMatch.id } : p;
              }));
          }
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
       console.error('[useLibrary] Error updating profile:', error);
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
        console.error('[useLibrary] completeOnboarding error:', error);
        throw error;
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
    addPrompts,
    updateTags,
    updateProfile,
    completeOnboarding
  };
}
