"use client";

import { usePromptLimits } from "@/hooks/usePromptLimits";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Coins, Sparkles, Shield } from "lucide-react";
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
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 border border-blue-500/30 backdrop-blur-md">
        <Shield className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-blue-300 tracking-wide">Admin ∞</span>
      </div>
    );
  }

  // ----- Pro tier: unlimited badge -----
  if (!isGuest && isPro) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 border border-amber-500/30 backdrop-blur-md">
        <Crown className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">ללא הגבלה</span>
      </div>
    );
  }

  // ----- Free registered user -----
  if (!isGuest) {
    const isLow = displayCredits <= 3;
    return (
      <Link
        href="/pricing"
        className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border backdrop-blur-md transition-all hover:bg-black/60 ${
          isLow ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-black/40"
        }`}
      >
        <Coins className={`w-4 h-4 ${isLow ? "text-red-400" : "text-amber-400"}`} />
        <span className="text-xs font-medium text-white">
          {displayCredits} <span className="text-slate-400 font-normal hidden md:inline">קרדיטים</span>
        </span>
      </Link>
    );
  }

  // ----- Guest user -----
  return (
    <Link
      href="/login"
      className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border backdrop-blur-md transition-all hover:bg-black/60 ${
        remainingPrompts <= 1 ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-black/40"
      }`}
    >
      <Sparkles className={`w-4 h-4 ${remainingPrompts <= 1 ? "text-red-400" : "text-blue-400"}`} />
      <span className="text-xs font-medium text-white">
        {remainingPrompts}/{totalAllowed}
        <span className="text-slate-400 font-normal hidden md:inline"> {settings.allow_guest_access ? "פרומפטים היום" : "נדרשת הרשמה"}</span>
      </span>
    </Link>
  );
}
