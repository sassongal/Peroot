"use client";

import { useMemo, useState, useEffect } from 'react';
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



export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const supabase = useMemo(() => createClient(), []);

  // Initialize Auth & History
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!mounted) return;
      
      setUser(currentUser);

      if (currentUser) {
        // Fetch from DB
        const { data } = await supabase
          .from('history')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });
        
        if (data && mounted) {
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
        // Guests don't get history - just set empty and mark loaded
        setHistory([]);
      }
      if (mounted) setIsLoaded(true);
    }

    init();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (!mounted) return;

      const newUser = session?.user ?? null;
      
      // Only re-run init if the user ID actually changed to avoid cycles
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
  }, [supabase]);

  // No localStorage sync for guests - history is login-only

  const addToHistory = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    // Only save history for logged-in users
    if (!user) return;
    
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

    // Sync to DB
    await supabase.from('history').insert({
      user_id: user.id,
      prompt: item.original,
      enhanced_prompt: item.enhanced,
      category: item.category,
      tone: item.tone,
    });
  };

  const clearHistory = async () => {
    if (!user) return;
    setHistory([]);
    await supabase.from('history').delete().eq('user_id', user.id);
  };

  return { history, addToHistory, clearHistory, isLoaded, user };
}
