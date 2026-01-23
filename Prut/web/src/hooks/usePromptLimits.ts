/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSiteSettings } from './useSiteSettings';

interface PromptUsage {
  count: number;
  lastReset: string;
}

const USAGE_STORAGE_KEY = 'peroot_guest_usage';

export function usePromptLimits() {
  const { settings } = useSiteSettings();
  const [user, setUser] = useState<any>(null);
  const [usage, setUsage] = useState<PromptUsage>({ count: 0, lastReset: new Date().toISOString() });
  const [canUsePrompt, setCanUsePrompt] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings, usage]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) {
      // Load guest usage from localStorage
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUsage(parsed);
        } catch (e) {
          console.error('Failed to parse usage:', e);
        }
      }
    }
  }

  function updateLimits() {
    if (user) {
      // Authenticated users - check credits (implement later)
      setCanUsePrompt(true);
    } else {
      // Guest users - check free prompts limit
      if (!settings.allow_guest_access) {
        setCanUsePrompt(false);
        return;
      }

      setCanUsePrompt(usage.count < settings.max_free_prompts);
    }
  }

  function incrementUsage() {
    if (!user) {
      const newUsage = {
        count: usage.count + 1,
        lastReset: usage.lastReset
      };
      setUsage(newUsage);
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
    }
  }

  function getRemainingPrompts(): number {
    if (user) {
      return Infinity; // Or check actual credits from user profile
    }
    return Math.max(0, settings.max_free_prompts - usage.count);
  }

  function getRequiredAction(): 'login' | 'upgrade' | null {
    if (!user && !settings.allow_guest_access) {
      return 'login';
    }
    if (!user && usage.count >= settings.max_free_prompts) {
      return 'login';
    }
    return null;
  }

  function resetUsage() {
    const newUsage = {
      count: 0,
      lastReset: new Date().toISOString()
    };
    setUsage(newUsage);
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
  }

  return {
    canUsePrompt,
    remainingPrompts: getRemainingPrompts(),
    totalAllowed: settings.max_free_prompts,
    usedPrompts: usage.count,
    requiredAction: getRequiredAction(),
    incrementUsage,
    resetUsage,
    isGuest: !user,
    guestAccessAllowed: settings.allow_guest_access,
    maxFreePrompts: settings.max_free_prompts,
    settings // Expose settings for debugging
  };
}
