"use client";

import { usePromptLimits } from "@/hooks/usePromptLimits";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { LogIn, Sparkles, Crown, Coins } from "lucide-react";
import { useRouter } from "next/navigation";

interface PromptLimitIndicatorProps {
  /** Override credits balance (e.g. already fetched in parent). Pass undefined to let the hook supply it. */
  creditsBalance?: number | null;
}

export function PromptLimitIndicator({ creditsBalance }: PromptLimitIndicatorProps) {
  const {
    remainingPrompts,
    totalAllowed,
    isGuest,
    settings,
  } = usePromptLimits();

  const { isPro, loading: subLoading } = useSubscription();
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  // Derive tier: guest → free-registered → pro
  const tier = isGuest ? "guest" : isPro ? "pro" : "free";

  // Credits to display for free users: prefer explicit prop (kept in sync by parent), fall back to hook value
  const displayCredits = creditsBalance !== undefined ? (creditsBalance ?? 0) : remainingPrompts;

  // Don't render while subscription status is still loading to avoid a flash of the wrong badge
  if (!isGuest && subLoading) return null;

  // ----- Pro tier: minimal infinite badge -----
  if (tier === "pro") {
    return (
      <div className="fixed bottom-6 left-6 z-40 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/30 backdrop-blur-md shadow-lg">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300 tracking-wide">Pro ∞</span>
        </div>
      </div>
    );
  }

  // ----- Free registered user -----
  if (tier === "free") {
    const isLow = displayCredits <= 3;
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <div
          className={`glass-card rounded-2xl border p-4 cursor-pointer transition-all hover:bg-black/60 shadow-xl ${
            isLow ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-black/40"
          }`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLow ? "bg-red-500/20" : "bg-amber-500/20"}`}>
              <Coins className={`w-5 h-5 ${isLow ? "text-red-400" : "text-amber-400"}`} />
            </div>

            <div>
              <div className="text-sm font-medium text-white flex items-center gap-2">
                {displayCredits}{" "}
                <span className="text-slate-400 font-normal">קרדיטים נותרו</span>
              </div>
              <div className="text-xs text-slate-400">חשבון חינמי</div>
            </div>
          </div>

          {showDetails && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <a
                href="/pricing"
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm transition-colors text-white font-medium shadow-lg shadow-amber-900/20"
              >
                <Crown className="w-4 h-4" />
                שדרג ל-Pro ללא הגבלה
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- Guest user -----
  const percentage = totalAllowed > 0 ? (remainingPrompts / totalAllowed) * 100 : 0;
  const isLow = remainingPrompts <= 1;

  const handleLogin = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push("/login");
  };

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <div
        className={`glass-card rounded-2xl border p-4 cursor-pointer transition-all hover:bg-black/60 shadow-xl ${
          isLow ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-black/40"
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLow ? "bg-red-500/20" : "bg-blue-500/20"}`}>
            <Sparkles className={`w-5 h-5 ${isLow ? "text-red-400" : "text-blue-400"}`} />
          </div>

          <div>
            <div className="text-sm font-medium text-white flex items-center gap-2">
              {remainingPrompts}/{totalAllowed}{" "}
              <span className="text-slate-400 font-normal">פרומפטים נותרו היום</span>
            </div>
            <div className="text-xs text-slate-400">
              {settings.allow_guest_access ? "מתחדש מדי יום" : "נדרשת הרשמה"}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isLow ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-xs text-slate-400">
              התחבר לקבל קרדיטים נוספים וגישה מלאה
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors text-white font-medium shadow-lg shadow-blue-900/20"
            >
              <LogIn className="w-4 h-4" />
              התחבר / הרשמה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
