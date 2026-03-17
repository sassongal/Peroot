"use client";

import { usePromptLimits } from "@/hooks/usePromptLimits";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Coins, Sparkles, Shield } from "lucide-react";
import { ProBadge } from "@/components/ui/ProBadge";
import Link from "next/link";

interface PromptLimitIndicatorProps {
  /** Override credits balance (e.g. already fetched in parent). Pass undefined to let the hook supply it. */
  creditsBalance?: number | null;
}

export function PromptLimitIndicator({ creditsBalance }: PromptLimitIndicatorProps) {
  const {
    remainingPrompts,
    totalAllowed,
    isGuest,
    isAdmin,
    settings,
  } = usePromptLimits();

  const { isPro } = usePromptLimits();
  const { loading: subLoading } = useSubscription();

  // Credits to display: prefer explicit prop, fall back to hook value
  const displayCredits = creditsBalance !== undefined ? (creditsBalance ?? 0) : remainingPrompts;

  // Don't render while subscription status is still loading to avoid a flash of the wrong badge
  if (!isGuest && subLoading) return null;

  // ----- Admin: unlimited badge -----
  if (isAdmin) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/5 dark:bg-black/40 border border-blue-500/30 backdrop-blur-md">
        <Shield className="w-3 h-3 text-blue-400" />
        <span className="text-[10px] font-semibold text-blue-300 tracking-wide hidden sm:inline">Admin</span>
      </div>
    );
  }

  // ----- Pro tier: credits + Pro badge -----
  if (!isGuest && isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 dark:bg-black/40 border border-amber-500/30 backdrop-blur-md">
        <ProBadge size="sm" />
        <Crown className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{displayCredits} קרדיטים</span>
      </div>
    );
  }

  // ----- Free registered user: credits + upgrade link -----
  if (!isGuest) {
    const isLow = displayCredits <= 3;
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/pricing"
          className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border backdrop-blur-md transition-all hover:bg-black/10 dark:hover:bg-black/60 ${
            isLow ? "border-red-500/50 bg-red-500/10" : "border-[var(--glass-border)] bg-[var(--glass-bg)]"
          }`}
        >
          <Coins className={`w-4 h-4 ${isLow ? "text-red-400" : "text-amber-400"}`} />
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {displayCredits} <span className="text-[var(--text-muted)] font-normal hidden md:inline">קרדיטים</span>
          </span>
        </Link>
        <Link
          href="/pricing"
          className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
        >
          שדרג
        </Link>
      </div>
    );
  }

  // ----- Guest user -----
  return (
    <Link
      href="/login"
      className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border backdrop-blur-md transition-all hover:bg-black/10 dark:hover:bg-black/60 ${
        remainingPrompts <= 1 ? "border-red-500/50 bg-red-500/10" : "border-[var(--glass-border)] bg-[var(--glass-bg)]"
      }`}
    >
      <Sparkles className={`w-4 h-4 ${remainingPrompts <= 1 ? "text-red-400" : "text-blue-400"}`} />
      <span className="text-xs font-medium text-[var(--text-primary)]">
        {remainingPrompts}/{totalAllowed}
        <span className="text-[var(--text-muted)] font-normal hidden md:inline"> {settings.allow_guest_access ? "פרומפטים היום" : "נדרשת הרשמה"}</span>
      </span>
    </Link>
  );
}
