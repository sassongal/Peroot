'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type PlanTier = 'guest' | 'free' | 'pro' | 'admin';

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

    supabase.auth.getUser().then(async ({ data }) => {
      let tier: PlanTier = data.user ? 'free' : 'guest';
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', data.user.id)
          .maybeSingle();
        const pt = profile?.plan_tier;
        if (pt === 'admin') tier = 'admin';
        else if (pt === 'pro') tier = 'pro';
      }
      setState((prev) => ({
        ...prev,
        user: data.user,
        isLoading: false,
        planTier: tier,
      }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      let tier: PlanTier = user ? 'free' : 'guest';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', user.id)
          .maybeSingle();
        const pt = profile?.plan_tier;
        if (pt === 'admin') tier = 'admin';
        else if (pt === 'pro') tier = 'pro';
      }
      setState((prev) => ({
        ...prev,
        user,
        planTier: tier,
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
