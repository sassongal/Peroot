"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export interface HistoryItem {
  id: string; // UUID
  original: string;
  enhanced: string;
  tone: string;
  category: string;
  timestamp: number;
}

const STORAGE_KEY = 'peroot_history';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const supabase = createClient();

  // Initialize Auth & History
  useEffect(() => {
    async function init() {
      // 1. Check User
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 2. Fetch from DB
        const { data, error } = await supabase
          .from('history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          const formatted: HistoryItem[] = data.map(row => ({
            id: row.id,
            original: row.prompt,
            enhanced: row.enhanced_prompt,
            tone: row.tone,
            category: row.category,
            timestamp: new Date(row.created_at).getTime(),
          }));
          setHistory(formatted);
        }
      } else {
        // 3. Load from LocalStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setHistory(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse history", e);
          }
        }
      }
      setIsLoaded(true);
    }

    init();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        init(); // Refresh both user and history
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save to localStorage only if user is NOT logged in
  useEffect(() => {
    if (isLoaded && !user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history, isLoaded, user]);

  const addToHistory = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    // Optimistic Update
    setHistory((prev) => {
      if (prev[0]?.enhanced === newItem.enhanced) return prev;
      return [newItem, ...prev];
    });

    if (user) {
      // Sync to DB
      await supabase.from('history').insert({
        user_id: user.id,
        prompt: item.original,
        enhanced_prompt: item.enhanced,
        category: item.category,
        tone: item.tone,
      });
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    if (user) {
      await supabase.from('history').delete().eq('user_id', user.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return { history, addToHistory, clearHistory, isLoaded, user };
}
