'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type PlanTier = 'guest' | 'free' | 'pro';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  planTier: PlanTier;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    planTier: 'guest',
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setState((prev) => ({
        ...prev,
        user: data.user,
        isLoading: false,
        planTier: data.user ? 'free' : 'guest',
      }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState((prev) => ({
        ...prev,
        user,
        planTier: user ? 'free' : 'guest',
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setState({ user: null, isLoading: false, planTier: 'guest' });
  }, []);

  return { ...state, signOut };
}
