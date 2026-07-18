import { useState, useEffect, useMemo, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useSiteSettings } from "./useSiteSettings";
import { fetchMeQuota } from "@/lib/quota-client";
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
  // Authoritative guest balance from the server (Redis), so the UI matches
  // enforcement instead of trusting localStorage alone.
  const [guestQuota, setGuestQuota] = useState<{
    remaining: number;
    dailyLimit: number;
    refreshAt: string | null;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [usage, setUsage] = useState<PromptUsage>({ count: 0, lastReset: getIsraelDateString() });
  const [canUsePrompt, setCanUsePrompt] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Deduped + short-cached across all hook instances (see quota-client).
  const fetchQuota = useCallback(
    (force = false) => fetchMeQuota(force) as Promise<QuotaResponse | null>,
    [],
  );

  const checkUser = useCallback(async () => {
    const {
      data: { user: activeUser },
    } = await supabase.auth.getUser();
    setUser(activeUser);

    if (activeUser) {
      // Source of truth: /api/me/quota — server-side, checks both plan_tier
      // and user_roles as defense-in-depth, applies rolling 24h reset.
      const q = await fetchQuota();
      if (q) {
        setQuota(q);
        setIsPro(
          q.plan_tier === "pro" || q.plan_tier === "admin" || (q.plan_tier as string) === "premium",
        );
        setIsAdmin(q.plan_tier === "admin");
      }
    } else {
      // Guests: read the authoritative server balance (Redis by cookie/IP) so
      // the UI can't promise prompts the server will refuse. localStorage stays
      // as an optimistic fallback if the endpoint is unreachable.
      try {
        const res = await fetch("/api/guest/quota", { credentials: "include" });
        if (res.ok) {
          const gq = (await res.json()) as {
            credits_balance: number;
            daily_limit: number;
            refresh_at: string | null;
          };
          setGuestQuota({
            remaining: gq.credits_balance,
            dailyLimit: gq.daily_limit,
            refreshAt: gq.refresh_at,
          });
        }
      } catch (e) {
        logger.error("[usePromptLimits] guest quota fetch failed:", e);
      }

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
      if (isAdmin || isPro) {
        // Pro/admin: always allow — server handles monthly refresh at spend time
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
      // Prefer the server balance; fall back to localStorage count.
      setCanUsePrompt(
        guestQuota ? guestQuota.remaining > 0 : usage.count < settings.max_free_prompts,
      );
    }
  }, [
    user,
    isAdmin,
    isPro,
    quota,
    guestQuota,
    settings.allow_guest_access,
    settings.max_free_prompts,
    usage.count,
  ]);

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
      // UI-only tracking — not a security boundary. Real enforcement is
      // Redis-backed server-side in enhance/route.ts (guest credit system).
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
      // Reconcile against the authoritative server balance after the spend.
      void fetch("/api/guest/quota", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (gq) =>
            gq &&
            setGuestQuota({
              remaining: gq.credits_balance,
              dailyLimit: gq.daily_limit,
              refreshAt: gq.refresh_at,
            }),
        )
        .catch(() => {});
    } else {
      // Re-fetch quota after a spend so the UI reflects new balance + refresh_at
      void fetchQuota(true).then((q) => q && setQuota(q));
    }
  }

  function getRemainingPrompts(): number {
    if (user) return quota?.credits_balance ?? 0;
    if (guestQuota) return Math.max(0, guestQuota.remaining);
    return Math.max(0, settings.max_free_prompts - usage.count);
  }

  function getRequiredAction(): "login" | "upgrade" | null {
    if (user) {
      if (isAdmin || isPro) return null;
      return quota !== null && quota.credits_balance < 1 ? "upgrade" : null;
    }
    if (!user && !settings.allow_guest_access) return "login";
    if (!user && guestQuota) return guestQuota.remaining < 1 ? "login" : null;
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
      remaining: guestQuota
        ? Math.max(0, guestQuota.remaining)
        : Math.max(0, settings.max_free_prompts - usage.count),
      total: guestQuota?.dailyLimit ?? settings.max_free_prompts,
      tierLabel: "אורח",
      isUnlimited: false,
      refreshAt: guestQuota?.refreshAt ?? null,
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
