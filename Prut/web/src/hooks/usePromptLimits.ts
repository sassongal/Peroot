import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useSiteSettings } from './useSiteSettings';
import { logger } from "@/lib/logger";

interface PromptUsage {
  count: number;
  lastReset: string;
}

const USAGE_STORAGE_KEY = 'peroot_guest_usage';

/** Returns today's date string in Israel timezone (YYYY-MM-DD) */
function getIsraelDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

export interface PromptLimitsShape {
  remaining: number;
  total: number | null;
  tierLabel: string;
  isUnlimited: boolean;
}

export function usePromptLimits() {
  const { settings } = useSiteSettings();
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [usage, setUsage] = useState<PromptUsage>({ count: 0, lastReset: getIsraelDateString() });
  const [canUsePrompt, setCanUsePrompt] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const checkUser = useCallback(async () => {
    const { data: { user: activeUser } } = await supabase.auth.getUser();
    setUser(activeUser);

    if (activeUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance, plan_tier')
        .eq('id', activeUser.id)
        .maybeSingle();

      if (profile) {
        setCredits(profile.credits_balance);
        setIsPro(profile.plan_tier === 'pro' || profile.plan_tier === 'admin');
      }

      const hasAdminMetadata = activeUser.app_metadata?.role === 'admin';
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', activeUser.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (roleData || hasAdminMetadata) setIsAdmin(true);
    } else {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: PromptUsage = JSON.parse(stored);

          // FIX 4.2: Simple date comparison in Israel timezone
          const todayIsrael = getIsraelDateString();
          const storedDate = parsed.lastReset.length === 10
            ? parsed.lastReset
            : new Date(parsed.lastReset).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

          if (storedDate !== todayIsrael) {
            const freshUsage: PromptUsage = { count: 0, lastReset: todayIsrael };
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
  }, [supabase]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    updateLimits();
  }, [user, settings, usage, isAdmin, credits]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateLimits() {
    if (user) {
      if (isAdmin) {
        setCanUsePrompt(true);
        return;
      }
      if (credits !== null) {
        setCanUsePrompt(credits > 0);
      } else {
        setCanUsePrompt(true);
      }
    } else {
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
        lastReset: getIsraelDateString(),
      };
      setUsage(newUsage);
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
    }
  }

  function getRemainingPrompts(): number {
    if (user) return credits ?? 0;
    return Math.max(0, settings.max_free_prompts - usage.count);
  }

  function getRequiredAction(): 'login' | 'upgrade' | null {
    if (user) {
      if (isAdmin) return null;
      return (credits !== null && credits < 1) ? 'upgrade' : null;
    }
    if (!user && !settings.allow_guest_access) return 'login';
    if (!user && usage.count >= settings.max_free_prompts) return 'login';
    return null;
  }

  function resetUsage() {
    const newUsage = { count: 0, lastReset: getIsraelDateString() };
    setUsage(newUsage);
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
  }

  function getCreditDisplayShape(): PromptLimitsShape {
    if (isAdmin) {
      return { remaining: 0, total: null, tierLabel: 'מנהל', isUnlimited: true };
    }
    if (user && isPro) {
      return { remaining: credits ?? 0, total: null, tierLabel: 'Pro', isUnlimited: true };
    }
    if (user) {
      return { remaining: credits ?? 0, total: null, tierLabel: 'חינמי', isUnlimited: false };
    }
    return {
      remaining: Math.max(0, settings.max_free_prompts - usage.count),
      total: settings.max_free_prompts,
      tierLabel: 'אורח',
      isUnlimited: false,
    };
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
    isPro,
    guestAccessAllowed: settings.allow_guest_access,
    maxFreePrompts: settings.max_free_prompts,
    creditDisplay: getCreditDisplayShape(),
    settings,
  };
}
