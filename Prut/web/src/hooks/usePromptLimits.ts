import { useState, useEffect, useMemo, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useSiteSettings } from "./useSiteSettings";
import { logger } from "@/lib/logger";

interface PromptUsage {
  count: number;
  lastReset: string;
}

const USAGE_STORAGE_KEY = "peroot_guest_usage";

/** Returns today's date string in Israel timezone (YYYY-MM-DD) */
function getIsraelDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}

interface PromptLimitsShape {
  remaining: number;
  total: number | null;
  tierLabel: string;
  isUnlimited: boolean;
  refreshAt: string | null;
}

interface QuotaResponse {
  plan_tier: "free" | "pro" | "admin";
  credits_balance: number;
  daily_limit: number;
  refresh_at: string | null;
  last_prompt_at: string | null;
}

export function usePromptLimits() {
  const { settings } = useSiteSettings();
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [usage, setUsage] = useState<PromptUsage>({ count: 0, lastReset: getIsraelDateString() });
  const [canUsePrompt, setCanUsePrompt] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/me/quota", { credentials: "include" });
      if (!res.ok) return null;
      return (await res.json()) as QuotaResponse;
    } catch (e) {
      logger.error("[usePromptLimits] quota fetch failed:", e);
      return null;
    }
  }, []);

  const checkUser = useCallback(async () => {
    const {
      data: { user: activeUser },
    } = await supabase.auth.getUser();
    setUser(activeUser);

    if (activeUser) {
      // Source of truth: /api/me/quota (applies rolling 24h reset)
      const q = await fetchQuota();
      if (q) {
        setQuota(q);
        setIsPro(q.plan_tier === "pro" || q.plan_tier === "admin");
        setIsAdmin(q.plan_tier === "admin");
      }

      // Secondary: user_roles admin check (app_metadata or explicit row)
      const hasAdminMetadata = activeUser.app_metadata?.role === "admin";
      if (hasAdminMetadata) {
        setIsAdmin(true);
      } else {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", activeUser.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleData) setIsAdmin(true);
      }
    } else {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: PromptUsage = JSON.parse(stored);

          const todayIsrael = getIsraelDateString();
          const storedDate =
            parsed.lastReset.length === 10
              ? parsed.lastReset
              : new Date(parsed.lastReset).toLocaleDateString("en-CA", {
                  timeZone: "Asia/Jerusalem",
                });

          if (storedDate !== todayIsrael) {
            const freshUsage: PromptUsage = { count: 0, lastReset: todayIsrael };
            localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(freshUsage));
            setUsage(freshUsage);
          } else {
            setUsage(parsed);
          }
        } catch (e) {
          logger.error("Failed to parse usage:", e);
        }
      }
    }
  }, [supabase, fetchQuota]);

  useEffect(() => {
    queueMicrotask(() => {
      void checkUser();
    });
  }, [checkUser]);

  const updateLimits = useCallback(() => {
    if (user) {
      if (isAdmin) {
        setCanUsePrompt(true);
        return;
      }
      if (quota) {
        setCanUsePrompt(quota.credits_balance > 0);
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
  }, [user, isAdmin, quota, settings.allow_guest_access, settings.max_free_prompts, usage.count]);

  useEffect(() => {
    queueMicrotask(() => updateLimits());
  }, [updateLimits]);

  function incrementUsage() {
    if (!user) {
      const newUsage = {
        count: usage.count + 1,
        lastReset: getIsraelDateString(),
      };
      setUsage(newUsage);
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
    } else {
      // Re-fetch quota after a spend so the UI reflects new balance + refresh_at
      void fetchQuota().then((q) => q && setQuota(q));
    }
  }

  function getRemainingPrompts(): number {
    if (user) return quota?.credits_balance ?? 0;
    return Math.max(0, settings.max_free_prompts - usage.count);
  }

  function getRequiredAction(): "login" | "upgrade" | null {
    if (user) {
      if (isAdmin) return null;
      return quota !== null && quota.credits_balance < 1 ? "upgrade" : null;
    }
    if (!user && !settings.allow_guest_access) return "login";
    if (!user && usage.count >= settings.max_free_prompts) return "login";
    return null;
  }

  function resetUsage() {
    const newUsage = { count: 0, lastReset: getIsraelDateString() };
    setUsage(newUsage);
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
  }

  function getCreditDisplayShape(): PromptLimitsShape {
    if (isAdmin) {
      return { remaining: 0, total: null, tierLabel: "מנהל", isUnlimited: true, refreshAt: null };
    }
    if (user && isPro) {
      return {
        remaining: quota?.credits_balance ?? 0,
        total: null,
        tierLabel: "Pro",
        isUnlimited: true,
        refreshAt: null,
      };
    }
    if (user) {
      return {
        remaining: quota?.credits_balance ?? 0,
        total: quota?.daily_limit ?? settings.daily_free_limit ?? 2,
        tierLabel: "חינמי",
        isUnlimited: false,
        refreshAt: quota?.refresh_at ?? null,
      };
    }
    return {
      remaining: Math.max(0, settings.max_free_prompts - usage.count),
      total: settings.max_free_prompts,
      tierLabel: "אורח",
      isUnlimited: false,
      refreshAt: null,
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
    refreshQuota: fetchQuota,
    isGuest: !user,
    isAdmin,
    isPro,
    guestAccessAllowed: settings.allow_guest_access,
    maxFreePrompts: settings.max_free_prompts,
    creditDisplay: getCreditDisplayShape(),
    settings,
  };
}
