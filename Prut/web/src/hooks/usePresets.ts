"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

export interface VariablePreset {
  id: string;
  name: string;
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
}

const PRESETS_STORAGE_KEY = 'peroot_variable_presets';

export function usePresets() {
  const [presets, setPresets] = useState<VariablePreset[]>([]);
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
          .from('variable_presets')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false });

        if (data && mounted) {
          setPresets(data.map(row => ({
            id: row.id,
            name: row.name,
            variables: row.variables || {},
            created_at: row.created_at,
            updated_at: row.updated_at,
          })));
        }
      } else {
        try {
          const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
          if (stored && mounted) setPresets(JSON.parse(stored));
        } catch (e) {
          logger.warn("Failed to parse presets", e);
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
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    }
  }, [presets, isLoaded, user]);

  const addPreset = async (name: string, variables: Record<string, string>) => {
    const newPreset: VariablePreset = {
      id: crypto.randomUUID(),
      name,
      variables,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setPresets(prev => [newPreset, ...prev]);

    if (user) {
      const { data, error } = await supabase.from('variable_presets').insert({
        user_id: user.id,
        name,
        variables,
      }).select().single();

      if (!error && data) {
        setPresets(prev => prev.map(p => p.id === newPreset.id ? { ...p, id: data.id } : p));
      }
    }
  };

  const updatePreset = async (id: string, updates: Partial<Pick<VariablePreset, 'name' | 'variables'>>) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
    if (user) {
      await supabase.from('variable_presets').update(updates).eq('id', id).eq('user_id', user.id);
    }
  };

  const deletePreset = async (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
    if (user) {
      await supabase.from('variable_presets').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  return { presets, isLoaded, addPreset, updatePreset, deletePreset };
}
