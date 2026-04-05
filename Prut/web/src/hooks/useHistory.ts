"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface HistoryItem {
  id: string; // UUID
  original: string;
  enhanced: string;
  tone: string;
  category: string;
  title?: string;
  source?: string; // "web" | "extension"
  timestamp: number;
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

      return data.map(row => ({
        id: row.id,
        original: row.prompt,
        enhanced: row.enhanced_prompt,
        tone: row.tone,
        category: row.category,
        title: row.title || undefined,
        source: row.source || "web",
        timestamp: new Date(row.created_at).getTime(),
      }));
    },
    // When user is null, we still run the query but it returns [] immediately.
    // This keeps isLoaded (isSuccess) accurate for consumers.
  });

  // Add to history mutation with optimistic update
  const addMutation = useMutation({
    mutationFn: async ({ item, optimisticId }: { item: Omit<HistoryItem, 'id' | 'timestamp'>; optimisticId: string }) => {
      const currentUser = userRef.current;
      if (!currentUser) return null;

      // Fire-and-forget DB insert — errors logged but don't block UI
      supabase.from('history').insert({
        user_id: currentUser.id,
        prompt: item.original,
        enhanced_prompt: item.enhanced,
        category: item.category,
        tone: item.tone,
        title: item.title || null,
      }).then(({ error }) => {
        if (error) logger.error('[useHistory] addToHistory insert failed:', error);
      });

      return { ...item, id: optimisticId, timestamp: Date.now() } as HistoryItem;
    },
    onMutate: async ({ item, optimisticId }) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const queryKey = ['history', currentUser.id];
      await queryClient.cancelQueries({ queryKey });

      const previousHistory = queryClient.getQueryData<HistoryItem[]>(queryKey);

      const optimisticItem: HistoryItem = {
        ...item,
        id: optimisticId,
        timestamp: Date.now(),
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
    (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
      addMutation.mutate({ item, optimisticId: crypto.randomUUID() });
    },
    [addMutation]
  );

  const clearHistory = useCallback(async () => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  return { history, addToHistory, clearHistory, isLoaded, user };
}
