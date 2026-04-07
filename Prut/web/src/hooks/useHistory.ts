"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { fromHistoryRow } from '@/lib/prompt-entity';
import type { PromptEntity } from '@/lib/prompt-entity';

export interface HistoryItem {
  id: string; // UUID
  original: string;
  enhanced: string;
  tone: string;
  category: string;
  title?: string;
  source?: string; // "web" | "extension"
  timestamp: number;
  /** Full PromptEntity for use by DateBadge / BeforeAfterSplit. */
  entity: PromptEntity;
}



export function useHistory() {
  const [user, setUser] = useState<User | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const userRef = useRef<User | null>(null);
  const queryClient = useQueryClient();

  // Track auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser);
      userRef.current = currentUser;
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      if (userRef.current?.id !== newUser?.id) {
        userRef.current = newUser;
        setUser(newUser);
        // Invalidate history when user changes so it refetches
        queryClient.invalidateQueries({ queryKey: ['history'] });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  // Fetch history via useQuery
  const { data: history = [], isSuccess: isLoaded } = useQuery({
    queryKey: ['history', user?.id ?? null],
    queryFn: async (): Promise<HistoryItem[]> => {
      if (!user) return [];

      const { data } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!data) return [];

      return data.map((row) => {
        const entity = fromHistoryRow(row);
        return {
          id: entity.id,
          original: entity.original,
          enhanced: entity.enhanced,
          tone: entity.tone ?? '',
          category: entity.category,
          title: entity.title || undefined,
          source: entity.source,
          timestamp: new Date(entity.createdAt).getTime(),
          entity,
        } satisfies HistoryItem;
      });
    },
    // When user is null, we still run the query but it returns [] immediately.
    // This keeps isLoaded (isSuccess) accurate for consumers.
  });

  // Add to history mutation with optimistic update
  const addMutation = useMutation({
    mutationFn: async ({ item, optimisticId }: { item: Omit<HistoryItem, 'id' | 'timestamp' | 'entity'>; optimisticId: string }) => {
      const currentUser = userRef.current;
      if (!currentUser) return null;

      const nowIso = new Date().toISOString();

      // Fire-and-forget DB insert — errors logged but don't block UI
      supabase.from('history').insert({
        user_id: currentUser.id,
        prompt: item.original,
        enhanced_prompt: item.enhanced,
        category: item.category,
        tone: item.tone,
        title: item.title || null,
        updated_at: nowIso,
      }).then(({ error }) => {
        if (error) logger.error('[useHistory] addToHistory insert failed:', error);
      });

      const optimisticEntity = fromHistoryRow({
        id: optimisticId,
        prompt: item.original,
        enhanced_prompt: item.enhanced,
        category: item.category,
        tone: item.tone,
        title: item.title ?? '',
        source: item.source ?? 'web',
        created_at: nowIso,
        updated_at: nowIso,
      });

      return { ...item, id: optimisticId, timestamp: Date.now(), entity: optimisticEntity } satisfies HistoryItem;
    },
    onMutate: async ({ item, optimisticId }) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const queryKey = ['history', currentUser.id];
      await queryClient.cancelQueries({ queryKey });

      const previousHistory = queryClient.getQueryData<HistoryItem[]>(queryKey);

      const nowIso = new Date().toISOString();
      const optimisticEntity = fromHistoryRow({
        id: optimisticId,
        prompt: item.original,
        enhanced_prompt: item.enhanced,
        category: item.category,
        tone: item.tone,
        title: item.title ?? '',
        source: item.source ?? 'web',
        created_at: nowIso,
        updated_at: nowIso,
      });

      const optimisticItem: HistoryItem = {
        ...item,
        id: optimisticId,
        timestamp: Date.now(),
        entity: optimisticEntity,
      };

      queryClient.setQueryData<HistoryItem[]>(queryKey, (old = []) => {
        if (old[0]?.enhanced === optimisticItem.enhanced) return old;
        return [optimisticItem, ...old];
      });

      return { previousHistory };
    },
    onError: (_err, _item, context) => {
      const currentUser = userRef.current;
      if (currentUser && context?.previousHistory) {
        queryClient.setQueryData(['history', currentUser.id], context.previousHistory);
      }
    },
  });

  // Clear history mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('history').delete().eq('user_id', user.id);
    },
    onMutate: async () => {
      if (!user) return;
      const queryKey = ['history', user.id];
      await queryClient.cancelQueries({ queryKey });
      const previousHistory = queryClient.getQueryData<HistoryItem[]>(queryKey);
      queryClient.setQueryData<HistoryItem[]>(queryKey, []);
      return { previousHistory };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previousHistory) {
        queryClient.setQueryData(['history', user.id], context.previousHistory);
      }
    },
    onSettled: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['history', user.id] });
      }
    },
  });

  const addToHistory = useCallback(
    (item: Omit<HistoryItem, 'id' | 'timestamp' | 'entity'>) => {
      addMutation.mutate({ item, optimisticId: crypto.randomUUID() });
    },
    [addMutation]
  );

  const clearHistory = useCallback(async () => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  return { history, addToHistory, clearHistory, isLoaded, user };
}
