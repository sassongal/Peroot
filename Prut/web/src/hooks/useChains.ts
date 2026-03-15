"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

export interface ChainStep {
  id: string;
  prompt_id?: string;  // Reference to personal_library prompt
  prompt_text: string;  // The actual prompt text (can be custom or from library)
  title: string;
  order: number;
}

export interface PromptChain {
  id: string;
  title: string;
  description: string;
  steps: ChainStep[];
  is_pinned: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const CHAINS_STORAGE_KEY = 'peroot_prompt_chains';

export function useChains() {
  const [chains, setChains] = useState<PromptChain[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser);
      userRef.current = currentUser;

      if (currentUser) {
        const { data } = await supabase
          .from('prompt_chains')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false });

        if (data && mounted) {
          setChains(data.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            steps: Array.isArray(row.steps) ? row.steps : [],
            is_pinned: row.is_pinned ?? false,
            use_count: row.use_count ?? 0,
            last_used_at: row.last_used_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })));
        }
      } else {
        // Guest: load from localStorage
        try {
          const stored = localStorage.getItem(CHAINS_STORAGE_KEY);
          if (stored && mounted) {
            setChains(JSON.parse(stored));
          }
        } catch (e) {
          logger.warn("Failed to parse chains", e);
        }
      }
      if (mounted) setIsLoaded(true);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      if (userRef.current?.id !== newUser?.id) {
        userRef.current = newUser;
        setUser(newUser);
        init();
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  // Sync guest data to localStorage
  useEffect(() => {
    if (isLoaded && !user) {
      localStorage.setItem(CHAINS_STORAGE_KEY, JSON.stringify(chains));
    }
  }, [chains, isLoaded, user]);

  const addChain = async (chain: Omit<PromptChain, 'id' | 'use_count' | 'last_used_at' | 'created_at' | 'updated_at'>) => {
    const newChain: PromptChain = {
      ...chain,
      id: crypto.randomUUID(),
      use_count: 0,
      last_used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setChains(prev => [newChain, ...prev]);

    if (user) {
      const { data, error } = await supabase.from('prompt_chains').insert({
        user_id: user.id,
        title: chain.title,
        description: chain.description,
        steps: chain.steps,
        is_pinned: chain.is_pinned,
      }).select().single();

      if (!error && data) {
        setChains(prev => prev.map(c => c.id === newChain.id ? { ...c, id: data.id } : c));
      }
    }
    return newChain.id;
  };

  const updateChain = async (id: string, updates: Partial<Pick<PromptChain, 'title' | 'description' | 'steps' | 'is_pinned'>>) => {
    setChains(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));
    if (user) {
      await supabase.from('prompt_chains').update(updates).eq('id', id).eq('user_id', user.id);
    }
  };

  const deleteChain = async (id: string) => {
    setChains(prev => prev.filter(c => c.id !== id));
    if (user) {
      await supabase.from('prompt_chains').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const incrementChainUseCount = async (id: string) => {
    const now = new Date().toISOString();
    setChains(prev => prev.map(c => c.id === id ? { ...c, use_count: c.use_count + 1, last_used_at: now } : c));
    if (user) {
      const chain = chains.find(c => c.id === id);
      await supabase.from('prompt_chains').update({
        use_count: (chain?.use_count ?? 0) + 1,
        last_used_at: now
      }).eq('id', id).eq('user_id', user.id);
    }
  };

  return { chains, isLoaded, addChain, updateChain, deleteChain, incrementChainUseCount };
}
