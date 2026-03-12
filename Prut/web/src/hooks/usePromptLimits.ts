import { useState, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useSiteSettings } from './useSiteSettings';
import { logger } from "@/lib/logger";

interface PromptUsage {
  count: number;
  lastReset: string;
}

const USAGE_STORAGE_KEY = 'peroot_guest_usage';

export function usePromptLimits() {
  const { settings } = useSiteSettings();
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usage, setUsage] = useState<PromptUsage>({ count: 0, lastReset: new Date().toISOString() });
  const [canUsePrompt, setCanUsePrompt] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings, usage, isAdmin]);

  async function checkUser() {
    const { data: { user: activeUser } } = await supabase.auth.getUser();
    setUser(activeUser);

    if (activeUser) {
      // Load credits from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance')
        .eq('id', activeUser.id)
        .maybeSingle();

      if (profile) {
        setCredits(profile.credits_balance);
      }

      // Check admin role (both user_roles table and app_metadata, matching server)
      const hasAdminMetadata = activeUser.app_metadata?.role === 'admin';
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', activeUser.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (roleData || hasAdminMetadata) setIsAdmin(true);
    } else {
      // Load guest usage from localStorage
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: PromptUsage = JSON.parse(stored);

          // Check if lastReset is before the most recent 14:00 Israel time reset point
          const nowIsrael = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
          const resetToday = new Date(nowIsrael);
          resetToday.setHours(14, 0, 0, 0);
          const resetPoint = nowIsrael >= resetToday
            ? resetToday
            : new Date(resetToday.getTime() - 24 * 60 * 60 * 1000);

          if (new Date(parsed.lastReset) < resetPoint) {
            const freshUsage: PromptUsage = { count: 0, lastReset: new Date().toISOString() };
            localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(freshUsage));
            setUsage(freshUsage);
          } else {
            setUsage(parsed);
          }
        } catch (e) {
          logger.error('Failed to parse usage:', e);
        }
      }
    }
  }

  function updateLimits() {
    if (user) {
      // Admin bypass - admins can always use prompts
      if (isAdmin) {
        setCanUsePrompt(true);
        return;
      }
      // Authenticated users - check actual DB credits
      // If credits is null (loading), we allow (will be caught by server anyway)
      // but once loaded, we hard-lock.
      if (credits !== null) {
        setCanUsePrompt(credits > 0);
      } else {
        setCanUsePrompt(true);
      }
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
      return credits ?? 0;
    }
    return Math.max(0, settings.max_free_prompts - usage.count);
  }

  function getRequiredAction(): 'login' | 'upgrade' | null {
    if (user) {
        if (isAdmin) return null;
        return (credits !== null && credits < 1) ? 'upgrade' : null;
    }
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
    isAdmin,
    guestAccessAllowed: settings.allow_guest_access,
    maxFreePrompts: settings.max_free_prompts,
    settings // Expose settings for debugging
  };
}
