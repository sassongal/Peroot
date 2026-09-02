/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { BookOpen, Check, Crown, History, Loader2, Mail, Star, Zap } from "lucide-react";
import type { CreditsState } from "./settings-types";

interface SettingsProfileSectionProps {
  user: User;
  avatarUrl: string | undefined;
  /** When OAuth avatar URL fails to load (403, expired Google URL, etc.) */
  avatarFallbackUrl?: string;
  displayName: string;
  setDisplayName: (v: string) => void;
  onSaveDisplayName: () => void;
  isSavingName: boolean;
  historyLength: number;
  personalLibraryLength: number;
  favoritesLength: number;
  credits: CreditsState | null;
  isPro: boolean;
}

export function SettingsProfileSection({
  user,
  avatarUrl,
  avatarFallbackUrl,
  displayName,
  setDisplayName,
  onSaveDisplayName,
  isSavingName,
  historyLength,
  personalLibraryLength,
  favoritesLength,
  credits,
  isPro,
}: SettingsProfileSectionProps) {
  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-profile-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-profile-heading" className="text-xl font-bold">
          פרופיל
        </h2>
        <p className="text-sm text-(--text-muted)">פרטי החשבון שלך</p>
      </header>

      <div className="flex items-center gap-4 p-4 bg-(--glass-bg) rounded-xl border border-(--glass-border)">
        <div className="w-16 h-16 rounded-full bg-linear-to-br from-amber-500 to-yellow-600 overflow-hidden border-2 border-(--glass-border)">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="תמונת פרופיל"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.fallback && avatarFallbackUrl) {
                  img.dataset.fallback = "1";
                  img.src = avatarFallbackUrl;
                } else {
                  img.onerror = null;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-(--text-primary)">
              {user.email?.[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={onSaveDisplayName}
              dir="rtl"
              placeholder="שם תצוגה"
              className="bg-(--glass-bg) border border-(--glass-border) focus:border-indigo-500/60 rounded-lg px-3 py-2.5 text-(--text-primary) font-bold text-base w-full focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={onSaveDisplayName}
              disabled={isSavingName || !displayName.trim()}
              className="cursor-pointer shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingName ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>שמור</span>
            </button>
          </div>
          {user.app_metadata?.provider === "google" && (
            <p className="text-sm text-(--text-muted) mt-1">תמונת פרופיל מחשבון Google</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-(--text-muted) flex items-center gap-2">
          <Mail className="w-4 h-4" />
          כתובת אימייל
        </p>
        <div className="flex items-center gap-3 p-4 bg-(--glass-bg) rounded-xl border border-(--glass-border)">
          <span className="text-(--text-primary)">{user.email}</span>
          {user.email_confirmed_at ? (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
              מאומת
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
              לא מאומת
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-3 sm:p-4 bg-(--glass-bg) rounded-xl border border-(--glass-border) text-center">
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mx-auto mb-1.5 sm:mb-2" />
          <p className="text-xl sm:text-2xl font-bold">{historyLength}</p>
          <p className="text-[10px] sm:text-xs text-(--text-muted)">היסטוריה</p>
        </div>
        <div className="p-3 sm:p-4 bg-(--glass-bg) rounded-xl border border-(--glass-border) text-center">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mx-auto mb-1.5 sm:mb-2" />
          <p className="text-xl sm:text-2xl font-bold">{personalLibraryLength}</p>
          <p className="text-[10px] sm:text-xs text-(--text-muted)">ספרייה</p>
        </div>
        <div className="p-3 sm:p-4 bg-(--glass-bg) rounded-xl border border-(--glass-border) text-center">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mx-auto mb-1.5 sm:mb-2" />
          <p className="text-xl sm:text-2xl font-bold">{favoritesLength}</p>
          <p className="text-[10px] sm:text-xs text-(--text-muted)">מועדפים</p>
        </div>
      </div>

      {credits && !isPro && (
        <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              מצב קרדיטים
            </h3>
            <span className="text-xs text-(--text-muted)">
              {credits.balance} / {credits.dailyLimit} נותרו היום
            </span>
          </div>
          <div className="space-y-2">
            <div
              className="w-full h-3 bg-(--glass-bg) rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={credits.dailyLimit - credits.balance}
              aria-valuemin={0}
              aria-valuemax={credits.dailyLimit}
              aria-label={`ניצלת ${credits.dailyLimit - credits.balance} מתוך ${credits.dailyLimit} קרדיטים`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, credits.dailyLimit > 0 ? ((credits.dailyLimit - credits.balance) / credits.dailyLimit) * 100 : 0)}%`,
                  background:
                    credits.balance === 0
                      ? "linear-gradient(90deg, #ef4444, #dc2626)"
                      : credits.balance <= 1
                        ? "linear-gradient(90deg, #f59e0b, #d97706)"
                        : "linear-gradient(90deg, #22c55e, #16a34a)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-(--text-muted)">
              <span>
                ניצולת:{" "}
                {credits.dailyLimit > 0
                  ? Math.round(((credits.dailyLimit - credits.balance) / credits.dailyLimit) * 100)
                  : 0}
                %
              </span>
              <span>
                {credits.balance === 0
                  ? "נגמרו הקרדיטים להיום"
                  : `${credits.balance} שימושים נותרו`}
              </span>
            </div>
          </div>
          {credits.balance === 0 && (
            <div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-300">הקרדיטים מתחדשים מדי יום. רוצה ללא הגבלה?</p>
              <Link
                href="/pricing"
                className="shrink-0 px-3 py-1.5 rounded-lg accent-gradient text-black text-xs font-bold"
              >
                שדרג ל-Pro
              </Link>
            </div>
          )}
        </div>
      )}

      {credits && isPro && (
        <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-amber-300">מצב קרדיטים</h3>
          </div>
          <p className="text-sm text-(--text-secondary)">
            שימוש ללא הגבלה - אין מגבלת קרדיטים במנוי Pro
          </p>
        </div>
      )}

      <div className="text-sm text-(--text-muted) pt-4 border-t border-(--glass-border)">
        חשבון נוצר בתאריך:{" "}
        {new Date(user.created_at).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </section>
  );
}
